const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');

// @desc    Validate a coupon code
// @route   POST /api/coupons/validate
// @access  Private
router.post('/validate', protect, async (req, res) => {
  const { code, subtotal } = req.body;
  const cartSubtotal = parseFloat(subtotal || 0);

  if (!code || isNaN(cartSubtotal)) {
    return res.status(400).json({ message: 'Please provide coupon code and cart subtotal' });
  }

  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive coupon code' });
    }

    // 1. Expiration check
    if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    // 2. Minimum order amount check
    const minAmount = parseFloat(coupon.minOrderAmount);
    if (cartSubtotal < minAmount) {
      return res.status(400).json({
        message: `Minimum order amount of $${minAmount.toFixed(2)} required to use this coupon`,
      });
    }

    // 3. Usage limit check
    if (coupon.usageLimit !== null) {
      const usagesCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id },
      });
      if (usagesCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'This coupon usage limit has been exceeded' });
      }
    }

    // 4. Calculate discount
    let discountAmount = 0;
    const value = parseFloat(coupon.discountValue);
    if (coupon.discountType === 'percentage') {
      discountAmount = cartSubtotal * (value / 100);
    } else {
      discountAmount = value;
    }

    // Caps discount at subtotal
    if (discountAmount > cartSubtotal) {
      discountAmount = cartSubtotal;
    }

    res.json({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: value,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ message: 'Server error validating coupon' });
  }
});

// ==========================================
// Admin Coupon Management Routes
// ==========================================

// @desc    Get all coupons (Admin only)
// @route   GET /api/coupons/admin
// @access  Private/Admin
router.get('/admin', protect, isAdmin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        _count: {
          select: { usages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: 'Server error loading coupons list' });
  }
});

// @desc    Create new coupon (Admin only)
// @route   POST /api/coupons/admin
// @access  Private/Admin
router.post('/admin', protect, isAdmin, async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount = 0.00,
    usageLimit,
    expirationDate,
    isActive = true,
  } = req.body;

  if (!code || !discountType || discountValue === undefined) {
    return res.status(400).json({ message: 'Code, discountType, and discountValue are required' });
  }

  const validTypes = ['percentage', 'fixed'];
  if (!validTypes.includes(discountType)) {
    return res.status(400).json({ message: 'discountType must be either percentage or fixed' });
  }

  try {
    const couponExists = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (couponExists) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderAmount: parseFloat(minOrderAmount),
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        isActive,
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ message: 'Server error creating coupon' });
  }
});

// @desc    Update coupon (Admin only)
// @route   PUT /api/coupons/admin/:id
// @access  Private/Admin
router.put('/admin/:id', protect, isAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    code,
    discountType,
    discountValue,
    minOrderAmount,
    usageLimit,
    expirationDate,
    isActive,
  } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid coupon ID' });
  }

  try {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const dataToUpdate = {};
    if (code) {
      const codeUpper = code.toUpperCase();
      if (codeUpper !== existing.code) {
        const codeExists = await prisma.coupon.findUnique({ where: { code: codeUpper } });
        if (codeExists) return res.status(400).json({ message: 'Coupon code already in use' });
      }
      dataToUpdate.code = codeUpper;
    }

    if (discountType) {
      if (!['percentage', 'fixed'].includes(discountType)) {
        return res.status(400).json({ message: 'discountType must be either percentage or fixed' });
      }
      dataToUpdate.discountType = discountType;
    }

    if (discountValue !== undefined) dataToUpdate.discountValue = parseFloat(discountValue);
    if (minOrderAmount !== undefined) dataToUpdate.minOrderAmount = parseFloat(minOrderAmount);
    if (usageLimit !== undefined) dataToUpdate.usageLimit = usageLimit ? parseInt(usageLimit) : null;
    if (expirationDate !== undefined) dataToUpdate.expirationDate = expirationDate ? new Date(expirationDate) : null;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;

    const updated = await prisma.coupon.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ message: 'Server error updating coupon' });
  }
});

// @desc    Delete coupon (Admin only)
// @route   DELETE /api/coupons/admin/:id
// @access  Private/Admin
router.delete('/admin/:id', protect, isAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid coupon ID' });
  }

  try {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    await prisma.coupon.delete({ where: { id } });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ message: 'Server error deleting coupon' });
  }
});

module.exports = router;
