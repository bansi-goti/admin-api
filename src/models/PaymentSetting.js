const mongoose = require('mongoose');

const paymentSettingSchema = mongoose.Schema(
  {
    gateway: {
      type: String,
      required: true,
      unique: true,
      enum: ['Razorpay', 'Stripe', 'PayPal'],
    },
    keyId: {
      type: String,
      required: true,
    },
    keySecret: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      default: '',
    },
    mode: {
      type: String,
      enum: ['test', 'live'],
      default: 'test',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PaymentSetting', paymentSettingSchema);
