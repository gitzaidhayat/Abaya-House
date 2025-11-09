import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/error.js';
import { trackPageView } from './middleware/analytics.js';

// Import routes
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import adminOrdersRoutes from './routes/admin/orders.js';
import analyticsRoutes from './routes/admin/analytics.js';
import reportsRoutes from './routes/admin/reports.js';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Sanitize data
app.use(mongoSanitize());

// Rate limiting
app.use(generalLimiter);

// Analytics tracking
app.use(trackPageView);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin/reports', reportsRoutes);

// Serve static files (uploads)
if (env.USE_LOCAL_STORAGE) {
  app.use('/uploads', express.static('uploads'));
}

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;
