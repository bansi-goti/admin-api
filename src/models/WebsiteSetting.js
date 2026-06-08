const mongoose = require('mongoose');

const websiteSettingSchema = mongoose.Schema(
  {
    siteName: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WebsiteSetting', websiteSettingSchema);
