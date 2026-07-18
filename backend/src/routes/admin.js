const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');

// Make sure all routes in this file require authentication and administrator privileges
router.use(protect, isAdmin);

// @desc    Get all orders across the system
// @route   GET /api/admin/orders
// @access  Private/Admin
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Admin fetch orders error:', error);
    res.status(500).json({ message: 'Server error fetching all orders' });
  }
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
router.put('/orders/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Choose from: ${validStatuses.join(', ')}` });
  }

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

    // Handle stock restoration if status changes from active state to cancelled
    if (order.status !== 'cancelled' && status === 'cancelled') {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status },
        });

        // Restore stock for all products
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

        // Update payment status to failed/refunded
        await tx.payment.update({
          where: { orderId: id },
          data: { status: 'failed' },
        });
      });
    } else {
      // Direct status update
      await prisma.order.update({
        where: { id },
        data: { status },
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        items: true,
        payment: true,
      },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// @desc    Get system sales statistics and analytics
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    // Total Revenue (all orders not cancelled)
    const paidOrders = await prisma.order.findMany({
      where: {
        status: { not: 'cancelled' },
      },
      select: {
        total: true,
      },
    });
    const totalSales = paidOrders.reduce((acc, order) => acc + parseFloat(order.total), 0);

    // Counts
    const totalOrdersCount = await prisma.order.count();
    const totalProductsCount = await prisma.product.count();
    const totalUsersCount = await prisma.user.count({
      where: {
        role: { name: 'CUSTOMER' },
      },
    });

    // Recent 5 Orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Sales by Category
    const categories = await prisma.category.findMany({
      include: {
        products: {
          include: {
            orderItems: {
              select: {
                quantity: true,
                price: true,
              },
            },
          },
        },
      },
    });

    const categoryStats = categories.map((cat) => {
      let sales = 0;
      let itemsSold = 0;

      cat.products.forEach((prod) => {
        prod.orderItems.forEach((item) => {
          sales += parseFloat(item.price) * item.quantity;
          itemsSold += item.quantity;
        });
      });

      return {
        id: cat.id,
        name: cat.name,
        sales: parseFloat(sales.toFixed(2)),
        itemsSold,
      };
    });

    res.json({
      salesSummary: {
        totalRevenue: parseFloat(totalSales.toFixed(2)),
        totalOrders: totalOrdersCount,
        totalProducts: totalProductsCount,
        totalCustomers: totalUsersCount,
      },
      recentOrders,
      categoryStats,
    });
  } catch (error) {
    console.error('Admin stats fetch error:', error);
    res.status(500).json({ message: 'Server error loading analytics stats' });
  }
});

module.exports = router;
