const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');

// Secure all admin routes
router.use(protect, isAdmin);

// @desc    Get all orders across the entire system
// @route   GET /api/admin/orders
// @access  Private/Admin
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Admin load orders error:', error);
    res.status(500).json({ message: 'Server error loading all orders' });
  }
});

// @desc    Update order status (with stock restoration and audit logging)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
router.put('/orders/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;

  const validStatuses = ['pending', 'payment_pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
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

    if (order.status === status) {
      return res.json(order);
    }

    // Process status updates
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
      });

      // 2. Enforce inventory return if status transitions to cancelled/refunded and wasn't before
      if ((status === 'cancelled' || status === 'refunded') && order.status !== 'cancelled' && order.status !== 'refunded') {
        for (const item of order.items) {
          if (item.variantId) {
            const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
            const newQty = (variant?.stock || 0) + item.quantity;

            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });

            // Log stock restoration
            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                variantId: item.variantId,
                previousQuantity: variant?.stock || 0,
                newQuantity: newQty,
                changeAmount: item.quantity,
                reason: status === 'refunded' ? 'refund' : 'cancellation',
                orderId: id,
                updatedBy: `admin_${req.user.id}`,
              },
            });
          }
        }

        // De-authorize payment status
        await tx.payment.updateMany({
          where: { orderId: id },
          data: { status: status === 'refunded' ? 'refunded' : 'failed' },
        });
      }

      // 3. Create AuditLog entry for admin actions
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'update_order_status',
          description: `Updated status of Order #${order.orderNumber} from '${order.status}' to '${status}'`,
        },
      });

      return updatedOrder;
    });

    res.json(updated);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating order status' });
  }
});

// @desc    Get dashboard analytics (with date filters and best-sellers)
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  const { rangeType = 'last30days', startDate, endDate } = req.query;

  // Build dynamic date ranges
  let start = new Date();
  if (rangeType === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (rangeType === 'last7days') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (rangeType === 'last30days') {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else if (rangeType === 'thisyear') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else if (rangeType === 'custom' && startDate) {
    start = new Date(startDate);
  } else {
    start.setDate(start.getDate() - 30); // Default fallback
    start.setHours(0, 0, 0, 0);
  }

  let end = endDate ? new Date(endDate) : new Date();

  try {
    // 1. Total Metrics (Filtered by date range, excluding cancelled orders for revenue)
    const activeOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: 'cancelled' },
      },
      select: { total: true },
    });
    const revenue = activeOrders.reduce((acc, o) => acc + parseFloat(o.total), 0);

    const totalOrdersCount = await prisma.order.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    const totalCustomersCount = await prisma.user.count({
      where: {
        role: { name: 'CUSTOMER' },
        createdAt: { gte: start, lte: end },
      },
    });

    const totalProductsCount = await prisma.product.count({
      where: { status: 'active' },
    });

    // 2. Fetch Order Status Counts in timeframe
    const pendingOrdersCount = await prisma.order.count({
      where: { status: 'pending', createdAt: { gte: start, lte: end } },
    });
    const cancelledOrdersCount = await prisma.order.count({
      where: { status: 'cancelled', createdAt: { gte: start, lte: end } },
    });
    
    // Failed payments count
    const failedPaymentsCount = await prisma.payment.count({
      where: { status: 'failed', createdAt: { gte: start, lte: end } },
    });

    // 3. Best-Selling Products (Aggregate sold quantities)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      },
      select: {
        productId: true,
        productNameSnapshot: true,
        quantity: true,
        productPriceSnapshot: true,
      },
    });

    // Group items by productId
    const productSalesMap = {};
    orderItems.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          id: item.productId,
          name: item.productNameSnapshot,
          totalQty: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].totalQty += item.quantity;
      productSalesMap[item.productId].revenue += parseFloat(item.productPriceSnapshot) * item.quantity;
    });

    const bestSellers = Object.values(productSalesMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    // 4. Low-Stock Products Warning (variant stock <= lowStockThreshold)
    const allVariants = await prisma.productVariant.findMany({
      include: { product: true },
    });

    const lowStockProducts = allVariants
      .filter((v) => v.stock <= v.product.lowStockThreshold && v.product.status === 'active')
      .map((v) => ({
        id: v.product.id,
        variantId: v.id,
        name: `${v.product.name} (${v.size || 'OS'}/${v.color || 'Default'})`,
        sku: v.sku,
        stock: v.stock,
        threshold: v.product.lowStockThreshold,
      }));

    // 5. Recent Audit Logs (Admin audit trail)
    const auditLogs = await prisma.auditLog.findMany({
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    res.json({
      salesSummary: {
        totalRevenue: parseFloat(revenue.toFixed(2)),
        totalOrders: totalOrdersCount,
        totalProducts: totalProductsCount,
        totalCustomers: totalCustomersCount,
      },
      orderMetrics: {
        pendingOrders: pendingOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        failedPayments: failedPaymentsCount,
      },
      bestSellers,
      lowStockProducts,
      auditLogs,
      rangeFilter: {
        rangeType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ message: 'Server error compiling dashboard statistics' });
  }
});

module.exports = router;
