import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account has been banned' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');
      if (user && !user.isBanned) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }
  next();
};
