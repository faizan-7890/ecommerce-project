const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');
const {
  isValidOrderStatus,
  isValidPaymentStatus,
  isValidShipmentStatus,
  isValidRefundStatus,
} = require('../services/orderState');
const { restoreOrderStock } = require('../services/inventory');

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

// @desc    Update order statuses (with stock restoration and audit logging)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
router.put('/orders/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  const { orderStatus, paymentStatus, shipmentStatus, refundStatus } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  // Reject undocumented "confirmed" and any other non-canonical status
  if (orderStatus && !isValidOrderStatus(orderStatus)) {
    return res.status(400).json({ message: `Invalid orderStatus: ${orderStatus}` });
  }
  if (paymentStatus && !isValidPaymentStatus(paymentStatus)) {
    return res.status(400).json({ message: `Invalid paymentStatus: ${paymentStatus}` });
  }
  if (shipmentStatus && !isValidShipmentStatus(shipmentStatus)) {
    return res.status(400).json({ message: `Invalid shipmentStatus: ${shipmentStatus}` });
  }
  if (refundStatus && !isValidRefundStatus(refundStatus)) {
    return res.status(400).json({ message: `Invalid refundStatus: ${refundStatus}` });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const dataToUpdate = {};
      if (orderStatus) dataToUpdate.orderStatus = orderStatus;
      if (paymentStatus) dataToUpdate.paymentStatus = paymentStatus;
      if (shipmentStatus) dataToUpdate.shipmentStatus = shipmentStatus;
      if (refundStatus) dataToUpdate.refundStatus = refundStatus;

      const updatedOrder = await tx.order.update({
        where: { id },
        data: dataToUpdate,
      });

      // Restore stock once when transitioning to cancelled (or refund completed)
      const isTransitioningToCancelled =
        (orderStatus === 'cancelled' || refundStatus === 'completed') &&
        order.orderStatus !== 'cancelled' &&
        order.orderStatus !== 'returned' &&
        !order.stockRestored;

      if (isTransitioningToCancelled) {
        const reason = refundStatus === 'completed' ? 'refund' : 'cancellation';
        await restoreOrderStock(tx, order, reason, `admin_${req.user.id}`);

        await tx.payment.updateMany({
          where: { orderId: id },
          data: {
            status: refundStatus === 'completed' ? 'refunded' : 'failed',
          },
        });
      }

      const changesString = Object.entries(dataToUpdate)
        .map(([k, v]) => `${k} -> '${v}'`)
        .join(', ');

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'update_order_status',
          description: `Admin updated Order #${order.orderNumber} statuses: ${changesString}`,
        },
      });

      return updatedOrder;
    });

    res.json(updated);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating order statuses' });
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
        orderStatus: { not: 'cancelled' },
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
      where: { orderStatus: 'pending', createdAt: { gte: start, lte: end } },
    });
    const cancelledOrdersCount = await prisma.order.count({
      where: { orderStatus: 'cancelled', createdAt: { gte: start, lte: end } },
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
          orderStatus: { notIn: ['cancelled', 'returned'] },
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
