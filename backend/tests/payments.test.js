const request = require('supertest');
const crypto = require('crypto');
const app = require('../server');
const { prisma } = require('../src/config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_key_2026_safe_and_secure';
const WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret';

function signWebhookBody(bodyObj) {
  const raw = Buffer.from(JSON.stringify(bodyObj));
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  return { raw, signature };
}

describe('Razorpay Payments REST API', () => {
  let user, admin;
  let userToken, adminToken;
  let category, product, variant;
  let address;
  let order;
  let payment;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    const existing = await prisma.user.findMany({
      where: { email: { in: ['pay-user@test.com', 'pay-admin@test.com'] } },
    });
    if (existing.length > 0) {
      const ids = existing.map((u) => u.id);
      const orders = await prisma.order.findMany({ where: { userId: { in: ids } }, select: { id: true } });
      const orderIds = orders.map((o) => o.id);
      await prisma.inventoryLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.address.deleteMany({ where: { userId: { in: ids } } });
      await prisma.cart.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }

    await prisma.productVariant.deleteMany({ where: { sku: 'PAY-TEST-SKU' } });
    await prisma.product.deleteMany({ where: { slug: 'pay-test-product' } });
    await prisma.category.deleteMany({ where: { name: 'Payment test cat' } });

    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

    user = await prisma.user.create({
      data: {
        name: 'Pay Customer',
        email: 'pay-user@test.com',
        password: 'password123',
        roleId: customerRole.id,
        cart: { create: {} },
      },
    });
    userToken = jwt.sign({ id: user.id }, JWT_SECRET);

    admin = await prisma.user.create({
      data: {
        name: 'Pay Admin',
        email: 'pay-admin@test.com',
        password: 'password123',
        roleId: adminRole.id,
      },
      include: { role: true },
    });
    adminToken = jwt.sign({ id: admin.id }, JWT_SECRET);

    address = await prisma.address.create({
      data: {
        userId: user.id,
        fullName: 'John Pay',
        phoneNumber: '1234567890',
        addressLine1: '123 Pay St',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
        country: 'India',
      },
    });

    category = await prisma.category.create({ data: { name: 'Payment test cat' } });
    product = await prisma.product.create({
      data: {
        name: 'Pay Test Product',
        description: 'Payment integration check',
        brand: 'Veloce',
        basePrice: 100.0,
        categoryId: category.id,
        slug: 'pay-test-product',
      },
    });
    variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'PAY-TEST-SKU',
        size: 'L',
        color: 'Blue',
        stock: 5,
        price: 100.0,
      },
    });

    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: product.id, variantId: variant.id, quantity: 1 },
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ shippingAddressId: address.id, paymentMethod: 'card' });
    order = orderRes.body;

    payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
  });

  afterAll(async () => {
    const ids = [];
    if (user && user.id) ids.push(user.id);
    if (admin && admin.id) ids.push(admin.id);

    if (ids.length > 0) {
      const orders = await prisma.order.findMany({ where: { userId: { in: ids } }, select: { id: true } });
      const orderIds = orders.map((o) => o.id);
      await prisma.inventoryLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.address.deleteMany({ where: { userId: { in: ids } } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: ids } } } });
      await prisma.cart.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }

    if (variant && variant.id) await prisma.productVariant.deleteMany({ where: { id: variant.id } });
    if (product && product.id) await prisma.product.deleteMany({ where: { id: product.id } });
    if (category && category.id) await prisma.category.deleteMany({ where: { id: category.id } });

    await prisma.processedWebhookEvent.deleteMany({
      where: { eventKey: { contains: 'pay_test' } },
    }).catch(() => {});

    await prisma.$disconnect();
  });

  it('should create a Razorpay Order in backend', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: order.id })
      .expect(201);

    expect(res.body).toHaveProperty('razorpayOrderId');
    expect(res.body).toHaveProperty('amount');
    expect(res.body.currency).toBe('INR');

    payment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payment.razorpayOrderId).toBe(res.body.razorpayOrderId);
    expect(payment.transactionId).toBe(res.body.razorpayOrderId);
  });

  it('should verify payment signature and update order status to processing', async () => {
    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: payment.razorpayOrderId || payment.transactionId,
        razorpay_payment_id: 'pay_test_payment_id_123',
        razorpay_signature: 'mock_valid_signature_veloce_2026',
      })
      .expect(200);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder.orderStatus).toBe('processing');
    expect(updatedOrder.paymentStatus).toBe('paid');

    const updatedPayment = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(updatedPayment.razorpayPaymentId).toBe('pay_test_payment_id_123');
  });

  it('should reject webhooks with invalid signature', async () => {
    const body = {
      event: 'order.paid',
      payload: { order: { entity: { id: payment.razorpayOrderId, status: 'paid' } } },
    };
    await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', 'invalid_signature_value_here_xx')
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(400);
  });

  it('should process webhook capture events and ignore duplicate triggers', async () => {
    const body = {
      event: 'order.paid',
      created_at: 1234567890,
      payload: {
        order: {
          entity: {
            id: payment.razorpayOrderId || payment.transactionId,
            status: 'paid',
          },
        },
        payment: {
          entity: {
            id: 'pay_test_payment_id_123',
            order_id: payment.razorpayOrderId || payment.transactionId,
          },
        },
      },
    };

    const { signature } = signWebhookBody(body);

    // Payment already paid from verify — should bypass as duplicate
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);

    expect(
      res.body.message === 'Duplicate event bypassed' ||
        res.body.message === 'Razorpay webhook sync complete'
    ).toBe(true);

    // Replay same event
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(body)
      .expect(200);

    expect(res2.body.message).toContain('Duplicate');
  });

  it('should allow admin to issue refunds and restore variant stock levels once', async () => {
    let variantObj = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(variantObj.stock).toBe(4);

    const payRecord = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(payRecord.razorpayPaymentId).toBeTruthy();

    await request(app)
      .post(`/api/payments/${payRecord.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: order.total,
        reason: 'Integration test refund',
      })
      .expect(201);

    variantObj = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(variantObj.stock).toBe(5);

    const refundedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refundedOrder.orderStatus).toBe('cancelled');
    expect(refundedOrder.paymentStatus).toBe('refunded');
    expect(refundedOrder.stockRestored).toBe(true);
  });
});
