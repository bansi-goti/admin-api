const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    cities: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Location', locationSchema);
