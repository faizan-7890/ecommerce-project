const request = require('supertest');
const app = require('../server');
const { prisma } = require('../src/config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_key_2026_safe_and_secure';

describe('Database Locks, Concurrency & Idempotency Checks', () => {
  let user1, user2;
  let token1, token2;
  let category;
  let product;
  let variant;
  let address1, address2;

  beforeAll(async () => {
    // 1. Wipe out any pre-existing concurrency test users from crashed runs
    const existing = await prisma.user.findMany({
      where: { email: { in: ['user1@concurrency.com', 'user2@concurrency.com'] } },
    });

    if (existing.length > 0) {
      const existingIds = existing.map((u) => u.id);
      
      const orders = await prisma.order.findMany({
        where: { userId: { in: existingIds } },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);

      await prisma.inventoryLog.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.couponUsage.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

      await prisma.address.deleteMany({ where: { userId: { in: existingIds } } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: existingIds } } } });
      await prisma.cart.deleteMany({ where: { userId: { in: existingIds } } });
      await prisma.user.deleteMany({ where: { id: { in: existingIds } } });
    }

    // Wipe duplicate category, product & variant if they exist
    await prisma.productVariant.deleteMany({ where: { sku: 'TEST-SKU-LOCK' } });
    await prisma.product.deleteMany({ where: { slug: 'limited-stock-product' } });
    await prisma.category.deleteMany({ where: { name: 'Concurrency Testing Category' } });

    // 2. Create two test customers
    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    
    user1 = await prisma.user.create({
      data: {
        name: 'Concurrent User 1',
        email: 'user1@concurrency.com',
        password: 'password123',
        roleId: customerRole.id,
        cart: { create: {} },
      },
    });
    token1 = jwt.sign({ id: user1.id }, JWT_SECRET);

    user2 = await prisma.user.create({
      data: {
        name: 'Concurrent User 2',
        email: 'user2@concurrency.com',
        password: 'password123',
        roleId: customerRole.id,
        cart: { create: {} },
      },
    });
    token2 = jwt.sign({ id: user2.id }, JWT_SECRET);

    // 3. Create Addresses
    address1 = await prisma.address.create({
      data: {
        userId: user1.id,
        fullName: 'User One Address',
        phoneNumber: '1111111111',
        addressLine1: 'Street 1',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
    });

    address2 = await prisma.address.create({
      data: {
        userId: user2.id,
        fullName: 'User Two Address',
        phoneNumber: '2222222222',
        addressLine1: 'Street 2',
        city: 'Boston',
        state: 'MA',
        postalCode: '02108',
        country: 'USA',
      },
    });

    // 4. Create test category, product, and variant (STOCK = 1)
    category = await prisma.category.create({
      data: { name: 'Concurrency Testing Category' },
    });

    product = await prisma.product.create({
      data: {
        name: 'Limited Stock Product',
        description: 'Testing concurrency locks',
        brand: 'Veloce Test',
        basePrice: 50.00,
        categoryId: category.id,
        slug: 'limited-stock-product',
      },
    });

    variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'TEST-SKU-LOCK',
        size: 'M',
        color: 'Black',
        stock: 1, // EXACTLY 1 ITEM IN STOCK
        price: 50.00,
      },
    });
  });

  afterAll(async () => {
    const userIds = [];
    if (user1 && user1.id) userIds.push(user1.id);
    if (user2 && user2.id) userIds.push(user2.id);

    if (userIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);

      await prisma.inventoryLog.deleteMany({ where: { orderId: { in: orderIds } } });
      if (product && product.id) {
        await prisma.inventoryLog.deleteMany({ where: { productId: product.id } });
      }
      await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.couponUsage.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

      await prisma.address.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
      await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    if (variant && variant.id) {
      await prisma.productVariant.deleteMany({ where: { id: variant.id } });
    }
    if (product && product.id) {
      await prisma.product.deleteMany({ where: { id: product.id } });
    }
    if (category && category.id) {
      await prisma.category.deleteMany({ where: { id: category.id } });
    }

    await prisma.$disconnect();
  });

  it('should lock rows so only one user can buy the final item in stock', async () => {
    // 1. Clear carts & populate them for both users with quantity = 1
    const cart1 = await prisma.cart.findUnique({ where: { userId: user1.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart1.id } });
    await prisma.cartItem.create({
      data: {
        cartId: cart1.id,
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    const cart2 = await prisma.cart.findUnique({ where: { userId: user2.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart2.id } });
    await prisma.cartItem.create({
      data: {
        cartId: cart2.id,
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    // Verify stock is 1
    let dbVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(dbVariant.stock).toBe(1);

    // 2. Dispatch two simultaneous checkout requests
    const checkoutRequest1 = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ shippingAddressId: address1.id, paymentMethod: 'cod' });

    const checkoutRequest2 = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token2}`)
      .send({ shippingAddressId: address2.id, paymentMethod: 'cod' });

    const [res1, res2] = await Promise.all([checkoutRequest1, checkoutRequest2]);

    // 3. Verify exactly one succeeded and one failed
    const success = [res1, res2].find((r) => r.status === 201);
    const failure = [res1, res2].find((r) => r.status === 400);

    expect(success).toBeDefined();
    expect(failure).toBeDefined();

    expect(success.body).toHaveProperty('id');
    expect(failure.body.message).toContain('out of stock');

    // 4. Verify variant stock is 0 and not negative
    dbVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(dbVariant.stock).toBe(0);
  });

  it('should check x-idempotency-key and return cached order for duplicate requests', async () => {
    // 1. Replenish stock to 1, clear cart, and add item back for user 1
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: 1 },
    });

    const cart1 = await prisma.cart.findUnique({ where: { userId: user1.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart1.id } });
    await prisma.cartItem.create({
      data: {
        cartId: cart1.id,
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    const idemKey = `idem-test-concurrency-${Date.now()}`;

    // 2. First checkout request
    const firstRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .set('x-idempotency-key', idemKey)
      .send({ shippingAddressId: address1.id, paymentMethod: 'cod' })
      .expect(201);

    expect(firstRes.body).toHaveProperty('orderNumber');
    const orderNumber = firstRes.body.orderNumber;

    // 3. Second checkout request with SAME key (cart is empty, stock is 0, but it must return 200 OK with same order details!)
    const secondRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .set('x-idempotency-key', idemKey)
      .send({ shippingAddressId: address1.id, paymentMethod: 'cod' })
      .expect(200);

    expect(secondRes.body.orderNumber).toBe(orderNumber);
    expect(secondRes.body.id).toBe(firstRes.body.id);
  });

  it('should prevent double restorations when cancelling an order multiple times', async () => {
    // 1. Clear cart and create a new test order with user 1
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: 0 },
    });

    const cart1 = await prisma.cart.findUnique({ where: { userId: user1.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart1.id } });
    await prisma.cartItem.create({
      data: {
        cartId: cart1.id,
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
      },
    });

    // temporarily set stock to 1 to buy it
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: 1 },
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token1}`)
      .send({ shippingAddressId: address1.id, paymentMethod: 'cod' });

    const orderId = orderRes.body.id;

    // Stock should be 0 now
    let dbVar = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(dbVar.stock).toBe(0);

    // 2. Cancel order for the first time (stock restored to 1)
    await request(app)
      .put(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(200);

    dbVar = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(dbVar.stock).toBe(1);

    // 3. Cancel order again (must return 400, stock remains 1)
    const failRes = await request(app)
      .put(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token1}`)
      .expect(400);

    expect(failRes.body.message).toContain('already been cancelled');

    dbVar = await prisma.productVariant.findUnique({ where: { id: variant.id } });
    expect(dbVar.stock).toBe(1); // STILL 1 (not double incremented!)
  });
});
