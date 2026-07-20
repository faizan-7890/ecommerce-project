const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');
const { restoreOrderStock, decrementVariantStock } = require('../services/inventory');

// Unpaid card checkouts expire after this window so stock is not held forever
const ORDER_EXPIRY_MINUTES = parseInt(process.env.ORDER_EXPIRY_MINUTES || '30', 10);

const generateOrderNumber = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
};

// @desc    Create a new order (Concurrency-Safe Checkout with Postgres Row-level Locks & Idempotency)
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  const { shippingAddressId, billingAddressId, couponCode, paymentMethod = 'cod' } = req.body;
  const idempotencyKey = req.headers['x-idempotency-key'];

  const shipId = parseInt(shippingAddressId, 10);
  const billId = billingAddressId ? parseInt(billingAddressId, 10) : null;

  if (Number.isNaN(shipId)) {
    return res.status(400).json({ message: 'shippingAddressId is required' });
  }

  try {
    // 1. Idempotency scoped to the authenticated user
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: { items: true, payments: true },
      });
      if (existingOrder) {
        if (existingOrder.userId !== req.user.id) {
          return res.status(409).json({
            message: 'Idempotency key conflict: key already used by another account',
          });
        }
        return res.status(200).json(existingOrder);
      }
    }

    // 2. Fetch user shipping/billing addresses
    const shippingAddress = await prisma.address.findUnique({ where: { id: shipId } });
    if (!shippingAddress || shippingAddress.userId !== req.user.id) {
      return res.status(400).json({ message: 'Invalid shippingAddressId' });
    }

    let billingAddress = shippingAddress;
    if (billId) {
      const dbBill = await prisma.address.findUnique({ where: { id: billId } });
      if (dbBill && dbBill.userId === req.user.id) {
        billingAddress = dbBill;
      }
    }

    const formatAddressSnapshot = (addr) => ({
      fullName: addr.fullName,
      phoneNumber: addr.phoneNumber,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      addressType: addr.addressType,
    });

    const shippingSnapshot = formatAddressSnapshot(shippingAddress);
    const billingSnapshot = formatAddressSnapshot(billingAddress);

    // 3. Fetch user's cart items
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your shopping cart is empty' });
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const item of cart.items) {
      const basePrice =
        item.variant && item.variant.price !== null
          ? parseFloat(item.variant.price)
          : parseFloat(item.product.basePrice);

      const flatDiscount = parseFloat(item.product.discountPrice || 0);
      let finalPrice = basePrice - flatDiscount;
      if (finalPrice < 0) finalPrice = 0;

      subtotal += finalPrice * item.quantity;
    }

    // 4. Pre-load coupon (usage re-validated under lock inside transaction)
    let coupon = null;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });
    }

    // 5. Execute Concurrency-Safe Postgres Transaction
    const order = await prisma.$transaction(async (tx) => {
      // Re-check idempotency inside transaction (race protection)
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({
          where: { idempotencyKey },
          include: { items: true, payments: true },
        });
        if (existing) {
          if (existing.userId !== req.user.id) {
            throw new Error('Idempotency key conflict: key already used by another account');
          }
          return existing;
        }
      }

      // Step A: Lock rows and verify stock levels
      for (const item of cart.items) {
        if (item.variantId) {
          await decrementVariantStock(tx, {
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            userId: req.user.id,
          });
        }
      }

      // Step B: Atomic coupon reservation under row lock
      let discountAmount = 0;
      let appliedCoupon = null;

      if (coupon && coupon.isActive) {
        const lockedCoupons = await tx.$queryRaw`
          SELECT id, "discountType", "discountValue", "minOrderAmount", "usageLimit", "expirationDate", "isActive"
          FROM "Coupon"
          WHERE id = ${coupon.id}
          FOR UPDATE
        `;
        const locked = lockedCoupons[0];
        if (locked && locked.isActive) {
          const meetsMinAmount = subtotal >= parseFloat(locked.minOrderAmount);
          const notExpired =
            !locked.expirationDate || new Date(locked.expirationDate) > new Date();

          let underUsageLimit = true;
          if (locked.usageLimit !== null) {
            const usagesCount = await tx.couponUsage.count({ where: { couponId: locked.id } });
            underUsageLimit = usagesCount < locked.usageLimit;
          }

          if (meetsMinAmount && notExpired && underUsageLimit) {
            const val = parseFloat(locked.discountValue);
            if (locked.discountType === 'percentage') {
              discountAmount = subtotal * (val / 100);
            } else {
              discountAmount = val;
            }
            if (discountAmount > subtotal) discountAmount = subtotal;
            appliedCoupon = locked;
          }
        }
      }

      const taxableSubtotal = subtotal - discountAmount;
      const taxAmount = taxableSubtotal * 0.08;
      // Free shipping for orders above ₹100, otherwise flat ₹10 (INR)
      const shippingAmount = taxableSubtotal >= 100.0 ? 0.0 : 10.0;
      const finalTotal = taxableSubtotal + taxAmount + shippingAmount;

      // Card checkouts get an expiry window for unpaid inventory reservation
      const expiresAt =
        paymentMethod !== 'cod'
          ? new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000)
          : null;

      // Step C: Create Order record
      const orderNumber = generateOrderNumber();
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: req.user.id,
          subtotal: parseFloat(subtotal.toFixed(2)),
          discountAmount: parseFloat(discountAmount.toFixed(2)),
          taxAmount: parseFloat(taxAmount.toFixed(2)),
          shippingAmount: parseFloat(shippingAmount.toFixed(2)),
          total: parseFloat(finalTotal.toFixed(2)),
          shippingAddressSnapshot: shippingSnapshot,
          billingAddressSnapshot: billingSnapshot,
          shippingAddressId: shipId,
          billingAddressId: billId || shipId,
          orderStatus: 'pending',
          paymentStatus: 'unpaid',
          shipmentStatus: 'unfulfilled',
          refundStatus: 'none',
          stockRestored: false,
          expiresAt,
          idempotencyKey: idempotencyKey || null,
          items: {
            create: cart.items.map((item) => {
              const basePrice =
                item.variant && item.variant.price !== null
                  ? parseFloat(item.variant.price)
                  : parseFloat(item.product.basePrice);
              const flatDiscount = parseFloat(item.product.discountPrice || 0);
              let finalUnitPrice = basePrice - flatDiscount;
              if (finalUnitPrice < 0) finalUnitPrice = 0;

              return {
                productId: item.productId,
                variantId: item.variantId,
                productNameSnapshot: item.variant
                  ? `${item.product.name} (${item.variant.size || ''}/${item.variant.color || ''})`
                  : item.product.name,
                productPriceSnapshot: parseFloat(finalUnitPrice.toFixed(2)),
                quantity: item.quantity,
              };
            }),
          },
        },
        include: {
          items: true,
        },
      });

      // Step D: Link inventory logs to order
      await tx.inventoryLog.updateMany({
        where: {
          reason: 'checkout',
          updatedBy: `user_${req.user.id}`,
          orderId: null,
        },
        data: {
          orderId: newOrder.id,
        },
      });

      // Step E: Register Coupon usage (inside same locked transaction)
      if (appliedCoupon && discountAmount > 0) {
        await tx.couponUsage.create({
          data: {
            couponId: appliedCoupon.id,
            userId: req.user.id,
            orderId: newOrder.id,
          },
        });
      }

      // Step F: Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Step G: Create Payment pending block
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: parseFloat(finalTotal.toFixed(2)),
          method: paymentMethod,
          status: 'pending',
        },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Checkout error:', error);
    // Unique idempotency race
    if (error.code === 'P2002' && idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: { items: true, payments: true },
      });
      if (existing && existing.userId === req.user.id) {
        return res.status(200).json(existing);
      }
      return res.status(409).json({
        message: 'Idempotency key conflict: key already used by another account',
      });
    }
    res.status(400).json({ message: error.message || 'Server error during checkout' });
  }
});

