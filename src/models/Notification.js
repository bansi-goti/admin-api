const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Order', 'Payment', 'Product', 'Inventory', 'Review', 'System'],
    required: true,
  },
  isUnread: {
    type: Boolean,
    default: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
