const request = require('supertest');
const app = require('../server');
const { prisma } = require('../src/config/db');

describe('System Health Check API', () => {
  afterAll(async () => {
    // Disconnect Prisma Client pools to prevent hanging connections
    await prisma.$disconnect();
  });

  it('should return 200 and a healthy status report', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});
