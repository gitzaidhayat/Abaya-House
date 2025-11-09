import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variantSku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  priceAtAdd: {
    type: Number,
    required: true,
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totals: {
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    appliedCoupon: {
      code: String,
      discount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
cartSchema.index({ userId: 1 });

export const Cart = mongoose.model('Cart', cartSchema);
