const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');

// @desc    Get user wishlist items
// @route   GET /api/wishlist
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            images: true,
            variants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(wishlist);
  } catch (error) {
    console.error('Fetch wishlist error:', error);
    res.status(500).json({ message: 'Server error loading wishlist' });
  }
});

// @desc    Add product to wishlist
// @route   POST /api/wishlist/:productId
// @access  Private
router.post('/:productId', protect, async (req, res) => {
  const productId = parseInt(req.params.productId);

  if (isNaN(productId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status === 'disabled') {
      return res.status(404).json({ message: 'Product not found or unavailable' });
    }

    // Check if already in wishlist
    const exists = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId,
        },
      },
    });

    if (exists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    const item = await prisma.wishlistItem.create({
      data: {
        userId: req.user.id,
        productId,
      },
      include: {
        product: true,
      },
    });

    res.status(201).json({ message: 'Added to wishlist', item });
  } catch (error) {
    console.error('Add wishlist error:', error);
    res.status(500).json({ message: 'Server error adding to wishlist' });
  }
});

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
  const productId = parseInt(req.params.productId);

  if (isNaN(productId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const exists = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId,
        },
      },
    });

    if (!exists) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    await prisma.wishlistItem.delete({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId,
        },
      },
    });

    res.json({ message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Delete wishlist error:', error);
    res.status(500).json({ message: 'Server error removing from wishlist' });
  }
});

module.exports = router;
