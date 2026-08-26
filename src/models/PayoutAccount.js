const mongoose = require('mongoose');

const payoutAccountSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  upiId: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PayoutAccount', payoutAccountSchema);
