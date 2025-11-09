import express from 'express';
import { Order } from '../../models/Order.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { generateSalesReport } from '../../services/excel.js';

const router = express.Router();

// All routes require admin role
router.use(requireAuth, requireRole('admin'));

// Export sales report as Excel
router.get('/sales.xlsx', async (req, res, next) => {
  try {
    const { from, to, status = 'all' } = req.query;

    // Build filter
    const filter = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (status !== 'all') {
      if (status === 'paid') {
        filter.paymentStatus = 'paid';
      } else {
        filter.status = status;
      }
    }

    // Fetch orders
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .lean();

    if (orders.length === 0) {
      return res.status(404).json({ error: 'No orders found for the specified criteria' });
    }

    // Generate Excel
    const workbook = await generateSalesReport(orders, { from, to });

    // Set headers
    const filename = `sales_${from || 'all'}_${to || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

// Get sales data (JSON)
router.get('/sales', async (req, res, next) => {
  try {
    const { from, to, status = 'all', page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (status !== 'all') {
      if (status === 'paid') {
        filter.paymentStatus = 'paid';
      } else {
        filter.status = status;
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch orders
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email')
        .lean(),
      Order.countDocuments(filter),
    ]);

    // Calculate summary
    const summary = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0],
            },
          },
          totalDiscount: { $sum: '$discount' },
          totalTax: { $sum: '$tax' },
          totalShipping: { $sum: '$shipping' },
        },
      },
    ]);

    res.json({
      orders,
      summary: summary[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        totalTax: 0,
        totalShipping: 0,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
