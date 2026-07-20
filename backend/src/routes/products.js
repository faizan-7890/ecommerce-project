const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect, isAdmin } = require('../middleware/auth');

// Helper: Slugify product name
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
};

// @desc    Get all products (with search, category, pricing filters, variants, sorting, pagination)
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
    limit = 12,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    status: 'active', // Enforce active status for public listings
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = parseInt(categoryId);
  }

  if (minPrice || maxPrice) {
    where.basePrice = {};
    if (minPrice) where.basePrice.gte = parseFloat(minPrice);
    if (maxPrice) where.basePrice.lte = parseFloat(maxPrice);
  }

  const orderBy = {};
  if (sortBy === 'price') {
    orderBy.basePrice = sortOrder === 'asc' ? 'asc' : 'desc';
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
        variants: true,
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

// @desc    Get product details by ID or Slug
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  const param = req.params.id;
  const id = parseInt(param);

  try {
    let product;
    if (isNaN(id)) {
      // Find by Slug
      product = await prisma.product.findUnique({
        where: { slug: param },
        include: { images: true, category: true, variants: true },
      });
    } else {
      // Find by ID
      product = await prisma.product.findUnique({
        where: { id },
        include: { images: true, category: true, variants: true },
      });
    }

    if (!product || product.status !== 'active') {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Fetch product details error:', error);
    res.status(500).json({ message: 'Server error fetching product details' });
  }
});

// @desc    Create a product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, isAdmin, async (req, res) => {
  const {
    name,
    description,
    brand,
    basePrice,
    discountPrice = 0.00,
    categoryId,
    lowStockThreshold = 5,
    weight,
    dimensions,
    images,
    variants,
  } = req.body;

  if (!name || !description || basePrice === undefined || categoryId === undefined) {
    return res.status(400).json({ message: 'Please provide name, description, basePrice and categoryId' });
  }

  try {
    const slug = slugify(name);
    // Enforce unique slug
    const slugExists = await prisma.product.findUnique({ where: { slug } });
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    const newProduct = await prisma.product.create({
      data: {
        name,
        slug: finalSlug,
        description,
        brand: brand || 'Generic',
        basePrice: parseFloat(basePrice),
        discountPrice: parseFloat(discountPrice),
        categoryId: parseInt(categoryId),
        lowStockThreshold: parseInt(lowStockThreshold),
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        status: 'active',
        images: images && Array.isArray(images)
          ? { create: images.map((url) => ({ url })) }
          : undefined,
        variants: variants && Array.isArray(variants)
          ? { create: variants.map((v) => ({
              sku: v.sku,
              price: v.price ? parseFloat(v.price) : null,
              stock: parseInt(v.stock || 0),
              size: v.size || null,
              color: v.color || null,
              material: v.material || null,
            })) }
          : undefined,
      },
      include: {
        images: true,
        category: true,
        variants: true,
      },
    });

    // Write initial inventory logs for created variants
    if (newProduct.variants && newProduct.variants.length > 0) {
      for (const variant of newProduct.variants) {
        await prisma.inventoryLog.create({
          data: {
            productId: newProduct.id,
            variantId: variant.id,
            previousQuantity: 0,
            newQuantity: variant.stock,
            changeAmount: variant.stock,
            reason: 'manual_adjustment',
            updatedBy: `admin_${req.user.id}`,
          },
        });
      }
    }

    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
});

// @desc    Update a product properties (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, isAdmin, async (req, res) => {
  const {
    name,
    description,
    brand,
    basePrice,
    discountPrice,
    categoryId,
    lowStockThreshold,
    weight,
    dimensions,
    status,
  } = req.body;
  
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
    if (name) {
      dataToUpdate.name = name;
      dataToUpdate.slug = slugify(name);
    }
    if (description) dataToUpdate.description = description;
    if (brand) dataToUpdate.brand = brand;
    if (basePrice !== undefined) dataToUpdate.basePrice = parseFloat(basePrice);
    if (discountPrice !== undefined) dataToUpdate.discountPrice = parseFloat(discountPrice);
    if (categoryId !== undefined) dataToUpdate.categoryId = parseInt(categoryId);
    if (lowStockThreshold !== undefined) dataToUpdate.lowStockThreshold = parseInt(lowStockThreshold);
    if (weight !== undefined) dataToUpdate.weight = parseFloat(weight);
    if (dimensions !== undefined) dataToUpdate.dimensions = dimensions;
    if (status) dataToUpdate.status = status;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: { images: true, category: true, variants: true },
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// @desc    Soft Delete / Disable a product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, isAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }

  try {
    // Standard Soft Deletion: update status to "disabled" to preserve historical checkout records
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'disabled' },
    });

    res.json({ message: 'Product successfully disabled', product });
  } catch (error) {
    console.error('Disable product error:', error);
    res.status(500).json({ message: 'Server error disabling product' });
  }
});

