const WebsiteSetting = require('../models/WebsiteSetting');
const fs = require('fs');
const path = require('path');

// @desc    Get website settings
// @route   GET /api/settings/website
// @access  Private
const getWebsiteSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSetting.findOne();
    
    // If no settings exist yet, return empty data
    if (!settings) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update website settings (Upsert)
// @route   POST /api/settings/website
// @access  Private
const updateWebsiteSettings = async (req, res, next) => {
  try {
    const { siteName, supportEmail, address } = req.body;
    
    let settings = await WebsiteSetting.findOne();
    
    const updateData = {
      siteName,
      supportEmail,
      address,
    };

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
      // Create for the first time
      settings = await WebsiteSetting.create(updateData);
    } else {
      // Update existing
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
