const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const { protect } = require('../middleware/auth');

// Helper function to format cart response with calculated subtotals and variants
const getCartResponse = async (userId) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { images: true },
          },
          variant: true,
        },
      },
    },
  });

  // If user doesn't have a cart, create one
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
            variant: true,
          },
        },
      },
    });
  }

  let subtotal = 0;
  let totalItems = 0;

  const formattedItems = cart.items.map((item) => {
    // Determine unit price: variant price override, or fallback to product base price
    const basePrice = item.variant && item.variant.price !== null
      ? parseFloat(item.variant.price)
      : parseFloat(item.product.basePrice);

    const discountValue = parseFloat(item.product.discountPrice || 0); // Flat discount
    
    // final unit price is basePrice minus flat discount (capped at 0)
    let finalUnitPrice = basePrice - discountValue;
    if (finalUnitPrice < 0) finalUnitPrice = 0;

    const itemSubtotal = finalUnitPrice * item.quantity;
    subtotal += itemSubtotal;
    totalItems += item.quantity;

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      sku: item.variant ? item.variant.sku : item.product.slug,
      name: item.product.name,
      basePrice,
      discount: discountValue,
      finalUnitPrice: parseFloat(finalUnitPrice.toFixed(2)),
      quantity: item.quantity,
      stock: item.variant ? item.variant.stock : item.product.lowStockThreshold, // fallback stock
      size: item.variant ? item.variant.size : null,
      color: item.variant ? item.variant.color : null,
      image: item.product.images.length > 0 ? item.product.images[0].url : null,
      subtotal: parseFloat(itemSubtotal.toFixed(2)),
    };
  });

  return {
    id: cart.id,
    items: formattedItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalItems,
  };
};

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const cartData = await getCartResponse(req.user.id);
    res.json(cartData);
  } catch (error) {
    console.error('Fetch cart error:', error);
    res.status(500).json({ message: 'Server error fetching cart' });
  }
});

// @desc    Add item to cart (Supports variants)
// @route   POST /api/cart/items
// @access  Private
router.post('/items', protect, async (req, res) => {
  const { productId, variantId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'productId is required' });
  }

  const pId = parseInt(productId);
  const vId = variantId ? parseInt(variantId) : null;
  const qty = parseInt(quantity);

  if (isNaN(pId) || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Invalid productId or quantity' });
  }

  try {
    // 1. Load product and variants
    const product = await prisma.product.findUnique({
      where: { id: pId },
      include: { variants: true },
    });

    if (!product || product.status === 'disabled') {
      return res.status(404).json({ message: 'Product not found or unavailable' });
    }

    // Enforce variant selection if product has variants
    if (product.variants.length > 0 && !vId) {
      return res.status(400).json({
        message: 'Product has variants. Please select a size/color option.',
        code: 'VARIANT_REQUIRED',
      });
    }

    let availableStock = 0;

    // 2. Validate variant stock
    if (vId) {
      const variant = product.variants.find((v) => v.id === vId);
      if (!variant) {
        return res.status(400).json({ message: 'Invalid variant ID selected' });
      }
      availableStock = variant.stock;
    } else {
      // Products without variants check low stock settings or assume active stock
      availableStock = 99; // Mock stock count for base products
    }

    if (availableStock < qty) {
      return res.status(400).json({
        message: `Insufficient stock. Only ${availableStock} items available.`,
        code: 'OUT_OF_STOCK',
      });
    }

    // 3. Get or create user's cart
    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user.id } });
    }

    // 4. Upsert cart item based on cartId, productId, and variantId uniqueness
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId: pId,
          variantId: vId,
        },
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      if (availableStock < newQty) {
        return res.status(400).json({
          message: `Cannot add more. Exceeds total available stock of ${availableStock}.`,
          code: 'OUT_OF_STOCK',
        });
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: pId,
          variantId: vId,
          quantity: qty,
        },
      });
    }

    const cartData = await getCartResponse(req.user.id);
    res.status(200).json(cartData);
  } catch (error) {
    console.error('Add cart item error:', error);
    res.status(500).json({ message: 'Server error adding item to cart' });
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:id
// @access  Private
router.put('/items/:id', protect, async (req, res) => {
  const cartItemId = parseInt(req.params.id);
  const { quantity } = req.body;

  const qty = parseInt(quantity);
  if (isNaN(cartItemId) || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Invalid cart item ID or quantity' });
  }

  try {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        variant: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== req.user.id) {
      return res.status(404).json({ message: 'Cart item not found or unauthorized' });
    }

    const maxStock = cartItem.variant ? cartItem.variant.stock : 99;
    if (maxStock < qty) {
      return res.status(400).json({ message: `Insufficient stock. Only ${maxStock} items left.` });
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: qty },
    });

    const cartData = await getCartResponse(req.user.id);
    res.json(cartData);
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Server error updating cart item' });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:id
// @access  Private
router.delete('/items/:id', protect, async (req, res) => {
  const cartItemId = parseInt(req.params.id);

  if (isNaN(cartItemId)) {
    return res.status(400).json({ message: 'Invalid cart item ID' });
  }

  try {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== req.user.id) {
      return res.status(404).json({ message: 'Cart item not found or unauthorized' });
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });

    const cartData = await getCartResponse(req.user.id);
    res.json(cartData);
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ message: 'Server error deleting cart item' });
  }
});

module.exports = router;
