const WebsiteSetting = require('../models/WebsiteSetting');
const GoogleAuthSetting = require('../models/GoogleAuthSetting');
const fs = require('fs');
const path = require('path');

// @desc    Get website settings
// @route   GET /api/settings/website
// @access  Public / Private
const getWebsiteSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSetting.findOne();
    
    if (!settings) {
      settings = await WebsiteSetting.create({
        siteName: 'Nayzora Jewellery',
        supportEmail: 'support@nayzora.com',
        address: 'Mumbai, India',
        logo: '',
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
        siteName: 'Nayzora Jewellery',
        supportEmail: 'support@nayzora.com',
        address: 'Mumbai, India',
        logo: '',
      },
    });
  }
};

// @desc    Update website settings (Upsert)
// @route   POST /api/settings/website
// @access  Private
const updateWebsiteSettings = async (req, res, next) => {
  try {
    const { siteName, supportEmail, address, googleClientId, googleClientSecret, isGoogleLoginEnabled } = req.body;
    
    let settings = await WebsiteSetting.findOne();
    
    const updateData = {
      siteName: siteName || '',
      supportEmail: supportEmail || '',
      address: address || '',
    };

    if (googleClientId !== undefined) updateData.googleClientId = typeof googleClientId === 'string' ? googleClientId.trim() : googleClientId;
    if (googleClientSecret !== undefined) updateData.googleClientSecret = typeof googleClientSecret === 'string' ? googleClientSecret.trim() : googleClientSecret;
    if (isGoogleLoginEnabled !== undefined) updateData.isGoogleLoginEnabled = Boolean(isGoogleLoginEnabled);

    // Sync to GoogleAuthSetting model as well
    try {
      if (googleClientId !== undefined || isGoogleLoginEnabled !== undefined) {
        let gSettings = await GoogleAuthSetting.findOne();
        const gUpdate = {
          googleClientId: googleClientId !== undefined ? googleClientId : (gSettings ? gSettings.googleClientId : ''),
          googleClientSecret: googleClientSecret !== undefined ? googleClientSecret : (gSettings ? gSettings.googleClientSecret : ''),
          isGoogleLoginEnabled: isGoogleLoginEnabled !== undefined ? Boolean(isGoogleLoginEnabled) : (gSettings ? gSettings.isGoogleLoginEnabled : true),
        };
        if (!gSettings) {
          await GoogleAuthSetting.create(gUpdate);
        } else {
          await GoogleAuthSetting.findByIdAndUpdate(gSettings._id, gUpdate);
        }
      }
    } catch (gErr) {
      console.warn('Sync to GoogleAuthSetting notice:', gErr.message);
    }

    // If an image was uploaded, handle it
    if (req.file) {
      updateData.logo = req.file.filename;

      // Delete old logo if it exists
      if (settings && settings.logo) {
        const oldPath = path.join(__dirname, '../../uploads', settings.logo);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    if (!settings) {
      settings = await WebsiteSetting.create(updateData);
    } else {
      settings = await WebsiteSetting.findByIdAndUpdate(
        settings._id,
        updateData,
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWebsiteSettings,
  updateWebsiteSettings,
};
