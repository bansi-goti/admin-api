const Category = require('../models/Category');
const Product = require('../models/Product'); // To calculate productsCount dynamically if virtual doesn't work
const fs = require('fs');
const path = require('path');

// Helper to remove uploaded file in case of error or update
const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.join(__dirname, '../..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
// @desc    Get all categories with pagination & search
// @route   GET /api/categories
// @access  Private
const getAllCategories = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection offline. Please whitelist your IP address in MongoDB Atlas (https://cloud.mongodb.com -> Security -> Network Access -> Add IP 0.0.0.0/0).'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

    // Build query (return all categories for product assignment)
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Attach productsCount dynamically (assuming Product schema doesn't have category field yet, returning 0 for now or calculate if it does)
    const enhancedCategories = await Promise.all(categories.map(async (cat) => {
      const count = await Product.countDocuments({ category: cat._id });
      return {
        ...cat,
        productsCount: count
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        data: enhancedCategories,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single category by ID
// @desc    Get single category by ID or Name
// @route   GET /api/categories/:id
// @access  Public / Private
const getCategoryById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let category = null;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      category = await Category.findById(req.params.id);
    } else {
      category = await Category.findOne({ name: { $regex: new RegExp(`^${req.params.id}$`, 'i') } });
    }

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const count = await Product.countDocuments({ category: category._id });
    const categoryObj = category.toObject ? category.toObject() : category;
    categoryObj.productsCount = count;

    res.status(200).json({ success: true, data: categoryObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    // Check if category name already exists for this seller
    const exists = await Category.findOne({ name, seller: req.user._id });
    if (exists) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = await Category.create({
      name,
      description,
      image: req.body.image || '',
      status: status || 'Active',
      seller: req.user._id
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const category = await Category.findOne({ _id: req.params.id, seller: req.user._id });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (status) category.status = status;
    
    if (req.body.image && req.body.image !== category.image) {
      // Remove old image
      removeFile(category.image);
      category.image = req.body.image;
    }

    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, seller: req.user._id });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.deleteOne();

    res.status(200).json({ success: true, message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update category status
// @route   PATCH /api/categories/:id/status
// @access  Private
const updateCategoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    const category = await Category.findOne({ _id: req.params.id, seller: req.user._id });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.status = status;
    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryStatus
};
