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
    wishlistCount: {
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
    productId: {
      type: String,
    },
    productType: {
      type: String,
      default: 'simple',
    },
    description: {
      type: String,
    },
    barcode: {
      type: String,
    },
    costPrice: {
      type: Number,
    },
    discountPrice: {
      type: Number,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
    commission: {
      type: Number,
    },
    lowStockAlert: {
      type: Number,
    },
    weight: {
      type: Number,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
    },
    focusKeyword: {
      type: String,
    },
    enableInternationalPricing: {
      type: Boolean,
      default: false,
    },
    enableInternationalShipping: {
      type: Boolean,
      default: false,
    },
    shippingType: {
      type: String,
      default: 'free',
    },
    indiaShippingIncluded: {
      type: Boolean,
      default: true,
    },
    intlShippingType: {
      type: String,
      enum: ['dynamic', 'flat', 'free'],
      default: 'dynamic',
    },
    variants: {
      type: Array,
      default: [],
    },
    countryPricing: {
      type: Array,
      default: [],
    },
    countryShipping: {
      type: Array,
      default: [],
    },
    videoUrl: {
      type: String,
    },
    enable360: {
      type: Boolean,
      default: false,
    },
    threeSixtyImages: {
      type: [String],
      default: [],
    },
    showOnHomepage: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);
