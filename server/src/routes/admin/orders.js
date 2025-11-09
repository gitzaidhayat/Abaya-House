import express from 'express';
import { z } from 'zod';
import { Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = express.Router();

// All routes require admin role
router.use(requireAuth, requireRole('admin'));

// Get all orders (admin)
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search,
      from,
      to,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single order (admin)
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// Update order status
const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
    note: z.string().optional(),
  }),
});

router.patch('/:id/status', validate(updateStatusSchema), async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Don't allow status change if already delivered or cancelled
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot update ${order.status} order` });
    }

    // Update status
    order.status = status;
    order.timeline.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status} by admin`,
      updatedBy: req.user._id,
    });

    await order.save();

    res.json({ order, message: 'Order status updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Update payment status
const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
    note: z.string().optional(),
  }),
});

router.patch('/:id/payment-status', validate(updatePaymentStatusSchema), async (req, res, next) => {
  try {
    const { paymentStatus, note } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.paymentStatus = paymentStatus;
    order.timeline.push({
      status: order.status,
      timestamp: new Date(),
      note: note || `Payment status updated to ${paymentStatus} by admin`,
      updatedBy: req.user._id,
    });

    await order.save();

    res.json({ order, message: 'Payment status updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Add tracking info
const addTrackingSchema = z.object({
  body: z.object({
    carrier: z.string(),
    trackingNumber: z.string(),
    trackingUrl: z.string().url().optional(),
  }),
});

router.patch('/:id/tracking', validate(addTrackingSchema), async (req, res, next) => {
  try {
    const { carrier, trackingNumber, trackingUrl } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.tracking = {
      carrier,
      trackingNumber,
      trackingUrl,
      updatedAt: new Date(),
    };

    // Update status to shipped if not already
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      order.status = 'shipped';
      order.timeline.push({
        status: 'shipped',
        timestamp: new Date(),
        note: `Order shipped via ${carrier} - Tracking: ${trackingNumber}`,
        updatedBy: req.user._id,
      });
    }

    await order.save();

    res.json({ order, message: 'Tracking information added successfully' });
  } catch (error) {
    next(error);
  }
});

// Cancel order
const cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string(),
    refundAmount: z.number().min(0).optional(),
  }),
});

router.post('/:id/cancel', validate(cancelOrderSchema), async (req, res, next) => {
  try {
    const { reason, refundAmount } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot cancel delivered order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order already cancelled' });
    }

    // Restore product stock
    for (const item of order.items) {
      if (item.sku) {
        await Product.updateOne(
          { _id: item.productId, 'variants.sku': item.sku },
          { $inc: { 'variants.$.stock': item.quantity } }
        );
      } else {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
      }
    }

    // Update order
    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Order cancelled by admin. Reason: ${reason}`,
      updatedBy: req.user._id,
    });

    if (refundAmount) {
      order.paymentStatus = 'refunded';
      order.refund = {
        amount: refundAmount,
        reason,
        processedAt: new Date(),
        processedBy: req.user._id,
      };
    }

    await order.save();

    res.json({ order, message: 'Order cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

// Get order statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const dateQuery = {};
    if (from || to) {
      dateQuery.createdAt = {};
      if (from) dateQuery.createdAt.$gte = new Date(from);
      if (to) dateQuery.createdAt.$lte = new Date(to);
    }

    const [statusCounts, paymentCounts, totalRevenue] = await Promise.all([
      Order.aggregate([
        { $match: dateQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: dateQuery },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { ...dateQuery, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json({
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      paymentCounts: paymentCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
