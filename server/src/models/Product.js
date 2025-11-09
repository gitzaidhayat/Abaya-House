import mongoose from 'mongoose';
import slugify from 'slugify';

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  attributes: {
    type: Map,
    of: String, // e.g., { size: 'M', color: 'Black' }
  },
  priceDelta: { type: Number, default: 0 },
  stock: { type: Number, default: 0, min: 0 },
  image: String,
});

const seoSchema = new mongoose.Schema({
  metaTitle: String,
  metaDescription: String,
  keywords: [String],
  ogImage: String,
});

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: 5000,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: String,
        alt: String,
      },
    ],
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    cost: {
      type: Number,
      min: 0,
    },
    variants: [variantSchema],
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    specs: {
      type: Map,
      of: String, // e.g., { material: 'Cotton', weight: '200g' }
    },
    ratingsAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    seo: seoSchema,
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ categoryId: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratingsAvg: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for discount percentage
productSchema.virtual('discountPercent').get(function () {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Generate slug from title if not provided
productSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

export const Product = mongoose.model('Product', productSchema);
