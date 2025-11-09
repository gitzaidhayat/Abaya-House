import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['view', 'add_to_cart', 'purchase', 'search', 'click'],
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    path: {
      type: String,
      required: true,
    },
    referrer: String,
    userAgent: String,
    country: String,
    device: String,
    browser: String,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    timeseries: {
      timeField: 'createdAt',
      metaField: 'metadata',
      granularity: 'hours',
    },
  }
);

// Indexes
analyticsEventSchema.index({ type: 1, createdAt: -1 });
analyticsEventSchema.index({ sessionId: 1, createdAt: -1 });
analyticsEventSchema.index({ userId: 1, createdAt: -1 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
