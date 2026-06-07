const Color = require('../models/Color');
const Category = require('../models/Category');

// @desc    Get all colors
// @route   GET /api/colors
// @access  Private
const getAllColors = async (req, res) => {
  try {
    const colors = await Color.find({ seller: req.user._id })
      .populate('category_id', 'name image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: colors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get colors by category
// @route   GET /api/colors/:categoryId
// @access  Private
const getColorsByCategory = async (req, res) => {
  try {
    const colors = await Color.find({ 
      category_id: req.params.categoryId,
      seller: req.user._id 
    });

    res.status(200).json({
      success: true,
      data: colors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create colors in bulk
// @route   POST /api/colors/bulk
// @access  Private
const createColorsBulk = async (req, res) => {
  try {
    const { category_id, colors } = req.body;

    if (!category_id || !colors || !Array.isArray(colors) || colors.length === 0) {
      return res.status(400).json({ message: 'Category ID and colors array are required' });
    }

    // Verify category exists and belongs to seller
    const category = await Category.findOne({ _id: category_id, seller: req.user._id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const colorsToInsert = colors.map(color_code => ({
      category_id,
      color_code,
      status: 'Active',
      seller: req.user._id
    }));

    const createdColors = await Color.insertMany(colorsToInsert);

    res.status(201).json({ success: true, data: createdColors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update single color
// @route   PUT /api/colors/:id
// @access  Private
const updateColor = async (req, res) => {
  try {
    const { color_code, status } = req.body;

    const color = await Color.findOne({ _id: req.params.id, seller: req.user._id });

    if (!color) {
      return res.status(404).json({ message: 'Color not found' });
    }

    if (color_code) color.color_code = color_code;
    if (status) color.status = status;

    await color.save();

    res.status(200).json({ success: true, data: color });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete single color
// @route   DELETE /api/colors/:id
// @access  Private
const deleteColor = async (req, res) => {
  try {
    const color = await Color.findOne({ _id: req.params.id, seller: req.user._id });

    if (!color) {
      return res.status(404).json({ message: 'Color not found' });
    }

    await color.deleteOne();

    res.status(200).json({ success: true, message: 'Color removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllColors,
  getColorsByCategory,
  createColorsBulk,
  updateColor,
  deleteColor
};
