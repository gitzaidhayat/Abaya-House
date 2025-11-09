import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
      maxlength: 200,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    imageUrl: {
      type: String,
      required: [true, 'Banner image is required'],
    },
    imagePublicId: String,
    linkUrl: {
      type: String,
      trim: true,
    },
    linkText: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    position: {
      type: String,
      enum: ['hero', 'middle', 'bottom', 'sidebar'],
      default: 'hero',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startsAt: Date,
    endsAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
bannerSchema.index({ position: 1, isActive: 1, sortOrder: 1 });
bannerSchema.index({ startsAt: 1, endsAt: 1 });

export const Banner = mongoose.model('Banner', bannerSchema);
