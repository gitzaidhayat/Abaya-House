import express from 'express';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Review } from '../models/Review.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get products with filters, search, sort, pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      q, // search query
      category,
      minPrice,
      maxPrice,
      rating,
      inStock,
      featured,
      tags,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = { isActive: true };

    // Search
    if (q) {
      filter.$text = { $search: q };
    }

    // Category filter
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        filter.categoryId = cat._id;
      }
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (rating) {
      filter.ratingsAvg = { $gte: parseFloat(rating) };
    }

    // Stock filter
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Featured filter
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      filter.tags = { $in: tagArray };
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { ratingsAvg: -1, ratingsCount: -1 };
        break;
      case 'popular':
        sortOption = { viewCount: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate('categoryId', 'name slug')
        .select('-__v')
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
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

// Get single product by slug
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('categoryId', 'name slug')
      .lean();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Increment view count (non-blocking)
    setImmediate(() => {
      Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } }).catch(err =>
        console.error('View count update error:', err)
      );
    });

    // Get reviews
    const reviews = await Review.find({ productId: product._id, status: 'published' })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get related products
    const relatedProducts = await Product.find({
      categoryId: product.categoryId,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(4)
      .select('title slug price compareAtPrice images ratingsAvg')
      .lean();

    res.json({
      product,
      reviews,
      relatedProducts,
    });
  } catch (error) {
    next(error);
  }
});

// Get featured products
router.get('/featured/list', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.find({ isActive: true, isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('categoryId', 'name slug')
      .select('title slug price compareAtPrice images ratingsAvg ratingsCount')
      .lean();

    res.json({ products });
  } catch (error) {
    next(error);
  }
});

// Get best sellers
router.get('/bestsellers/list', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.find({ isActive: true })
      .sort({ viewCount: -1, ratingsAvg: -1 })
      .limit(limit)
      .populate('categoryId', 'name slug')
      .select('title slug price compareAtPrice images ratingsAvg ratingsCount')
      .lean();

    res.json({ products });
  } catch (error) {
    next(error);
  }
});

export default router;
