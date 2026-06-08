const mongoose = require('mongoose');

const advertisementSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    startDate: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    originalPrice: {
      type: Number,
    },
    discountedPrice: {
      type: Number,
    },
    discountPercentage: {
      type: Number,
    },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, required: true, enum: ['image', 'video'] },
      }
    ],
    status: {
      type: String,
      enum: ['Active', 'Scheduled', 'Draft', 'Ended'],
      default: 'Scheduled',
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: ['Image', 'Video'],
      default: 'Image',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Advertisement', advertisementSchema);
