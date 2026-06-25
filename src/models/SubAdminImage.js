const mongoose = require('mongoose');

const subAdminImageSchema = mongoose.Schema(
  {
    imagePath: {
      type: String,
      required: [true, 'Please provide an image path'],
    },
    originalName: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SubAdminImage', subAdminImageSchema);
