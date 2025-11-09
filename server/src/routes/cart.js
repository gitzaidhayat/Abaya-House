import express from 'express';
import { z } from 'zod';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';

const router = express.Router();

// Calculate cart totals
const calculateTotals = (items, discount = 0) => {
  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
  const tax = subtotal * env.TAX_RATE;
  const shipping = subtotal > 500 ? 0 : env.SHIPPING_FLAT_RATE; // Free shipping over ₹500
  const total = subtotal - discount + tax + shipping;

  return { subtotal, discount, tax, shipping, total };
};

// Get cart
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId').lean();

    if (!cart) {
      cart = { items: [], totals: { subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 } };
    }

    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// Add item to cart
const addItemSchema = z.object({
  body: z.object({
    productId: z.string(),
    variantSku: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
  }),
});

router.post('/items', requireAuth, validate(addItemSchema), async (req, res, next) => {
  try {
    const { productId, variantSku, quantity } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check stock
    let availableStock = product.stock;
    let price = product.price;

    if (variantSku && product.variants.length > 0) {
      const variant = product.variants.find(v => v.sku === variantSku);
      if (!variant) {
        return res.status(404).json({ error: 'Variant not found' });
      }
      availableStock = variant.stock;
      price += variant.priceDelta;
    }

    if (availableStock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      item =>
        item.productId.toString() === productId &&
        (variantSku ? item.variantSku === variantSku : !item.variantSku)
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        productId,
        variantSku,
        quantity,
        priceAtAdd: price,
      });
    }

    // Recalculate totals
    cart.totals = calculateTotals(cart.items, cart.appliedCoupon?.discount || 0);

    await cart.save();
    await cart.populate('items.productId');

    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// Update item quantity
const updateItemSchema = z.object({
  params: z.object({
    itemId: z.string(),
  }),
  body: z.object({
    quantity: z.number().int().min(0),
  }),
});

router.patch('/items/:itemId', requireAuth, validate(updateItemSchema), async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (quantity === 0) {
      // Remove item
      cart.items.pull(itemId);
    } else {
      // Update quantity
      item.quantity = quantity;
    }

    // Recalculate totals
    cart.totals = calculateTotals(cart.items, cart.appliedCoupon?.discount || 0);

    await cart.save();
    await cart.populate('items.productId');

    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// Remove item
router.delete('/items/:itemId', requireAuth, async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items.pull(itemId);

    // Recalculate totals
    cart.totals = calculateTotals(cart.items, cart.appliedCoupon?.discount || 0);

    await cart.save();
    await cart.populate('items.productId');

    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// Apply coupon
const applyCouponSchema = z.object({
  body: z.object({
    code: z.string(),
  }),
});

router.post('/coupon', requireAuth, validate(applyCouponSchema), async (req, res, next) => {
  try {
    const { code } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Find and validate coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      active: true,
      startsAt: { $lte: new Date() },
      endsAt: { $gte: new Date() },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon' });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

    // Check minimum order
    if (subtotal < coupon.minOrder) {
      return res
        .status(400)
        .json({ error: `Minimum order of ₹${coupon.minOrder} required for this coupon` });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.value;
    }

    // Apply coupon
    cart.appliedCoupon = {
      code: coupon.code,
      discount,
    };

    // Recalculate totals
    cart.totals = calculateTotals(cart.items, discount);

    await cart.save();
    await cart.populate('items.productId');

    res.json({ cart, message: 'Coupon applied successfully' });
  } catch (error) {
    next(error);
  }
});

// Remove coupon
router.delete('/coupon', requireAuth, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.appliedCoupon = undefined;
    cart.totals = calculateTotals(cart.items, 0);

    await cart.save();
    await cart.populate('items.productId');

    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

// Clear cart
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    await Cart.findOneAndDelete({ userId: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
});

export default router;
