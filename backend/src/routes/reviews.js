const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');

// @desc    Get reviews for a product
// @route   GET /api/reviews/:productId
// @access  Public
router.get('/:productId', async (req, res) => {
  const productId = parseInt(req.params.productId);

  if (isNaN(productId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { productId, isHidden: false },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    console.error('Fetch reviews error:', error);
    res.status(500).json({ message: 'Server error loading reviews' });
  }
});

// @desc    Add review for a product (Verified Buyers only)
// @route   POST /api/reviews
// @access  Private
router.post('/', protect, async (req, res) => {
  const { productId, rating, comment } = req.body;
  const pId = parseInt(productId);
  const rate = parseInt(rating);

  if (isNaN(pId) || isNaN(rate) || rate < 1 || rate > 5) {
    return res.status(400).json({ message: 'Product ID and Rating (1-5) are required' });
  }

  try {
    // 1. Verify that user has purchased and received this product
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        userId: req.user.id,
        status: 'delivered',
        items: {
          some: { productId: pId },
        },
      },
      include: {
        items: true,
      },
    });

    if (!deliveredOrder) {
      return res.status(403).json({
        message: 'Only verified buyers who have received this product can write a review.',
      });
    }

    const orderItem = deliveredOrder.items.find((item) => item.productId === pId);

    // 2. Check if a review already exists for this order item / product
    const reviewExists = await prisma.review.findFirst({
      where: {
        userId: req.user.id,
        productId: pId,
      },
    });

    if (reviewExists) {
      return res.status(400).json({ message: 'You have already submitted a review for this product.' });
    }

    // 3. Create review
    const review = await prisma.review.create({
      data: {
        userId: req.user.id,
        productId: pId,
        orderItemId: orderItem.id,
        rating: rate,
        comment,
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error creating review' });
  }
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const id = parseInt(req.params.id);
  const { rating, comment } = req.body;
  const rate = parseInt(rating);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid review ID' });
  }

  try {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: 'Review not found or unauthorized' });
    }

    const dataToUpdate = {};
    if (!isNaN(rate) && rate >= 1 && rate <= 5) dataToUpdate.rating = rate;
    if (comment !== undefined) dataToUpdate.comment = comment;

    const updated = await prisma.review.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error updating review' });
  }
});

// @desc    Delete review (Admin or Review Owner only)
// @route   DELETE /api/reviews/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid review ID' });
  }

  try {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Authorization: Owner or Admin
    if (existing.userId !== req.user.id && req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await prisma.review.delete({ where: { id } });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error deleting review' });
  }
});

module.exports = router;
