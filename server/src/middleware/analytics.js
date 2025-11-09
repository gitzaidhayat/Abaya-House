import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import UAParser from 'ua-parser-js';
import crypto from 'crypto';

export const trackPageView = async (req, res, next) => {
  try {
    // Get or create session ID
    let sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        maxAge: 30 * 60 * 1000, // 30 minutes
        sameSite: 'lax',
      });
    }

    // Parse user agent
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();

    // Create analytics event (non-blocking)
    setImmediate(async () => {
      try {
        await AnalyticsEvent.create({
          type: 'view',
          sessionId,
          userId: req.user?._id,
          path: req.path,
          referrer: req.headers.referer || req.headers.referrer,
          userAgent: req.headers['user-agent'],
          device: result.device.type || 'desktop',
          browser: result.browser.name,
          metadata: {
            method: req.method,
            query: req.query,
          },
        });
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
    });
  } catch (error) {
    console.error('Analytics middleware error:', error);
  }
  next();
};

export const trackEvent = async (type, req, metadata = {}) => {
  try {
    const sessionId = req.cookies?.sessionId || crypto.randomUUID();
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();

    await AnalyticsEvent.create({
      type,
      sessionId,
      userId: req.user?._id,
      path: req.path,
      referrer: req.headers.referer || req.headers.referrer,
      userAgent: req.headers['user-agent'],
      device: result.device.type || 'desktop',
      browser: result.browser.name,
      metadata,
    });
  } catch (error) {
    console.error('Event tracking error:', error);
  }
};
