const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');

// ==========================================
// 1. User Profile Operations
// ==========================================

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role.name,
    emailVerified: req.user.emailVerified,
  });
});

// @desc    Update user profile details
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  const { name, email } = req.body;

  try {
    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (email) {
      if (email !== req.user.email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) {
          return res.status(400).json({ message: 'Email address already in use' });
        }
      }
      dataToUpdate.email = email;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
      include: { role: true },
    });

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role.name,
      emailVerified: updatedUser.emailVerified,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
router.put('/password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide current and new passwords' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    // Validate current password
    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    });

    // Revoke all refresh tokens on password change for security
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id },
      data: { revoked: true },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error updating password' });
  }
});

// ==========================================
// 2. Address Book Operations
// ==========================================

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
router.get('/addresses', protect, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
    });
    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Server error loading addresses' });
  }
});

// @desc    Add shipping/billing address
// @route   POST /api/users/addresses
// @access  Private
router.post('/addresses', protect, async (req, res) => {
  const {
    fullName,
    phoneNumber,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    addressType = 'shipping',
    isDefault = false,
  } = req.body;

  // Basic required fields validation
  if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !postalCode || !country) {
    return res.status(400).json({ message: 'Please provide all required address fields' });
  }

  try {
    // If setting as default, clear defaults on existing address cards
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    // Check if this is the user's first address; if so, make it the default regardless
    const addressCount = await prisma.address.count({ where: { userId: req.user.id } });
    const shouldBeDefault = addressCount === 0 ? true : isDefault;

    const address = await prisma.address.create({
      data: {
        userId: req.user.id,
        fullName,
        phoneNumber,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        addressType,
        isDefault: shouldBeDefault,
      },
    });

    res.status(201).json(address);
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ message: 'Server error saving address' });
  }
});

// @desc    Update address card
// @route   PUT /api/users/addresses/:id
// @access  Private
router.put('/addresses/:id', protect, async (req, res) => {
  const id = parseInt(req.params.id);
  const {
    fullName,
    phoneNumber,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    addressType,
    isDefault,
  } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid address ID' });
  }

  try {
    const existingAddress = await prisma.address.findUnique({ where: { id } });
    if (!existingAddress || existingAddress.userId !== req.user.id) {
      return res.status(404).json({ message: 'Address not found or unauthorized' });
    }

    // Set other cards to isDefault: false if updating to isDefault: true
    if (isDefault === true && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const dataToUpdate = {};
    if (fullName) dataToUpdate.fullName = fullName;
    if (phoneNumber) dataToUpdate.phoneNumber = phoneNumber;
    if (addressLine1) dataToUpdate.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) dataToUpdate.addressLine2 = addressLine2;
    if (city) dataToUpdate.city = city;
    if (state) dataToUpdate.state = state;
    if (postalCode) dataToUpdate.postalCode = postalCode;
    if (country) dataToUpdate.country = country;
    if (addressType) dataToUpdate.addressType = addressType;
    if (isDefault !== undefined) dataToUpdate.isDefault = isDefault;

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json(updatedAddress);
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Server error updating address' });
  }
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
router.delete('/addresses/:id', protect, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid address ID' });
  }

  try {
    const existingAddress = await prisma.address.findUnique({ where: { id } });
    if (!existingAddress || existingAddress.userId !== req.user.id) {
      return res.status(404).json({ message: 'Address not found or unauthorized' });
    }

    await prisma.address.delete({ where: { id } });

    // If we deleted the default address, promote the remaining first address as default
    if (existingAddress.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId: req.user.id },
      });
      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error deleting address' });
  }
});

module.exports = router;
