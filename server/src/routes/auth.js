import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    password: z.string().min(6).max(100),
  }),
});

// Register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: password,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if banned
    if (user.isBanned) {
      return res.status(403).json({ error: 'Account has been banned' });
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    user.lastLoginAt = new Date();
    await user.save();

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if token exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokenExists = user.refreshTokens.some(
      t => t.token === refreshToken && t.expiresAt > new Date()
    );

    if (!tokenExists) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    // Set cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      message: 'Token refreshed',
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Remove refresh token from database
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    // Clear cookies
    clearAuthCookies(res);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Forgot password
router.post(
  '/password/forgot',
  authLimiter,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: 'If the email exists, a reset link has been sent' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // Send email
      await sendPasswordResetEmail(user, resetToken);

      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      next(error);
    }
  }
);

// Reset password
router.post(
  '/password/reset',
  authLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      // Hash token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Update password
      user.passwordHash = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.refreshTokens = []; // Invalidate all sessions
      await user.save();

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
