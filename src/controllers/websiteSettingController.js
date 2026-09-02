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
        metaTitle: 'Nayzora Jewellery - Timeless Elegance',
        metaDescription: 'Discover luxury handcrafted gold and diamond jewellery collections at Nayzora.',
        metaKeywords: 'jewellery, gold, diamonds, rings, necklaces, luxury',
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
        metaTitle: 'Nayzora Jewellery - Timeless Elegance',
        metaDescription: 'Discover luxury handcrafted gold and diamond jewellery collections at Nayzora.',
        metaKeywords: 'jewellery, gold, diamonds, rings, necklaces, luxury',
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
    const { siteName, metaTitle, metaDescription, metaKeywords, supportEmail, address, googleClientId, googleClientSecret, isGoogleLoginEnabled, facebookUrl, instagramUrl, pinterestUrl, youtubeUrl, canonicalUrl, googleSiteVerification, googleAnalyticsId, robotsMeta, whatsappProvider, whatsappSenderNumber, whatsappApiKey, whatsappInstanceId, whatsappApiUrl, isWhatsappOtpEnabled, smtpHost, smtpPort, smtpUser, smtpPass, smtpFromName, isEmailOtpEnabled } = req.body;
    
    let settings = await WebsiteSetting.findOne();
    
    const updateData = {
      siteName: siteName !== undefined ? siteName : '',
      supportEmail: supportEmail !== undefined ? supportEmail : '',
      address: address !== undefined ? address : '',
    };

    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;

    if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl;
    if (pinterestUrl !== undefined) updateData.pinterestUrl = pinterestUrl;
    if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;

    if (canonicalUrl !== undefined) updateData.canonicalUrl = canonicalUrl;
    if (googleSiteVerification !== undefined) updateData.googleSiteVerification = googleSiteVerification;
    if (googleAnalyticsId !== undefined) updateData.googleAnalyticsId = googleAnalyticsId;
    if (robotsMeta !== undefined) updateData.robotsMeta = robotsMeta;

    
    
    if (smtpHost !== undefined) updateData.smtpHost = typeof smtpHost === 'string' ? smtpHost.trim() : smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = Number(smtpPort) || 587;
    if (smtpUser !== undefined) updateData.smtpUser = typeof smtpUser === 'string' ? smtpUser.trim() : smtpUser;
    if (smtpPass !== undefined) updateData.smtpPass = typeof smtpPass === 'string' ? smtpPass.trim() : smtpPass;
    if (smtpFromName !== undefined) updateData.smtpFromName = typeof smtpFromName === 'string' ? smtpFromName.trim() : smtpFromName;
    if (isEmailOtpEnabled !== undefined) updateData.isEmailOtpEnabled = Boolean(isEmailOtpEnabled);
  
    if (whatsappProvider !== undefined) updateData.whatsappProvider = whatsappProvider;
    if (whatsappSenderNumber !== undefined) updateData.whatsappSenderNumber = typeof whatsappSenderNumber === 'string' ? whatsappSenderNumber.trim() : whatsappSenderNumber;
    if (whatsappApiKey !== undefined) updateData.whatsappApiKey = typeof whatsappApiKey === 'string' ? whatsappApiKey.trim() : whatsappApiKey;
    if (whatsappInstanceId !== undefined) updateData.whatsappInstanceId = typeof whatsappInstanceId === 'string' ? whatsappInstanceId.trim() : whatsappInstanceId;
    if (whatsappApiUrl !== undefined) updateData.whatsappApiUrl = typeof whatsappApiUrl === 'string' ? whatsappApiUrl.trim() : whatsappApiUrl;
    if (isWhatsappOtpEnabled !== undefined) updateData.isWhatsappOtpEnabled = Boolean(isWhatsappOtpEnabled);
  
    if (googleClientId !== undefined) updateData.googleClientId = typeof googleClientId === 'string' ? googleClientId.trim() : googleClientId;
    if (googleClientSecret !== undefined) updateData.googleClientSecret = typeof googleClientSecret === 'string' ? googleClientSecret.trim() : googleClientSecret;
    if (isGoogleLoginEnabled !== undefined) updateData.isGoogleLoginEnabled = Boolean(isGoogleLoginEnabled);

    // Sync to GoogleAuthSetting model
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
        { new: true, returnDocument: 'after', runValidators: true }
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