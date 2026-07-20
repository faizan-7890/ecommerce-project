const request = require('supertest');
const app = require('../server');
const { prisma } = require('../src/config/db');
const { hashToken } = require('../src/utils/crypto');
const bcrypt = require('bcryptjs');

describe('Password Reset Lifecycle', () => {
  const email = 'reset-user@test.com';
  const password = 'OriginalPass123!';
  let userId;

  beforeAll(async () => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: existing.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
      await prisma.cart.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: 'Reset User',
        email,
        password: hashed,
        roleId: customerRole.id,
        cart: { create: {} },
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.cart.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('returns the same public message for unknown emails (no debug token)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'does-not-exist@example.com' })
      .expect(200);

    expect(res.body.message).toMatch(/If this email exists/i);
    expect(res.body.debugToken).toBeUndefined();
  });

  it('returns the same public message for known emails without debug token', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(200);

    expect(res.body.message).toMatch(/If this email exists/i);
    expect(res.body.debugToken).toBeUndefined();

    const tokens = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('rejects expired reset tokens', async () => {
    const plain = 'expired-token-value-for-test-123456';
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'NewPassword99!' })
      .expect(400);
  });

  it('resets password once and rejects reuse', async () => {
    const plain = 'valid-reset-token-once-only-abcdef';
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(plain),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'BrandNewPass99!' })
      .expect(200);

    // Login with new password
    await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'BrandNewPass99!' })
      .expect(200);

    // Reuse token fails
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: plain, password: 'AnotherPass99!' })
      .expect(400);
  });
});
