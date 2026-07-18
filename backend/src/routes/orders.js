const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');

// @desc    Create a new order (Checkout)
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  const { shippingAddress, paymentMethod = 'cod' } = req.body;

  if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.country) {
    return res.status(400).json({ message: 'Please provide full shipping address details' });
  }

  try {
    // 1. Fetch user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    // 2. Validate product stock
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          message: `Product ${item.product.name} is out of stock or does not have sufficient quantity.`,
        });
      }
    }

    // 3. Create or find Address
    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country,
      },
    });

    // 4. Calculate pricing
    let subtotal = 0;
    const orderItemsData = cart.items.map((item) => {
      const price = parseFloat(item.product.price);
      const discount = parseFloat(item.product.discount || 0);
      const finalPrice = price * (1 - discount / 100);
      subtotal += finalPrice * item.quantity;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: parseFloat(finalPrice.toFixed(2)),
      };
    });

    // Subtotal and total are identical in this standard layout, but could include shipping/tax
    const total = subtotal; 

    // 5. Execute transaction (Order creation, stock reduction, cart clearing, payment registration)
    const order = await prisma.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          shippingAddressId: address.id,
          status: 'pending',
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          shippingAddress: true,
        },
      });

      // Deduct stock
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Clear cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Register mock Payment
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: parseFloat(total.toFixed(2)),
          method: paymentMethod,
          status: paymentMethod === 'cod' ? 'pending' : 'completed',
        },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error during order processing' });
  }
});

// @desc    Get logged in user's orders
// @route   GET /api/orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        shippingAddress: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
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
            product: {
              include: { images: true },
            },
          },
        },
        shippingAddress: true,
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Protect resource: only the order owner or an admin can access it
    if (order.userId !== req.user.id && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Fetch order detail error:', error);
    res.status(500).json({ message: 'Server error fetching order details' });
  }
});

// @desc    Cancel order (Eligible only when status is "pending")
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
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== req.user.id && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to modify this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel order with status '${order.status}'` });
    }

    // Cancel order and return stock
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      // Restore stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      // Update payment status
      await tx.payment.update({
        where: { orderId: id },
        data: { status: 'failed' },
      });

      return updated;
    });

    res.json({ message: 'Order cancelled successfully', order: updatedOrder });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error cancelling order' });
  }
});

module.exports = router;
