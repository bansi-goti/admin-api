const mongoose = require('mongoose');

const websiteSettingSchema = mongoose.Schema(
  {
    siteName: {
      type: String,
      default: '',
    },
    metaTitle: {
      type: String,
      default: '',
    },
    metaDescription: {
      type: String,
      default: '',
    },
    metaKeywords: {
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
    facebookUrl: {
      type: String,
      default: '',
    },
    instagramUrl: {
      type: String,
      default: '',
    },
    pinterestUrl: {
      type: String,
      default: '',
    },
    youtubeUrl: {
      type: String,
      default: '',
    },
    canonicalUrl: {
      type: String,
      default: '',
    },
    googleSiteVerification: {
      type: String,
      default: '',
    },
    googleAnalyticsId: {
      type: String,
      default: '',
    },
    robotsMeta: {
      type: String,
      default: 'index, follow',
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