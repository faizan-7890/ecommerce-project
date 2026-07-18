const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

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

const app = express();

// Configure Middleware
app.use(cors({
  origin: '*', // For development purposes. Can be adjusted for production.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Main Root Route
app.get('/', (req, res) => {
  res.json({ message: 'E-Commerce REST API is running...' });
});

// System Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Register API Routes
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

// Page Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found - ${req.originalUrl}` });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack || err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
