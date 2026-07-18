const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');

// @desc    Create a payment transaction for an order
// @route   POST /api/payments/create
// @access  Private
router.post('/create', protect, async (req, res) => {
  const { orderId, paymentMethod = 'card' } = req.body;
  const oId = parseInt(orderId);

  if (isNaN(oId)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: oId },
      include: { payments: true },
    });

    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const alreadyPaid = order.payments.some((p) => p.status === 'paid');
    if (alreadyPaid) {
      return res.status(400).json({ message: 'This order is already paid' });
    }

    // Generate mock transaction ID
    const transactionId = `txn_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        orderId: oId,
        amount: order.total,
        method: paymentMethod,
        status: 'pending',
        transactionId,
      },
    });

    res.status(201).json({
      message: 'Payment transaction created',
      payment,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Server error creating payment' });
  }
});

// @desc    Verify payment transaction status (Client simulation)
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, async (req, res) => {
  const { transactionId, status } = req.body;

  if (!transactionId || !status) {
    return res.status(400).json({ message: 'Please provide transactionId and status (success/failure)' });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      include: { order: { include: { items: true } } },
    });

    if (!payment || payment.order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Transaction record not found' });
    }

    if (payment.status === 'paid') {
      return res.json({ message: 'Payment already completed', payment });
    }

    let paymentStatus = 'failed';
    let orderStatus = 'payment_pending';

    if (status === 'success') {
      paymentStatus = 'paid';
      orderStatus = 'confirmed';
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 1. Update payment status
      const updated = await tx.payment.update({
        where: { transactionId },
        data: { status: paymentStatus },
      });

      // 2. Update order status
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: orderStatus },
      });

      // 3. Rollback stock if payment failed
      if (status !== 'success') {
        for (const item of payment.order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
            // Log inventory change
            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                variantId: item.variantId,
                previousQuantity: 0, // Simplified placeholder, actual will query
                newQuantity: item.quantity,
                changeAmount: item.quantity,
                reason: 'failed_payment_rollback',
                orderId: payment.orderId,
                updatedBy: 'system',
              },
            });
          }
        }
      }

      return updated;
    });

    res.json({
      message: status === 'success' ? 'Payment verified successfully' : 'Payment marked failed',
      payment: updatedPayment,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error verifying payment' });
  }
});

// @desc    Asynchronous Payment Gateway Webhook
// @route   POST /api/payments/webhook
// @access  Public (Simulated validation)
router.post('/webhook', async (req, res) => {
  const { eventType, transactionId, amount } = req.body;

  if (!eventType || !transactionId) {
    return res.status(400).json({ message: 'Invalid webhook payload' });
  }

  console.log(`[Webhook received] Event: ${eventType}, Txn: ${transactionId}`);

  try {
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Protection: Duplicate webhook requests do not create duplicate updates
    if (payment.status === 'paid' && eventType === 'payment.succeeded') {
      return res.status(200).json({ message: 'Duplicate webhook event ignored: Payment already completed' });
    }

    let paymentStatus = 'failed';
    let orderStatus = 'payment_pending';

    if (eventType === 'payment.succeeded') {
      paymentStatus = 'paid';
      orderStatus = 'confirmed';
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { transactionId },
        data: { status: paymentStatus },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: orderStatus },
      });

      // Rollback stock if payment failed
      if (eventType !== 'payment.succeeded') {
        for (const item of payment.order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
    });

    res.status(200).json({ message: 'Webhook event processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Server error processing webhook' });
  }
});

// @desc    Process refund on transaction (Admin only)
// @route   POST /api/payments/:id/refund
// @access  Private/Admin
router.post('/:id/refund', protect, isAdmin, async (req, res) => {
  const paymentId = parseInt(req.params.id);
  const { amount, reason = 'Customer request' } = req.body;
  const refundAmount = parseFloat(amount);

  if (isNaN(paymentId) || isNaN(refundAmount) || refundAmount <= 0) {
    return res.status(400).json({ message: 'Please provide valid payment ID and refund amount' });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      return res.status(400).json({ message: 'Can only refund paid or partially refunded transactions' });
    }

    const paidAmount = parseFloat(payment.amount);
    if (refundAmount > paidAmount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed paid amount' });
    }

    // Execute refund transaction
    const refund = await prisma.$transaction(async (tx) => {
      // 1. Create Refund record
      const ref = await tx.refund.create({
        data: {
          paymentId,
          orderId: payment.orderId,
          amount: refundAmount,
          reason,
          status: 'completed',
        },
      });

      // 2. Calculate updated payment status
      const totalRefunded = await tx.refund.aggregate({
        where: { paymentId },
        _sum: { amount: true },
      });
      const sumRefunded = parseFloat(totalRefunded._sum.amount || 0);

      let newStatus = 'partially_refunded';
      if (sumRefunded >= paidAmount) {
        newStatus = 'refunded';
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: newStatus },
      });

      // 3. Update Order status
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: newStatus === 'refunded' ? 'refunded' : 'confirmed' },
      });

      // 4. Restore inventory stock (Optionally based on merchant settings, here we restore automatically)
      for (const item of payment.order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });

          // Log inventory change
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              previousQuantity: 0, // placeholder
              newQuantity: item.quantity,
              changeAmount: item.quantity,
              reason: 'refund',
              orderId: payment.orderId,
              updatedBy: `admin_${req.user.id}`,
            },
          });
        }
      }

      // Log action
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'refund_processed',
          description: `Processed refund of $${refundAmount.toFixed(2)} on Order #${payment.orderId} for reason: ${reason}`,
        },
      });

      return ref;
    });

    res.status(201).json({
      message: 'Refund processed successfully',
      refund,
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Server error processing refund' });
  }
});

module.exports = router;
