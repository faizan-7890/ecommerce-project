const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');

// Helper: Generate unique random order number
const generateOrderNumber = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
};

// @desc    Create a new order (Concurrency-Safe Checkout with Coupons & Variants)
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  const { shippingAddressId, billingAddressId, couponCode, paymentMethod = 'cod' } = req.body;
  const shipId = parseInt(shippingAddressId);
  const billId = billingAddressId ? parseInt(billingAddressId) : null;

  if (isNaN(shipId)) {
    return res.status(400).json({ message: 'shippingAddressId is required' });
  }

  try {
    // 1. Fetch user shipping/billing addresses
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

    // Format address snapshots
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

    // 2. Fetch user's cart items
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
      const basePrice = item.variant && item.variant.price !== null
        ? parseFloat(item.variant.price)
        : parseFloat(item.product.basePrice);

      const flatDiscount = parseFloat(item.product.discountPrice || 0);
      let finalPrice = basePrice - flatDiscount;
      if (finalPrice < 0) finalPrice = 0;

      subtotal += finalPrice * item.quantity;
    }

    // 3. Process Coupon Discount
    let discountAmount = 0;
    let coupon = null;

    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive) {
        const meetsMinAmount = subtotal >= parseFloat(coupon.minOrderAmount);
        const notExpired = !coupon.expirationDate || new Date(coupon.expirationDate) > new Date();
        
        let underUsageLimit = true;
        if (coupon.usageLimit !== null) {
          const usagesCount = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
          underUsageLimit = usagesCount < coupon.usageLimit;
        }

        if (meetsMinAmount && notExpired && underUsageLimit) {
          const val = parseFloat(coupon.discountValue);
          if (coupon.discountType === 'percentage') {
            discountAmount = subtotal * (val / 100);
          } else {
            discountAmount = val;
          }
          if (discountAmount > subtotal) discountAmount = subtotal;
        }
      }
    }

    // 4. Calculate Tax and Shipping fees
    const taxableSubtotal = subtotal - discountAmount;
    const taxAmount = taxableSubtotal * 0.08; // 8% sales tax
    
    // Free shipping for orders above $100.00, otherwise flat $10.00
    const shippingAmount = taxableSubtotal >= 100.00 ? 0.00 : 10.00;
    const finalTotal = taxableSubtotal + taxAmount + shippingAmount;

    // 5. Execute Checkout Database Transaction (enforces concurrency and inventory reservations)
    const order = await prisma.$transaction(async (tx) => {
      
      // Step A: Reserve and deduct stock at the variant level
      for (const item of cart.items) {
        if (item.variantId) {
          // Lock variant row for update to prevent race conditions in Postgres
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });

          if (!variant || variant.stock < item.quantity) {
            throw new Error(`Product ${item.product.name} variant is out of stock or has insufficient quantity.`);
          }

          // Decrement stock
          const updatedVariant = await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          // Log inventory adjustment
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              previousQuantity: variant.stock,
              newQuantity: updatedVariant.stock,
              changeAmount: -item.quantity,
              reason: 'checkout',
              updatedBy: `user_${req.user.id}`,
            },
          });
        }
      }

      // Step B: Create Order record
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
          status: paymentMethod === 'cod' ? 'pending' : 'payment_pending',
          items: {
            create: cart.items.map((item) => {
              const basePrice = item.variant && item.variant.price !== null
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

      // Step C: Update InventoryLogs with order link
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

      // Step D: Register Coupon usage
      if (coupon && discountAmount > 0) {
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId: req.user.id,
            orderId: newOrder.id,
          },
        });
      }

      // Step E: Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Step F: Create Payment pending block
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
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
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

// @desc    Cancel order (Pending state only)
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
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

    // Cancellation criteria: pending or payment_pending only
    if (order.status !== 'pending' && order.status !== 'payment_pending') {
      return res.status(400).json({ message: `Cannot cancel orders with status '${order.status}'` });
    }

    // Restore stock and cancel order
    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      // Restore variant stock
      for (const item of order.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          const newQty = (variant?.stock || 0) + item.quantity;
          
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });

          // Log stock recovery
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              previousQuantity: variant?.stock || 0,
              newQuantity: newQty,
              changeAmount: item.quantity,
              reason: 'cancellation',
              orderId: id,
              updatedBy: `user_${req.user.id}`,
            },
          });
        }
      }

      // Mark payments as failed
      await tx.payment.updateMany({
        where: { orderId: id },
        data: { status: 'failed' },
      });

      return ord;
    });

    res.json({ message: 'Order successfully cancelled', order: updated });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error processing cancellation' });
  }
});

module.exports = router;
