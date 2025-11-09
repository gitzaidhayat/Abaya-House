import mongoose from 'mongoose';
import slugify from 'slugify';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    image: {
      url: String,
      publicId: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1 });

// Generate slug from name if not provided
categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
    });
  }
  next();
});

export const Category = mongoose.model('Category', categorySchema);
