const SubAdminImage = require('../models/SubAdminImage');

// @desc    Upload multiple images for sub admin
// @route   POST /api/subadmin-images/upload
// @access  Private (SubAdmin)
const uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image',
      });
    }

    const uploadedImages = [];
    
    // Save each uploaded file to the DB
    for (const file of req.files) {
      const imagePath = `/uploads/${file.filename}`;
      const newImage = await SubAdminImage.create({
        imagePath,
        originalName: file.originalname,
        uploadedBy: req.user._id,
      });
      uploadedImages.push(newImage);
    }

    res.status(201).json({
      success: true,
      message: 'Images uploaded successfully',
      data: uploadedImages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all images uploaded by sub admin
// @route   GET /api/subadmin-images
// @access  Private (SubAdmin)
const getImages = async (req, res, next) => {
  try {
    // Only get images uploaded by the requesting user
    // Or if we want sub admins to see all subadmin images, we can remove the filter.
    // The requirement says "yeh option sub admin ko hi ayega"
    const images = await SubAdminImage.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an image
// @route   DELETE /api/subadmin-images/:id
// @access  Private (SubAdmin)
const deleteImage = async (req, res, next) => {
  try {
    const Product = require('../models/Product');
    const image = await SubAdminImage.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }

    // Check if image is uploaded by the user or if user is admin
    if (image.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this image' });
    }

    // Check if image is used in any product
    const imagePath = image.imagePath;
    
    // We use $regex because the product image might be stored as a full URL
    // e.g. "http://localhost:4001/uploads/filename" while imagePath is "/uploads/filename"
    // To safely escape regex characters in imagePath:
    const escapedPath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPath, 'i');

    const isUsed = await Product.findOne({
      $or: [
        { mainImage: { $regex: regex } },
        { gallery: { $regex: regex } },
        { threeSixtyImages: { $regex: regex } },
        { videoUrl: { $regex: regex } },
      ]
    });

    if (isUsed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please delete product first then delete image' 
      });
    }

    await image.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImages,
  getImages,
  deleteImage,
};