// @desc    Get current user's order logs
// @route   GET /api/orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
        payments: true,
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Server error loading orders' });
  }
});

// @desc    Get order details by ID
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { images: true } },
            variant: true,
          },
        },
        payments: true,
        refunds: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== req.user.id && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized access to order details' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ message: 'Server error loading order specifications' });
  }
});

// @desc    Cancel order (Pending state only; stock restored at most once)
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== req.user.id && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'This order has already been cancelled.' });
    }

    // Cancellation: pending unpaid only (paid orders need refund flow)
    if (order.orderStatus !== 'pending') {
      return res.status(400).json({
        message: `Cannot cancel orders with status '${order.orderStatus}'`,
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        message: 'Paid orders cannot be cancelled here; request a refund instead.',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!fresh || fresh.orderStatus === 'cancelled') {
        throw new Error('This order has already been cancelled.');
      }

      const ord = await tx.order.update({
        where: { id },
        data: {
          orderStatus: 'cancelled',
          paymentStatus: 'failed',
        },
      });

      if (!fresh.stockRestored) {
        await restoreOrderStock(tx, fresh, 'cancellation', `user_${req.user.id}`);
      }

      await tx.payment.updateMany({
        where: { orderId: id },
        data: { status: 'failed' },
      });

      return ord;
    });

    res.json({ message: 'Order successfully cancelled', order: updated });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: error.message || 'Server error processing cancellation' });
  }
});

module.exports = router;
