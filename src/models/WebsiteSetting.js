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
    googleClientId: {
      type: String,
      default: '',
    },
    googleClientSecret: {
      type: String,
      default: '',
    },
    isGoogleLoginEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WebsiteSetting', websiteSettingSchema);
