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

// @desc    Update order statuses (with stock restoration and audit logging)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
router.put('/orders/:id/status', async (req, res) => {
  const id = parseInt(req.params.id);
  const { orderStatus, paymentStatus, shipmentStatus, refundStatus } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  // Validate inputs if provided
  const validOrderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
  const validPaymentStatuses = ['unpaid', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'];
  const validShipmentStatuses = ['unfulfilled', 'label_created', 'shipped', 'in_transit', 'delivered'];
  const validRefundStatuses = ['none', 'pending', 'completed', 'failed'];

  if (orderStatus && !validOrderStatuses.includes(orderStatus)) {
    return res.status(400).json({ message: `Invalid orderStatus: ${orderStatus}` });
  }
  if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
    return res.status(400).json({ message: `Invalid paymentStatus: ${paymentStatus}` });
  }
  if (shipmentStatus && !validShipmentStatuses.includes(shipmentStatus)) {
    return res.status(400).json({ message: `Invalid shipmentStatus: ${shipmentStatus}` });
  }
  if (refundStatus && !validRefundStatuses.includes(refundStatus)) {
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

    // Process status updates within a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const dataToUpdate = {};
      if (orderStatus) dataToUpdate.orderStatus = orderStatus;
      if (paymentStatus) dataToUpdate.paymentStatus = paymentStatus;
      if (shipmentStatus) dataToUpdate.shipmentStatus = shipmentStatus;
      if (refundStatus) dataToUpdate.refundStatus = refundStatus;

      // 1. Update statuses
      const updatedOrder = await tx.order.update({
        where: { id },
        data: dataToUpdate,
      });

      // 2. Enforce inventory return if status transitions to cancelled/refunded and wasn't before
      // Guard: Ensure previous orderStatus was NOT cancelled/refunded to avoid double restoration
      const isTransitioningToCancelled = (orderStatus === 'cancelled' || orderStatus === 'refunded' || refundStatus === 'completed') &&
                                         (order.orderStatus !== 'cancelled' && order.orderStatus !== 'refunded');

      if (isTransitioningToCancelled) {
        for (const item of order.items) {
          if (item.variantId) {
            // Lock row
            const lockedVariants = await tx.$queryRaw`
              SELECT id, stock FROM "ProductVariant"
              WHERE id = ${item.variantId}
              FOR UPDATE
            `;
            const variant = lockedVariants[0];

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
                reason: orderStatus === 'refunded' || refundStatus === 'completed' ? 'refund' : 'cancellation',
                orderId: id,
                updatedBy: `admin_${req.user.id}`,
              },
            });
          }
        }

        // De-authorize payment status in payments table if cancelled
        await tx.payment.updateMany({
          where: { orderId: id },
          data: { status: orderStatus === 'refunded' || refundStatus === 'completed' ? 'refunded' : 'failed' },
        });
      }

      // 3. Create AuditLog entry for admin actions
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
