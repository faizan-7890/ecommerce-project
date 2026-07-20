const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { assertPaymentConfigForEnvironment } = require('./src/config/payments');
const { assertJwtSecret } = require('./src/config/jwt');
const { prisma } = require('./src/config/db');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const productRoutes = require('./src/routes/products');
const categoryRoutes = require('./src/routes/categories');
const cartRoutes = require('./src/routes/cart');
const orderRoutes = require('./src/routes/orders');
const adminRoutes = require('./src/routes/admin');
const wishlistRoutes = require('./src/routes/wishlist');
const reviewRoutes = require('./src/routes/reviews');
const couponRoutes = require('./src/routes/coupons');
const paymentRoutes = require('./src/routes/payments');

// Fail fast in production if required config is missing/placeholder
try {
  assertPaymentConfigForEnvironment();
  assertJwtSecret();
} catch (err) {
  console.error(err.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  credentials: true,
}));

app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api/payments/webhook')) {
      req.rawBody = buf;
    }
  },
}));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: 'E-Commerce REST API is running...' });
});

// System Health Check — includes PostgreSQL connectivity
app.get('/api/health', async (req, res) => {
  const payload = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'up',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json(payload);
  } catch (err) {
    console.error('Health check DB failure:', err.message);
    res.status(503).json({
      ...payload,
      status: 'unhealthy',
      database: 'down',
      message: 'PostgreSQL is unavailable',
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payments', paymentRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found - ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
