const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// @desc    Get logged in user's wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    const items = await Wishlist.find({ user: req.user._id })
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /api/wishlist
// @access  Private
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    let targetProductId = productId;
    if (typeof productId === 'string' && !mongoose.Types.ObjectId.isValid(productId)) {
      const foundProd = await Product.findOne({
        $or: [
          { slug: productId },
          { productId: productId },
          { sku: productId },
          { name: productId }
        ]
      });
      if (foundProd) targetProductId = foundProd._id;
    }
    if (!targetProductId || !mongoose.Types.ObjectId.isValid(targetProductId)) {
      return res.status(400).json({ success: false, message: 'Valid productId is required' });
    }

    const productExists = await Product.findById(productId);
    if (!productExists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let wishlistItem = await Wishlist.findOne({ user: req.user._id, product: productId });

    if (!wishlistItem) {
      wishlistItem = await Wishlist.create({
        user: req.user._id,
        product: targetProductId,
      });
    }

    const populated = await Wishlist.findById(wishlistItem._id).populate({
      path: 'product',
      populate: { path: 'category', select: 'name' }
    });

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Product added to wishlist',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product in wishlist (Add if absent, Remove if present)
// @route   POST /api/wishlist/toggle
// @access  Private
const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    let targetProductId = productId;
    if (typeof productId === 'string' && !mongoose.Types.ObjectId.isValid(productId)) {
      const foundProd = await Product.findOne({
        $or: [
          { slug: productId },
          { productId: productId },
          { sku: productId },
          { name: productId }
        ]
      });
      if (foundProd) {
        targetProductId = foundProd._id;
      }
    }

    const existing = await Wishlist.findOne({ user: req.user._id, product: targetProductId });

    if (existing) {
      await existing.deleteOne();
      return res.status(200).json({
        success: true,
        inWishlist: false,
        message: 'Product removed from wishlist',
      });
    } else {
      const created = await Wishlist.create({
        user: req.user._id,
        product: targetProductId,
      });
      const populated = await Wishlist.findById(created._id).populate({
        path: 'product',
        populate: { path: 'category', select: 'name' }
      });
      return res.status(201).json({
        success: true,
        inWishlist: true,
        data: populated,
        message: 'Product added to wishlist',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (mongoose.Types.ObjectId.isValid(productId)) {
      await Wishlist.deleteMany({
        user: req.user._id,
        $or: [{ product: productId }, { _id: productId }]
      });
    } else {
      await Wishlist.deleteMany({ user: req.user._id, product: productId });
    }

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  toggleWishlist,
  removeFromWishlist,
};
