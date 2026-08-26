const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
  },
  discountType: {
    type: String,
    enum: ['Percentage (%)', 'Fixed Amount (₹)', 'Free Shipping'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrder: {
    type: Number,
    default: 0,
  },
  maxDiscount: {
    type: Number,
    default: 0,
  },
  usageLimit: {
    type: Number,
    default: 0, // 0 means unlimited
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  perCustomer: {
    type: Number,
    default: 1,
  },
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validTo: {
    type: Date,
    default: null,
  },
  isInfinite: {
    type: Boolean,
    default: false,
  },
  appliesTo: {
    type: String,
    enum: ['All Products', 'Specific Category', 'Specific Product'],
    default: 'All Products',
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

couponSchema.index({ code: 1, seller: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
