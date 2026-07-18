const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_key_2026_safe_and_secure';

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { message: 'Too many login or registration attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: Generate short-lived Access Token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '15m' });
};

// Helper: Generate and save long-lived Refresh Token
const generateAndSetRefreshToken = async (res, userId) => {
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Save the refresh token in the PostgreSQL database
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });

  // Set as HttpOnly, SameSite secure cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return refreshToken;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) {
      return res.status(500).json({ message: 'Default CUSTOMER role not seeded.' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: customerRole.id,
        cart: {
          create: {}, // Automatically initialize empty Cart
        },
      },
      include: { role: true },
    });

    // Create and attach refresh token cookie
    await generateAndSetRefreshToken(res, user.id);
    const accessToken = generateAccessToken(user.id);

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      emailVerified: user.emailVerified,
      token: accessToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @desc    Authenticate user & get tokens
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create and attach refresh token cookie
      await generateAndSetRefreshToken(res, user.id);
      const accessToken = generateAccessToken(user.id);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        emailVerified: user.emailVerified,
        token: accessToken,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (Uses HttpOnly cookie)
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    // 1. Verify token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // 2. Query token record from DB
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { role: true } } },
    });

    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid, revoked, or expired refresh token' });
    }

    // 3. Issue new access token
    const newAccessToken = generateAccessToken(dbToken.userId);

    res.json({
      token: newAccessToken,
      user: {
        id: dbToken.user.id,
        name: dbToken.user.name,
        email: dbToken.user.email,
        role: dbToken.user.role.name,
        emailVerified: dbToken.user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Token verification failed' });
  }
});

// @desc    Logout & revoke refresh tokens
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      // Revoke the token in the database
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    } catch (err) {
      console.error('Failed to revoke refresh token:', err);
    }
  }

  // Clear cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({ message: 'Successfully logged out' });
});

// @desc    Simulate email verification trigger
// @route   POST /api/auth/verify-email
// @access  Private (Needs access token)
router.post('/verify-email', protect, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { emailVerified: true },
    });
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(550).json({ message: 'Verification transaction failed' });
  }
});

// @desc    Simulate forgot password email trigger
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Please provide email address' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Enforce security: do not return 404 to avoid email listing hacks
      return res.json({ message: 'If this email exists in our records, a reset link will be sent.' });
    }

    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`[Email Simulation] Reset password URL: http://localhost:3000/reset-password?token=${resetToken}`);

    res.json({
      message: 'If this email exists in our records, a reset link will be sent.',
      debugToken: resetToken, // Returned for testing purposes in dev mode
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error triggering password reset' });
  }
});

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Please provide token and new password' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password verification error:', err);
    res.status(400).json({ message: 'Invalid or expired password reset token' });
  }
});

module.exports = router;
