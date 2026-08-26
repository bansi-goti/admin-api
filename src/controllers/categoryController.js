const Category = require('../models/Category');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.join(__dirname, '../..', filePath);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch(e) {}
  }
};

const getAllCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

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

    const enhancedCategories = await Promise.all(categories.map(async (cat) => {
      const count = await Product.countDocuments({ category: cat._id, status: { $regex: '^Approved$', $options: 'i' } });
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

    const count = await Product.countDocuments({ category: category._id, status: { $regex: '^Approved$', $options: 'i' } });
    const categoryObj = category.toObject ? category.toObject() : category;
    categoryObj.productsCount = count;

    res.status(200).json({ success: true, data: categoryObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, status, image } = req.body;

    const query = { name: { $regex: new RegExp(`^${name}$`, 'i') } };
    if (req.user && req.user.role !== 'admin') {
      query.seller = req.user._id;
    }

    const exists = await Category.findOne(query);
    if (exists) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    let imagePath = image || '';
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const category = await Category.create({
      name,
      description,
      image: imagePath,
      status: status || 'Active',
      seller: req.user ? req.user._id : undefined
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, description, status, image } = req.body;
    
    const query = { _id: req.params.id };
    if (req.user && req.user.role !== 'admin') {
      query.seller = req.user._id;
    }

    const category = await Category.findOne(query);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (status) category.status = status;

    let imagePath = image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    if (imagePath !== undefined && imagePath !== category.image) {
      if (category.image) removeFile(category.image);
      category.image = imagePath;
    }

    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user && req.user.role !== 'admin') {
      query.seller = req.user._id;
    }

    const category = await Category.findOne(query);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (category.image) removeFile(category.image);
    await category.deleteOne();

    res.status(200).json({ success: true, message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCategoryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    const query = { _id: req.params.id };
    if (req.user && req.user.role !== 'admin') {
      query.seller = req.user._id;
    }

    const category = await Category.findOne(query);

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
