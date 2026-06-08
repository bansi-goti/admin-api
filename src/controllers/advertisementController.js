const Advertisement = require('../models/Advertisement');
const fs = require('fs');
const path = require('path');

// Helper to determine status based on dates
const calculateStatus = (startDate, startTime, endDate, endTime) => {
  const now = new Date();
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);

  if (now < start) return 'Scheduled';
  if (now > end) return 'Ended';
  return 'Active';
};

// @desc    Get all advertisements
// @route   GET /api/advertisements
// @access  Private
const getAllAdvertisements = async (req, res, next) => {
  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 });

    // Auto-update statuses dynamically based on current time
    const updatedAds = await Promise.all(ads.map(async (ad) => {
      const currentStatus = calculateStatus(ad.startDate, ad.startTime, ad.endDate, ad.endTime);
      if (ad.status !== currentStatus && ad.status !== 'Draft') {
        ad.status = currentStatus;
        await ad.save();
      }
      return ad;
    }));

    res.status(200).json({
      success: true,
      data: updatedAds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create an advertisement
// @route   POST /api/advertisements
// @access  Private
const createAdvertisement = async (req, res, next) => {
  try {
    const {
      title,
      startDate,
      startTime,
      endDate,
      endTime,
      originalPrice,
      discountedPrice,
      discountPercentage,
    } = req.body;

    const mediaFiles = req.files || [];
    if (mediaFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one media file is required' });
    }

    const media = mediaFiles.map(file => {
      const fileType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return {
        url: file.filename,
        type: fileType
      };
    });

    const hasVideo = media.some(m => m.type === 'video');
    const type = hasVideo ? 'Video' : 'Image';

    const status = calculateStatus(startDate, startTime, endDate, endTime);

    const ad = await Advertisement.create({
      title,
      startDate,
      startTime,
      endDate,
      endTime,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
      discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
      media,
      status,
      type,
    });

    res.status(201).json({
      success: true,
      data: ad,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an advertisement
// @route   PATCH /api/advertisements/:id
// @access  Private
const updateAdvertisement = async (req, res, next) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    const updates = { ...req.body };
    const mediaFiles = req.files || [];

    // If new files are uploaded, append or replace media logic
    // Currently, the UI replaces specific media types. To be safe, if files exist, we add them.
    if (mediaFiles.length > 0) {
      const newMedia = mediaFiles.map(file => {
        const fileType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        return {
          url: file.filename,
          type: fileType
        };
      });
      // Simple override logic: if we upload new media, we replace old media of the same type.
      // Since the UI doesn't track old media precisely in FormData, we can just replace the entire array or append.
      // Assuming frontend sends all required files if it changes anything. Let's just append for simplicity.
      updates.media = [...ad.media, ...newMedia];
    }

    if (updates.startDate && updates.startTime && updates.endDate && updates.endTime) {
      updates.status = calculateStatus(updates.startDate, updates.startTime, updates.endDate, updates.endTime);
    }

    if (updates.media && updates.media.length > 0) {
       updates.type = updates.media.some(m => m.type === 'video') ? 'Video' : 'Image';
    }

    const updatedAd = await Advertisement.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedAd,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an advertisement
// @route   DELETE /api/advertisements/:id
// @access  Private
const deleteAdvertisement = async (req, res, next) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    // Delete associated files
    if (ad.media && ad.media.length > 0) {
      ad.media.forEach(m => {
        const filePath = path.join(__dirname, '../../uploads', m.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await ad.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Advertisement removed',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
};
