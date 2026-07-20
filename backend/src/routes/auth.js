const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');
const { hashToken } = require('../utils/crypto');

const { JWT_SECRET } = require('../config/jwt');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PUBLIC_RESET_MESSAGE =
  'If this email exists in our records, a reset link will be sent.';

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many auth requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for password-reset endpoints
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many password reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateAccessToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '15m' });
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  // Set COOKIE_DOMAIN in multi-subdomain deployments, e.g. ".veloce.example"
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
});

const generateAndSetRotatedRefreshToken = async (res, userId, oldTokenToRevoke = null) => {
  const plainToken = crypto.randomBytes(40).toString('hex');
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.$transaction(async (tx) => {
    if (oldTokenToRevoke) {
      const hashedOld = hashToken(oldTokenToRevoke);
      await tx.refreshToken.updateMany({
        where: { token: hashedOld },
        data: { revoked: true },
      });
    }

    await tx.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });
  });

  res.cookie('refreshToken', plainToken, cookieOptions());
  return plainToken;
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
      return res.status(500).json({ message: 'Default role not seeded.' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: customerRole.id,
        cart: {
          create: {},
        },
      },
      include: { role: true },
    });

    await generateAndSetRotatedRefreshToken(res, user.id);
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
      await generateAndSetRotatedRefreshToken(res, user.id);
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

// @desc    Refresh access token & ROTATE refresh token
// @route   POST /api/auth/refresh
// @access  Public (Uses HttpOnly cookie)
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const hashed = hashToken(refreshToken);

    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: hashed },
      include: { user: { include: { role: true } } },
    });

    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid, revoked, or expired refresh token' });
    }

    await generateAndSetRotatedRefreshToken(res, dbToken.userId, refreshToken);
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
    res.status(401).json({ message: 'Session expired or invalid' });
  }
});

// @desc    Logout & revoke refresh tokens
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const hashed = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { token: hashed },
        data: { revoked: true },
      });
    } catch (err) {
      console.error('Failed to revoke refresh token:', err);
    }
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });

  res.json({ message: 'Successfully logged out' });
});

// @desc    Simulate email verification trigger
// @route   POST /api/auth/verify-email
// @access  Private
router.post('/verify-email', protect, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { emailVerified: true },
    });
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ message: 'Verification transaction failed' });
  }
});

// @desc    Request password reset — always same public message; stores hashed one-time token
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Please provide email address' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return the same message for known and unknown emails
    if (user) {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(plainToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate prior unused tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Simulate email delivery (never return the token in the API response)
      console.log(
        `[Email Simulation] Reset password URL: ${FRONTEND_URL}/reset-password?token=${plainToken}`
      );
    }

    res.json({ message: PUBLIC_RESET_MESSAGE });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error triggering password reset' });
  }
});

// @desc    Apply password reset using one-time hashed DB token
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Please provide token and new password' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const tokenHash = hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    if (resetRecord.usedAt) {
      return res.status(400).json({ message: 'This password reset token has already been used' });
    }

    if (resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Revoke all refresh sessions after password reset
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId },
        data: { revoked: true },
      });
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password verification error:', err);
    res.status(400).json({ message: 'Invalid or expired password reset token' });
  }
});

module.exports = router;
