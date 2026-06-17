const mongoose = require('mongoose');

const countrySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a country name'],
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    currency: {
      code: { type: String, default: '' },
      name: { type: String, default: '' },
      symbol: { type: String, default: '' },
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

module.exports = mongoose.model('Country', countrySchema);
