import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0,
    },
    minOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    description: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ active: 1 });
couponSchema.index({ startsAt: 1, endsAt: 1 });

// Validate dates
couponSchema.pre('save', function (next) {
  if (this.endsAt <= this.startsAt) {
    next(new Error('End date must be after start date'));
  }
  next();
});

export const Coupon = mongoose.model('Coupon', couponSchema);
