const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1000 // Minimum withdrawal amount
  },
  payoutAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayoutAccount',
    required: true
  },
  status: {
    type: String,
    enum: ['Processing', 'Completed', 'Failed', 'Cancelled'],
    default: 'Processing'
  },
  remarks: {
    type: String,
    default: 'Pending transfer'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
