import express from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Coupon } from '../models/Coupon.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { trackEvent } from '../middleware/analytics.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/payment.js';
import { sendOrderConfirmation } from '../services/email.js';
import { env } from '../config/env.js';

const router = express.Router();

// Create order
const createOrderSchema = z.object({
  body: z.object({
    shippingAddress: z.object({
      fullName: z.string(),
      phone: z.string(),
      addressLine1: z.string(),
      addressLine2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
    }),
    billingAddress: z
      .object({
        fullName: z.string(),
        phone: z.string(),
        addressLine1: z.string(),
        addressLine2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        postalCode: z.string(),
        country: z.string(),
      })
      .optional(),
    paymentMethod: z.enum(['razorpay', 'stripe', 'cod']),
    notes: z.string().optional(),
  }),
});

router.post('/', requireAuth, validate(createOrderSchema), async (req, res, next) => {
  try {
    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;

    // Get cart
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock and prepare order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.productId;

      if (!product || !product.isActive) {
        return res.status(400).json({ error: `Product ${product?.title} is no longer available` });
      }

      // Check stock
      let availableStock = product.stock;
      if (item.variantSku && product.variants.length > 0) {
        const variant = product.variants.find(v => v.sku === item.variantSku);
        if (!variant) {
          return res.status(400).json({ error: `Variant not found for ${product.title}` });
        }
        availableStock = variant.stock;
      }

      if (availableStock < item.quantity) {
        return res
          .status(400)
          .json({ error: `Insufficient stock for ${product.title}. Available: ${availableStock}` });
      }

      orderItems.push({
        productId: product._id,
        sku: item.variantSku,
        title: product.title,
        image: product.images[0]?.url,
        price: item.priceAtAdd,
        quantity: item.quantity,
        subtotal: item.priceAtAdd * item.quantity,
      });
    }

    // Create order
    const order = new Order({
      userId: req.user._id,
      items: orderItems,
      subtotal: cart.totals.subtotal,
      discount: cart.totals.discount,
      couponCode: cart.appliedCoupon?.code,
      tax: cart.totals.tax,
      shipping: cart.totals.shipping,
      total: cart.totals.total,
      paymentMethod,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      customerEmail: req.user.email,
      customerPhone: shippingAddress.phone,
      timeline: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Order created',
        },
      ],
      notes,
    });

    // Handle payment method
    if (paymentMethod === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder(
        order.total,
        'INR',
        `order_${order._id}`
      );
      order.razorpayOrderId = razorpayOrder.id;
    } else if (paymentMethod === 'cod') {
      order.status = 'confirmed';
      order.timeline.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: 'Cash on Delivery order confirmed',
      });
    }

    await order.save();

    // Update product stock
    for (const item of cart.items) {
      if (item.variantSku) {
        await Product.updateOne(
          { _id: item.productId._id, 'variants.sku': item.variantSku },
          { $inc: { 'variants.$.stock': -item.quantity } }
        );
      } else {
        await Product.updateOne({ _id: item.productId._id }, { $inc: { stock: -item.quantity } });
      }
    }

    // Update coupon usage
    if (cart.appliedCoupon?.code) {
      await Coupon.updateOne({ code: cart.appliedCoupon.code }, { $inc: { usageCount: 1 } });
    }

    // Clear cart
    await Cart.findOneAndDelete({ userId: req.user._id });

    // Track purchase event
    await trackEvent('purchase', req, {
      orderId: order._id,
      total: order.total,
      items: order.items.length,
    });

    // Send confirmation email (non-blocking)
    if (paymentMethod === 'cod') {
      setImmediate(() => {
        sendOrderConfirmation(order, req.user).catch(err =>
          console.error('Email send error:', err)
        );
      });
    }

    res.status(201).json({
      order,
      message: 'Order created successfully',
      ...(paymentMethod === 'razorpay' && {
        razorpayOrderId: order.razorpayOrderId,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
      }),
    });
  } catch (error) {
    next(error);
  }
});

// Verify Razorpay payment
const verifyPaymentSchema = z.object({
  body: z.object({
    orderId: z.string(),
    razorpayOrderId: z.string(),
    razorpayPaymentId: z.string(),
    razorpaySignature: z.string(),
  }),
});

router.post('/verify-payment', requireAuth, validate(verifyPaymentSchema), async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify signature
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
      order.paymentStatus = 'failed';
      order.timeline.push({
        status: 'failed',
        timestamp: new Date(),
        note: 'Payment verification failed',
      });
      await order.save();

      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Update order
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.timeline.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment verified and order confirmed',
    });

    await order.save();

    // Send confirmation email
    setImmediate(() => {
      sendOrderConfirmation(order, req.user).catch(err => console.error('Email send error:', err));
    });

    res.json({ order, message: 'Payment verified successfully' });
  } catch (error) {
    next(error);
  }
});

// Get user orders
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Order.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

export default router;
