const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    subcategory: {
      type: String,
    },
    name: {
      type: String,
      required: [true, 'Please add a product name'],
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
    },
    stock: {
      type: Number,
      default: 0,
    },
    sales: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    mainImage: {
      type: String,
    },
    gallery: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
