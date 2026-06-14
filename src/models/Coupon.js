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
    required: true,
  },
  validTo: {
    type: Date,
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // We can dynamically compute 'status' (Active, Scheduled, Expired)
}, {
  timestamps: true,
});

// Compound index to ensure a subadmin cannot have duplicate coupon codes, but different subadmins can have the same code.
couponSchema.index({ code: 1, seller: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