// ==========================================
// 3. Product Variant Sub-routes
// ==========================================

// @desc    Add product variant
// @route   POST /api/products/:id/variants
// @access  Private/Admin
router.post('/:id/variants', protect, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  const { sku, price, stock = 0, size, color, material } = req.body;

  if (isNaN(productId) || !sku) {
    return res.status(400).json({ message: 'Product ID and SKU are required' });
  }

  try {
    const skuExists = await prisma.productVariant.findUnique({ where: { sku } });
    if (skuExists) {
      return res.status(400).json({ message: 'SKU code already exists' });
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku,
        price: price ? parseFloat(price) : null,
        stock: parseInt(stock),
        size: size || null,
        color: color || null,
        material: material || null,
      },
    });

    // Write inventory log
    await prisma.inventoryLog.create({
      data: {
        productId,
        variantId: variant.id,
        previousQuantity: 0,
        newQuantity: variant.stock,
        changeAmount: variant.stock,
        reason: 'manual_adjustment',
        updatedBy: `admin_${req.user.id}`,
      },
    });

    res.status(201).json(variant);
  } catch (error) {
    console.error('Create variant error:', error);
    res.status(500).json({ message: 'Server error creating product variant' });
  }
});

// @desc    Update product variant
// @route   PUT /api/products/:id/variants/:variantId
// @access  Private/Admin
router.put('/:id/variants/:variantId', protect, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  const variantId = parseInt(req.params.variantId);
  const { sku, price, stock, size, color, material } = req.body;

  if (isNaN(productId) || isNaN(variantId)) {
    return res.status(400).json({ message: 'Invalid identifiers' });
  }

  try {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing || existing.productId !== productId) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    const dataToUpdate = {};
    if (sku) {
      if (sku !== existing.sku) {
        const skuExists = await prisma.productVariant.findUnique({ where: { sku } });
        if (skuExists) return res.status(400).json({ message: 'SKU already in use' });
      }
      dataToUpdate.sku = sku;
    }
    if (price !== undefined) dataToUpdate.price = price ? parseFloat(price) : null;
    if (size !== undefined) dataToUpdate.size = size;
    if (color !== undefined) dataToUpdate.color = color;
    if (material !== undefined) dataToUpdate.material = material;

    if (stock !== undefined) {
      const parsedStock = parseInt(stock);
      if (parsedStock !== existing.stock) {
        dataToUpdate.stock = parsedStock;

        // Log stock adjustment
        await prisma.inventoryLog.create({
          data: {
            productId,
            variantId,
            previousQuantity: existing.stock,
            newQuantity: parsedStock,
            changeAmount: parsedStock - existing.stock,
            reason: 'manual_adjustment',
            updatedBy: `admin_${req.user.id}`,
          },
        });
      }
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: dataToUpdate,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update variant error:', error);
    res.status(500).json({ message: 'Server error updating variant' });
  }
});

// @desc    Delete product variant
// @route   DELETE /api/products/:id/variants/:variantId
// @access  Private/Admin
router.delete('/:id/variants/:variantId', protect, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  const variantId = parseInt(req.params.variantId);

  if (isNaN(productId) || isNaN(variantId)) {
    return res.status(400).json({ message: 'Invalid identifiers' });
  }

  try {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing || existing.productId !== productId) {
      return res.status(404).json({ message: 'Variant not found' });
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
    res.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    console.error('Delete variant error:', error);
    res.status(500).json({ message: 'Server error deleting variant' });
  }
});

// ==========================================
// 4. Product Image Sub-routes
// ==========================================

// @desc    Add product image url
// @route   POST /api/products/:id/images
// @access  Private/Admin
router.post('/:id/images', protect, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  const { url } = req.body;

  if (isNaN(productId) || !url) {
    return res.status(400).json({ message: 'Product ID and Image URL are required' });
  }

  try {
    const image = await prisma.productImage.create({
      data: { productId, url },
    });
    res.status(201).json(image);
  } catch (error) {
    console.error('Create image error:', error);
    res.status(500).json({ message: 'Server error creating product image' });
  }
});

// @desc    Delete product image
// @route   DELETE /api/products/:id/images/:imageId
// @access  Private/Admin
router.delete('/:id/images/:imageId', protect, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  const imageId = parseInt(req.params.imageId);

  if (isNaN(productId) || isNaN(imageId)) {
    return res.status(400).json({ message: 'Invalid identifiers' });
  }

  try {
    const existing = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!existing || existing.productId !== productId) {
      return res.status(404).json({ message: 'Image not found' });
    }

    await prisma.productImage.delete({ where: { id: imageId } });
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Server error deleting image' });
  }
});

module.exports = router;
