import express from 'express';
import { Order } from '../../models/Order.js';
import { AnalyticsEvent } from '../../models/AnalyticsEvent.js';
import { Product } from '../../models/Product.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// All routes require admin role
router.use(requireAuth, requireRole('admin'));

// Get revenue analytics
router.get('/revenue', async (req, res, next) => {
  try {
    const { range = '30d', from, to } = req.query;

    let startDate;
    const endDate = to ? new Date(to) : new Date();

    if (range === 'custom' && from) {
      startDate = new Date(from);
    } else {
      const days = parseInt(range) || 30;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Monthly revenue aggregation
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          revenue: { $round: ['$revenue', 2] },
          orders: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
        },
      },
    ]);

    // Total revenue
    const totalStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]);

    res.json({
      monthlyRevenue,
      totalStats: totalStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
    });
  } catch (error) {
    next(error);
  }
});

// Get traffic analytics
router.get('/traffic', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    // Monthly traffic (unique sessions)
    const monthlyTraffic = await AnalyticsEvent.aggregate([
      {
        $match: {
          type: 'view',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            sessionId: '$sessionId',
          },
        },
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
          },
          sessions: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            ],
          },
          sessions: 1,
        },
      },
    ]);

    // Total unique sessions
    const totalSessions = await AnalyticsEvent.distinct('sessionId', {
      type: 'view',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // New vs returning users
    const userStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          type: 'view',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$sessionId',
          hasUser: { $max: { $cond: [{ $ne: ['$userId', null] }, 1, 0] } },
        },
      },
      {
        $group: {
          _id: null,
          authenticated: { $sum: '$hasUser' },
          anonymous: { $sum: { $cond: [{ $eq: ['$hasUser', 0] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      monthlyTraffic,
      totalSessions: totalSessions.length,
      userStats: userStats[0] || { authenticated: 0, anonymous: 0 },
    });
  } catch (error) {
    next(error);
  }
});

// Get conversion rate
router.get('/conversion', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    // Get unique sessions
    const totalSessions = await AnalyticsEvent.distinct('sessionId', {
      type: 'view',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get orders count
    const ordersCount = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: 'paid',
    });

    const conversionRate = totalSessions.length > 0 ? (ordersCount / totalSessions.length) * 100 : 0;

    res.json({
      totalSessions: totalSessions.length,
      totalOrders: ordersCount,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
});

// Get top products
router.get('/top-products', async (req, res, next) => {
  try {
    const { from, to, limit = 10 } = req.query;

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          title: 1,
          totalQuantity: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orders: 1,
        },
      },
    ]);

    res.json({ topProducts });
  } catch (error) {
    next(error);
  }
});

// Get orders by status
router.get('/orders-by-status', async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const ordersByStatus = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
          revenue: { $round: ['$revenue', 2] },
        },
      },
    ]);

    res.json({ ordersByStatus });
  } catch (error) {
    next(error);
  }
});

// Dashboard summary
router.get('/dashboard', async (req, res, next) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period stats
    const [currentStats] = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
    ]);

    // Previous period stats for comparison
    const [previousStats] = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: last60Days, $lt: last30Days },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
    ]);

    // Calculate growth
    const revenueGrowth = previousStats && currentStats
      ? ((currentStats.revenue - previousStats.revenue) / previousStats.revenue) * 100
      : 0;
    const ordersGrowth = previousStats && currentStats
      ? ((currentStats.orders - previousStats.orders) / previousStats.orders) * 100
      : 0;

    // Get unique sessions
    const sessions = await AnalyticsEvent.distinct('sessionId', {
      type: 'view',
      createdAt: { $gte: last30Days },
    });

    const conversionRate = sessions.length > 0 && currentStats ? (currentStats.orders / sessions.length) * 100 : 0;

    res.json({
      revenue: currentStats?.revenue || 0,
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      orders: currentStats?.orders || 0,
      ordersGrowth: parseFloat(ordersGrowth.toFixed(2)),
      avgOrderValue: currentStats?.avgOrderValue || 0,
      sessions: sessions.length,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
