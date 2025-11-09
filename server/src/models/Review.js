import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    body: {
      type: String,
      required: [true, 'Review body is required'],
      trim: true,
      maxlength: 1000,
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected'],
      default: 'pending',
    },
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ createdAt: -1 });

// Ensure one review per user per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
