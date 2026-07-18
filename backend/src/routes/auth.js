const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce_jwt_secret_key_2026_safe_and_secure';

// Helper: SHA-256 token hashing
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { message: 'Too many auth requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: Generate short-lived Access Token
const generateAccessToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '15m' });
};

// Helper: Generate, hash, and set a new rotated Refresh Token cookie
const generateAndSetRotatedRefreshToken = async (res, userId, oldTokenToRevoke = null) => {
  // Generate a random high-entropy token string
  const plainToken = crypto.randomBytes(40).toString('hex');
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  await prisma.$transaction(async (tx) => {
    // 1. Revoke the old token if provided (Rotation logic)
    if (oldTokenToRevoke) {
      const hashedOld = hashToken(oldTokenToRevoke);
      await tx.refreshToken.updateMany({
        where: { token: hashedOld },
        data: { revoked: true },
      });
    }

    // 2. Create the new hashed token record
    await tx.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });
  });

  // Set rotated token as HttpOnly secure cookie
  res.cookie('refreshToken', plainToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in prod, false in local dev HTTP
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

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

    // Query token record by SHA-255 hash
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: hashed },
      include: { user: { include: { role: true } } },
    });

    // Check invalid, revoked, or expired states
    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid, revoked, or expired refresh token' });
    }

    // ROTATION: generate a new refresh token, and revoke this old one
    await generateAndSetRotatedRefreshToken(res, dbToken.userId, refreshToken);
    
    // Issue a new access token
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
  });

  res.json({ message: 'Successfully logged out' });
});

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private (Invoked in users router, but we revoke refresh tokens there)
// (Kept in users.js for routing consistency, refresh tokens revocation checked on hashed tokens there)

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

// @desc    Password reset flow - simulate forgot email token
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
      return res.json({ message: 'If this email exists in our records, a reset link will be sent.' });
    }

    // Token expires in 1 hour
    const resetToken = jwt.sign({ userId: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`[Email Simulation] Reset password URL: http://localhost:3000/reset-password?token=${resetToken}`);

    res.json({
      message: 'If this email exists in our records, a reset link will be sent.',
      debugToken: resetToken,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error triggering password reset' });
  }
});

// @desc    Password reset flow - apply reset using token
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Please provide token and new password' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Double check that it's a reset token type
    if (decoded.type !== 'reset') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.$transaction(async (tx) => {
      // 1. Update password
      await tx.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword },
      });

      // 2. Revoke all refresh tokens for this user for security
      await tx.refreshToken.updateMany({
        where: { userId: decoded.userId },
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
router.hashToken = hashToken;
