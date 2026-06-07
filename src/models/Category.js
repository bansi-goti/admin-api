const mongoose = require('mongoose');

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
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

// Virtual for productsCount
categorySchema.virtual('productsCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category', // Assuming product will have a category field. Otherwise we just return 0 or do custom logic in controller.
  count: true // Set to true to return the number of documents
});

// Ensure virtuals are included in JSON/Object conversions
categorySchema.set('toObject', { virtuals: true });
categorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);
