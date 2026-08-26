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
    const ads = await Advertisement.find().populate('product', 'name price images').sort({ createdAt: -1 });

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
      product,
      productId,
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
        url: `/uploads/${file.filename}`,
        type: fileType
      };
    });

    const hasVideo = media.some(m => m.type === 'video');
    const type = hasVideo ? 'Video' : 'Image';

    const status = calculateStatus(startDate, startTime, endDate, endTime);
    const selectedProduct = product || productId || undefined;

    const ad = await Advertisement.create({
      title,
      product: selectedProduct,
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

    if (req.body.productId || req.body.product) {
      updates.product = req.body.product || req.body.productId;
    }

    let existingMedia = [];
    if (req.body.existingMedia) {
      const em = req.body.existingMedia;
      existingMedia = Array.isArray(em) ? em.map(m => JSON.parse(m)) : [JSON.parse(em)];
    }

    const newMedia = mediaFiles.map(file => {
      const fileType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return {
        url: file.filename,
        type: fileType
      };
    });

    if (req.body.existingMedia || mediaFiles.length > 0) {
      updates.media = [...existingMedia, ...newMedia];
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
    }).populate('product', 'name price images');

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

// @desc    Toggle advertisement status (Pause / Resume)
// @route   PATCH /api/advertisements/:id/status
// @access  Private
const toggleAdvertisementStatus = async (req, res, next) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    let newStatus;
    if (ad.status === 'Draft') {
      newStatus = calculateStatus(ad.startDate, ad.startTime, ad.endDate, ad.endTime);
    } else if (ad.status === 'Ended') {
      return res.status(400).json({ success: false, message: 'Ended advertisements cannot be restarted' });
    } else {
      newStatus = 'Draft';
    }

    ad.status = newStatus;
    await ad.save();

    res.status(200).json({
      success: true,
      data: ad,
      message: newStatus === 'Draft' ? 'Advertisement paused' : 'Advertisement resumed',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active public hero banners for homepage slider & popups
// @route   GET /api/advertisements/public
// @access  Public
const getPublicBanners = async (req, res, next) => {
  try {
    let ads = await Advertisement.find({ status: { $in: ['Active', 'Approved', 'Scheduled', 'Draft'] } })
      .populate('product', 'name price images')
      .sort({ createdAt: -1 })
      .lean();

    if (!ads || ads.length === 0) {
      ads = await Advertisement.find({}).populate('product', 'name price images').sort({ createdAt: -1 }).lean();
    }

    const slideMeta = [
      {
        tag: "PURELY HAND-CRAFTED",
        title: "TIMELESS ELEGANCE",
        subtitle: "Premium Collection",
        desc: "Experience luxury with our handcrafted jewelry pieces.\nEach piece is a masterpiece of artistry."
      },
      {
        tag: "EXQUISITE CRAFTSMANSHIP",
        title: "ROYAL SPLENDOR",
        subtitle: "Elite Masterpieces",
        desc: "Indulge in the finest collections designed for royalty.\nCrafted to make every moment unforgettable."
      },
      {
        tag: "TEMPTING BEAUTY",
        title: "GOLDEN HERITAGE",
        subtitle: "Signature Creations",
        desc: "Discover our heritage of pure gold and gemstone settings.\nThe ultimate expression of luxury."
      }
    ];

    const slides = [];
    if (ads.length > 0) {
      let idx = 0;
      ads.forEach((ad) => {
        const mediaList = Array.isArray(ad.media) ? ad.media : [];
        const prodObj = ad.product || null;
        const productId = prodObj ? (prodObj._id ? String(prodObj._id) : String(prodObj)) : null;

        mediaList.forEach((m) => {
          const meta = slideMeta[idx % slideMeta.length];
          let mediaUrl = m.url || '';
          if (mediaUrl && !mediaUrl.startsWith('/') && !mediaUrl.startsWith('http')) {
            mediaUrl = `/uploads/${mediaUrl}`;
          }

          slides.push({
            id: String(ad._id) + '-' + idx,
            originalAdId: String(ad._id),
            productId: productId,
            productName: prodObj?.name || null,
            title: ad.title && ad.title !== 'string' ? ad.title : meta.title,
            tag: ad.discountPercentage ? `${ad.discountPercentage}% OFF SPECIAL OFFER` : meta.tag,
            subtitle: ad.discountedPrice ? `Special Price: ₹${Number(ad.discountedPrice).toLocaleString('en-IN')}` : meta.subtitle,
            desc: ad.originalPrice ? `Original Price: ₹${Number(ad.originalPrice).toLocaleString('en-IN')} | Exclusive Limited Time Offer` : meta.desc,
            type: m.type === 'video' ? 'video' : 'image',
            src: mediaUrl,
            originalPrice: ad.originalPrice,
            discountedPrice: ad.discountedPrice,
            discountPercentage: ad.discountPercentage,
            startDate: ad.startDate,
            endDate: ad.endDate,
            status: ad.status
          });
          idx++;
        });
      });
    }

    res.status(200).json({
      success: true,
      count: slides.length,
      data: slides,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAdvertisements,
  getPublicBanners,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisementStatus,
};
