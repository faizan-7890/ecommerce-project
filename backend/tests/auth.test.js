const request = require('supertest');
const app = require('../server');
const { prisma } = require('../src/config/db');
const bcrypt = require('bcryptjs');

describe('User Authentication & Session Rotation API', () => {
  const testEmail = 'auth-test@example.com';
  const testPassword = 'SecurePassword123!';
  let userId;

  beforeAll(async () => {
    // Ensure clean start - delete pre-existing test user
    const existing = await prisma.user.findUnique({ where: { email: testEmail } });
    if (existing) {
      await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId: existing.id } } });
      await prisma.cart.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
  });

  afterAll(async () => {
    // Cleanup test user
    const u = await prisma.user.findUnique({ where: { email: testEmail } });
    if (u) {
      await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId: u.id } } });
      await prisma.cart.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }
    await prisma.$disconnect();
  });

  it('should register a new user with a cart and refresh token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Auth Test User',
        email: testEmail,
        password: testPassword,
      })
      .expect(201);

    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('id');
    expect(res.body.email).toBe(testEmail);
    userId = res.body.id;

    // Check cookie
    const cookies = res.headers['set-cookie'] || [];
    const hasRefreshToken = cookies.some((c) => c.startsWith('refreshToken='));
    expect(hasRefreshToken).toBe(true);

    // Verify user has cart in DB
    const cart = await prisma.cart.findUnique({ where: { userId } });
    expect(cart).toBeDefined();
  });

  it('should fail to register an existing email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another Name',
        email: testEmail,
        password: testPassword,
      })
      .expect(400);
  });

  it('should authenticate user and return access token and cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(res.body.email).toBe(testEmail);

    const cookies = res.headers['set-cookie'] || [];
    const hasRefreshToken = cookies.some((c) => c.startsWith('refreshToken='));
    expect(hasRefreshToken).toBe(true);
  });

  it('should reject login with wrong password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPasswordHere!',
      })
      .expect(401);
  });

  it('should rotate refresh token and issue new access token', async () => {
    // 1. Login to get initial cookies
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    const cookieHeader = loginRes.headers['set-cookie'];
    const refreshTokenCookie = cookieHeader.find((c) => c.startsWith('refreshToken='));
    const initialTokenVal = refreshTokenCookie.split(';')[0].split('=')[1];

    // 2. Call refresh endpoint with initial cookie
    const refreshRes1 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${initialTokenVal}`])
      .expect(200);

    expect(refreshRes1.body).toHaveProperty('token');
    const rotatedCookie = refreshRes1.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    const rotatedTokenVal = rotatedCookie.split(';')[0].split('=')[1];
    
    // Verify rotation occurred (values must differ)
    expect(rotatedTokenVal).not.toBe(initialTokenVal);

    // 3. Re-using initial token value MUST FAIL (since it was rotated/revoked)
    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${initialTokenVal}`])
      .expect(401);
  });

  it('should clear cookie and revoke session on logout', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    const cookieHeader = loginRes.headers['set-cookie'];
    const refreshTokenCookie = cookieHeader.find((c) => c.startsWith('refreshToken='));
    const tokenVal = refreshTokenCookie.split(';')[0].split('=')[1];

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`refreshToken=${tokenVal}`])
      .expect(200);

    // Try refreshing after logout - should fail
    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${tokenVal}`])
      .expect(401);
  });
});
