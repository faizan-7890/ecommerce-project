const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');

// @desc    Get all products (with search, filter, sorting, pagination)
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  const {
    search,
    categoryId,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filters
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = parseInt(categoryId);
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  // Build sorting
  const orderBy = {};
  if (sortBy === 'price') {
    orderBy.price = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = sortOrder === 'asc' ? 'asc' : 'desc';
  }

  try {
    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        images: true,
        category: true,
      },
    });

    const total = await prisma.product.count({ where });

    res.json({
      products,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      totalProducts: total,
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// @desc    Get product details by ID
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Fetch product details error:', error);
    res.status(500).json({ message: 'Server error fetching product details' });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, isAdmin, async (req, res) => {
  const { name, description, price, discount, stock, categoryId, images } = req.body;

  if (!name || !description || price === undefined || categoryId === undefined) {
    return res.status(400).json({ message: 'Please provide name, description, price and categoryId' });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });

    if (!category) {
      return res.status(400).json({ message: 'Invalid categoryId' });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        discount: discount ? parseFloat(discount) : 0.00,
        stock: stock ? parseInt(stock) : 0,
        categoryId: parseInt(categoryId),
        images: images && Array.isArray(images)
          ? { create: images.map((url) => ({ url })) }
          : undefined,
      },
      include: {
        images: true,
        category: true,
      },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, isAdmin, async (req, res) => {
  const { name, description, price, discount, stock, categoryId, images } = req.body;
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (description) dataToUpdate.description = description;
    if (price !== undefined) dataToUpdate.price = parseFloat(price);
    if (discount !== undefined) dataToUpdate.discount = parseFloat(discount);
    if (stock !== undefined) dataToUpdate.stock = parseInt(stock);
    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });
      if (!category) {
        return res.status(400).json({ message: 'Invalid categoryId' });
      }
      dataToUpdate.categoryId = parseInt(categoryId);
    }

    // Process image updates if passed
    if (images && Array.isArray(images)) {
      // Clear old images
      await prisma.productImage.deleteMany({ where: { productId: id } });
      dataToUpdate.images = {
        create: images.map((url) => ({ url })),
      };
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: {
        images: true,
        category: true,
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

module.exports = router;
