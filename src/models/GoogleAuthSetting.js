const mongoose = require('mongoose');

const googleAuthSettingSchema = mongoose.Schema(
  {
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

module.exports = mongoose.model('GoogleAuthSetting', googleAuthSettingSchema);
