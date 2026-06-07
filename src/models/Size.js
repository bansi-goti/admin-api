const mongoose = require('mongoose');

const sizeSchema = mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
    },
    size_value: {
      type: String,
      required: true,
      trim: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Size', sizeSchema);
