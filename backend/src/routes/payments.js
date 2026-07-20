const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');
const {
  getPaymentEnv,
  allowMockPayments,
  getRazorpayClient,
  isPlaceholder,
} = require('../config/payments');
const { safeEqual } = require('../utils/crypto');
const { PAID_ORDER_STATUS, canRestoreStock } = require('../services/orderState');
const { restoreOrderStock } = require('../services/inventory');

const MOCK_SIGNATURE = 'mock_valid_signature_veloce_2026';

function buildMockRazorpayOrder(orderAmountInPaise, orderId) {
  return {
    id: `rzp_order_mock_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
    amount: orderAmountInPaise,
    currency: 'INR',
    notes: { orderId: String(orderId) },
  };
}

/**
 * Mark payment + order as paid inside a transaction (idempotent if already paid).
 */
async function markPaymentPaid(tx, payment, { razorpayPaymentId, razorpayOrderId }) {
  const current = await tx.payment.findUnique({ where: { id: payment.id } });
  if (!current || current.status === 'paid') {
    return { alreadyPaid: true, payment: current };
  }

  const pay = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: 'paid',
      razorpayPaymentId: razorpayPaymentId || current.razorpayPaymentId,
      razorpayOrderId: razorpayOrderId || current.razorpayOrderId,
      transactionId: razorpayOrderId || current.transactionId || current.razorpayOrderId,
    },
  });

  await tx.order.update({
    where: { id: payment.orderId },
    data: {
      orderStatus: PAID_ORDER_STATUS,
      paymentStatus: 'paid',
      expiresAt: null,
    },
  });

  return { alreadyPaid: false, payment: pay };
}

async function findPaymentByRazorpayOrderId(razorpayOrderId) {
  return prisma.payment.findFirst({
    where: {
      OR: [
        { razorpayOrderId },
        { transactionId: razorpayOrderId },
      ],
    },
    include: { order: { include: { items: true } } },
  });
}

async function claimWebhookEvent(eventKey, eventType) {
  try {
    await prisma.processedWebhookEvent.create({
      data: { eventKey, eventType },
    });
    return true;
  } catch (err) {
    // Unique constraint → already processed
    if (err.code === 'P2002') return false;
    throw err;
  }
}

// @desc    Create a Razorpay Order for checkout
// @route   POST /api/payments/create-order
// @access  Private
router.post('/create-order', protect, async (req, res) => {
  const { orderId } = req.body;
  const oId = parseInt(orderId, 10);

  if (Number.isNaN(oId)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: oId },
      include: { payments: true, user: true },
    });

    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This order is already paid' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cannot pay for a cancelled order' });
    }

    const orderAmountInPaise = Math.round(parseFloat(order.total.toString()) * 100);
    const razorpay = getRazorpayClient();
    const { keyId } = getPaymentEnv();

    let rzpOrder;
    if (razorpay) {
      try {
        rzpOrder = await razorpay.orders.create({
          amount: orderAmountInPaise,
          currency: 'INR',
          receipt: `receipt_order_${order.id}`,
          notes: {
            orderId: order.id.toString(),
            orderNumber: order.orderNumber,
          },
        });
      } catch (rzpErr) {
        console.error('Razorpay order creation failed:', rzpErr.message);
        if (!allowMockPayments()) {
          return res.status(502).json({
            message: 'Payment provider unavailable. Please try again later.',
          });
        }
        rzpOrder = buildMockRazorpayOrder(orderAmountInPaise, order.id);
      }
    } else if (allowMockPayments()) {
      rzpOrder = buildMockRazorpayOrder(orderAmountInPaise, order.id);
    } else {
      return res.status(503).json({
        message: 'Payment provider is not configured. Contact support.',
      });
    }

    await prisma.payment.updateMany({
      where: { orderId: oId },
      data: {
        razorpayOrderId: rzpOrder.id,
        transactionId: rzpOrder.id,
      },
    });

    res.status(201).json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency || 'INR',
      keyId: allowMockPayments() && isPlaceholder(keyId) ? 'rzp_test_mock' : keyId,
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ message: 'Server error generating Razorpay checkout order' });
  }
});

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing Razorpay parameters for validation' });
  }

  try {
    const payment = await findPaymentByRazorpayOrderId(razorpay_order_id);

    if (!payment || payment.order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Transaction order record not found' });
    }

    if (payment.status === 'paid') {
      return res.json({ message: 'Payment already completed', payment });
    }

    let isValid = false;
    const isMockOrder = razorpay_order_id.startsWith('rzp_order_mock_');

    if (isMockOrder) {
      if (!allowMockPayments()) {
        return res.status(400).json({ message: 'Mock payments are not allowed in this environment' });
      }
      isValid = safeEqual(razorpay_signature, MOCK_SIGNATURE);
    } else {
      const { keySecret } = getPaymentEnv();
      if (isPlaceholder(keySecret)) {
        return res.status(503).json({ message: 'Payment verification is not configured' });
      }
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generated = crypto.createHmac('sha256', keySecret).update(text).digest('hex');
      isValid = safeEqual(generated, razorpay_signature);
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Payment verification failed: signature mismatch' });
    }

    const result = await prisma.$transaction(async (tx) =>
      markPaymentPaid(tx, payment, {
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
      })
    );

    res.json({
      message: result.alreadyPaid ? 'Payment already completed' : 'Payment successfully verified',
      payment: result.payment,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error validating payment' });
  }
});

// @desc    Process Razorpay Webhooks
// @route   POST /api/payments/webhook
// @access  Public — fails closed without valid signature
router.post('/webhook', async (req, res) => {
  const rzpSignature = req.headers['x-razorpay-signature'];
  const { webhookSecret } = getPaymentEnv();

  // Fail closed: secret, signature, and raw body are required
  if (!webhookSecret || isPlaceholder(webhookSecret)) {
    return res.status(400).json({ message: 'Webhook secret is not configured' });
  }
  if (!rzpSignature) {
    return res.status(400).json({ message: 'Missing x-razorpay-signature header' });
  }
  if (!req.rawBody) {
    return res.status(400).json({ message: 'Missing raw request body for signature verification' });
  }

  const digest = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.rawBody)
    .digest('hex');

  if (!safeEqual(digest, rzpSignature)) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  const event = req.body?.event;
  if (!event) {
    return res.status(400).json({ message: 'Missing webhook event type' });
  }

  // Build a stable idempotency key from event + entity ids
  const paymentEntity = req.body.payload?.payment?.entity;
  const orderEntity = req.body.payload?.order?.entity;
  const refundEntity = req.body.payload?.refund?.entity;
  const entityId =
    paymentEntity?.id ||
    orderEntity?.id ||
    refundEntity?.id ||
    paymentEntity?.order_id ||
    'unknown';
  const eventKey = `${event}:${entityId}:${req.body.created_at || ''}`;

  try {
    const claimed = await claimWebhookEvent(eventKey, event);
    if (!claimed) {
      return res.status(200).json({ message: 'Duplicate event bypassed' });
    }

    if (event === 'order.paid' || event === 'payment.captured') {
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id || null;

      if (!razorpayOrderId) {
        return res.status(400).json({ message: 'Razorpay Order ID not found in payload' });
      }

      const payment = await findPaymentByRazorpayOrderId(razorpayOrderId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment record not found for webhook mapping' });
      }

      if (payment.status === 'paid') {
        return res.status(200).json({ message: 'Duplicate event bypassed' });
      }

      await prisma.$transaction(async (tx) =>
        markPaymentPaid(tx, payment, {
          razorpayPaymentId,
          razorpayOrderId,
        })
      );
    }

    if (event === 'payment.failed') {
      const razorpayOrderId = paymentEntity?.order_id;
      if (razorpayOrderId) {
        const payment = await findPaymentByRazorpayOrderId(razorpayOrderId);
        if (payment && payment.status !== 'paid' && canRestoreStock(payment.order)) {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'failed' },
            });

            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                orderStatus: 'cancelled',
                paymentStatus: 'failed',
              },
            });

            await restoreOrderStock(tx, payment.order, 'failed_payment_rollback', 'razorpay_webhook');
          });
        }
      }
    }

    if (event === 'refund.processed') {
      const razorpayPaymentId = refundEntity?.payment_id;
      const razorpayRefundId = refundEntity?.id;

      if (!razorpayPaymentId) {
        return res.status(200).json({ message: 'Razorpay webhook sync complete' });
      }

      // Prefer payment id field; fall back to legacy transactionId misuse
      let dbPayment = await prisma.payment.findFirst({
        where: {
          OR: [
            { razorpayPaymentId },
            { transactionId: razorpayPaymentId },
          ],
        },
        include: { order: { include: { items: true } }, refunds: true },
      });

      if (dbPayment) {
        // Skip if this refund id was already stored
        if (razorpayRefundId) {
          const existing = await prisma.refund.findFirst({
            where: { razorpayRefundId },
          });
          if (existing) {
            return res.status(200).json({ message: 'Duplicate event bypassed' });
          }
        }

        const refundAmount = parseFloat(refundEntity.amount) / 100;

        await prisma.$transaction(async (tx) => {
          await tx.refund.create({
            data: {
              paymentId: dbPayment.id,
              orderId: dbPayment.orderId,
              amount: refundAmount,
              reason: 'Razorpay webhook processed',
              status: 'completed',
              razorpayRefundId: razorpayRefundId || null,
            },
          });

          const totalRefundedAgg = await tx.refund.aggregate({
            where: { paymentId: dbPayment.id, status: 'completed' },
            _sum: { amount: true },
          });
          const totalRefunded = parseFloat(totalRefundedAgg._sum.amount?.toString() || '0');
          const paidTotal = parseFloat(dbPayment.amount.toString());
          const fullyRefunded = totalRefunded >= paidTotal - 0.001;

          await tx.payment.update({
            where: { id: dbPayment.id },
            data: { status: fullyRefunded ? 'refunded' : 'partially_refunded' },
          });

          const orderUpdate = {
            paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded',
            refundStatus: fullyRefunded ? 'completed' : 'pending',
          };

          // Restore stock only once on full refund
          if (fullyRefunded && canRestoreStock(dbPayment.order)) {
            orderUpdate.orderStatus = 'cancelled';
            await restoreOrderStock(tx, dbPayment.order, 'refund', 'razorpay_webhook');
          }

          await tx.order.update({
            where: { id: dbPayment.orderId },
            data: orderUpdate,
          });
        });
      }
    }

    res.status(200).json({ message: 'Razorpay webhook sync complete' });
  } catch (error) {
    console.error('Razorpay webhook sync error:', error);
    res.status(500).json({ message: 'Database error in webhook transaction' });
  }
});

// @desc    Process refund on payment using Razorpay Refund API (Admin only)
// @route   POST /api/payments/:id/refund
// @access  Private/Admin
router.post('/:id/refund', protect, isAdmin, async (req, res) => {
  const paymentId = parseInt(req.params.id, 10);
  const { amount, reason = 'Admin refund trigger' } = req.body;
  const refundAmount = parseFloat(amount);

  if (Number.isNaN(paymentId) || Number.isNaN(refundAmount) || refundAmount <= 0) {
    return res.status(400).json({ message: 'Please provide valid payment ID and refund amount' });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: { include: { items: true } },
        refunds: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      return res.status(400).json({ message: 'Can only refund paid transactions' });
    }

    const paidTotal = parseFloat(payment.amount.toString());
    const alreadyRefunded = (payment.refunds || [])
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);
    const remainingRefundable = paidTotal - alreadyRefunded;

    if (refundAmount > remainingRefundable + 0.001) {
      return res.status(400).json({
        message: `Refund amount exceeds remaining refundable amount of ${remainingRefundable.toFixed(2)}`,
      });
    }

    // Must use captured payment ID, never the Razorpay order ID
    const capturedPaymentId = payment.razorpayPaymentId;
    let rzpRefundId = null;
    const isMock =
      (payment.razorpayOrderId && payment.razorpayOrderId.startsWith('rzp_order_mock_')) ||
      (payment.transactionId && payment.transactionId.startsWith('rzp_order_mock_'));

    if (isMock && allowMockPayments()) {
      rzpRefundId = `re_rzp_mock_${Math.random().toString(36).substring(2, 9)}`;
    } else {
      if (!capturedPaymentId) {
        return res.status(400).json({
          message: 'Cannot refund: captured Razorpay payment ID is missing on this payment record',
        });
      }

      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return res.status(503).json({ message: 'Payment provider is not configured' });
      }

      try {
        const refundObj = await razorpay.payments.refund(capturedPaymentId, {
          amount: Math.round(refundAmount * 100),
          notes: { reason },
        });
        rzpRefundId = refundObj.id;
      } catch (rzpErr) {
        console.error('Razorpay refund API failed:', rzpErr.message);
        return res.status(502).json({
          message: 'Razorpay refund failed',
          detail: rzpErr.message,
        });
      }
    }

    const dbRefund = await prisma.$transaction(async (tx) => {
      const ref = await tx.refund.create({
        data: {
          paymentId,
          orderId: payment.orderId,
          amount: refundAmount,
          reason,
          status: 'completed',
          razorpayRefundId: rzpRefundId,
        },
      });

      const totalRefundedAgg = await tx.refund.aggregate({
        where: { paymentId, status: 'completed' },
        _sum: { amount: true },
      });
      const totalRefundedSum = parseFloat(totalRefundedAgg._sum.amount?.toString() || '0');
      const fullyRefunded = totalRefundedSum >= paidTotal - 0.001;

      const updatedPayStatus = fullyRefunded ? 'refunded' : 'partially_refunded';

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: updatedPayStatus },
      });

      const orderData = {
        paymentStatus: updatedPayStatus,
        refundStatus: fullyRefunded ? 'completed' : 'pending',
      };

      // Restore stock only once on full refund
      if (fullyRefunded && canRestoreStock(payment.order)) {
        orderData.orderStatus = 'cancelled';
        await restoreOrderStock(tx, payment.order, 'refund', `admin_${req.user.id}`);
      } else if (fullyRefunded) {
        orderData.orderStatus = 'cancelled';
      }

      await tx.order.update({
        where: { id: payment.orderId },
        data: orderData,
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'refund_processed',
          description: `Processed Razorpay refund of Rs. ${refundAmount.toFixed(2)} (Refund ID: ${rzpRefundId}) on Order #${payment.orderId}`,
        },
      });

      return ref;
    });

    res.status(201).json({
      message: 'Refund successfully completed',
      refund: dbRefund,
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ message: 'Server error processing refund transaction' });
  }
});

// @desc    Expire abandoned unpaid orders and restore reserved stock
// @route   POST /api/payments/reconcile-expired
// @access  Private/Admin (also callable by ops cron)
router.post('/reconcile-expired', protect, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const expired = await prisma.order.findMany({
      where: {
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
        stockRestored: false,
        expiresAt: { lte: now },
      },
      include: { items: true, payments: true },
    });

    let released = 0;
    for (const order of expired) {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (!fresh || !canRestoreStock(fresh) || fresh.paymentStatus === 'paid') return;

        await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: 'cancelled',
            paymentStatus: 'failed',
          },
        });
        await tx.payment.updateMany({
          where: { orderId: order.id, status: 'pending' },
          data: { status: 'failed' },
        });
        await restoreOrderStock(tx, fresh, 'order_expired', 'system_reconcile');
      });
      released += 1;
    }

    res.json({ message: 'Reconciliation complete', released });
  } catch (error) {
    console.error('Reconcile expired orders error:', error);
    res.status(500).json({ message: 'Server error reconciling expired orders' });
  }
});

module.exports = router;
