const Size = require('../models/Size');
const Category = require('../models/Category');

// @desc    Get all sizes
// @route   GET /api/sizes
// @access  Private
const getAllSizes = async (req, res) => {
  try {
    const sizes = await Size.find({ seller: req.user._id })
      .populate('category_id', 'name image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: sizes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sizes by category
// @route   GET /api/sizes/:categoryId
// @access  Private
const getSizesByCategory = async (req, res) => {
  try {
    const sizes = await Size.find({ 
      category_id: req.params.categoryId,
      seller: req.user._id 
    });

    res.status(200).json({
      success: true,
      data: sizes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create sizes in bulk
// @route   POST /api/sizes/bulk
// @access  Private
const createSizesBulk = async (req, res) => {
  try {
    const { category_id, sizes } = req.body;

    if (!category_id || !sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({ message: 'Category ID and sizes array are required' });
    }

    // Verify category exists and belongs to seller
    const category = await Category.findOne({ _id: category_id, seller: req.user._id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const sizesToInsert = sizes.map(size_value => ({
      category_id,
      size_value,
      seller: req.user._id
    }));

    // Avoid duplicates for the same category?
    // Mongoose insertMany allows partial inserts if ordered: false, but simple loop/check might be better.
    // For simplicity, we just insert them all. The frontend will show them.
    const createdSizes = await Size.insertMany(sizesToInsert);

    res.status(201).json({ success: true, data: createdSizes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update single size
// @route   PUT /api/sizes/:id
// @access  Private
const updateSize = async (req, res) => {
  try {
    const { size_value } = req.body;

    const size = await Size.findOne({ _id: req.params.id, seller: req.user._id });

    if (!size) {
      return res.status(404).json({ message: 'Size not found' });
    }

    if (size_value) size.size_value = size_value;

    await size.save();

    res.status(200).json({ success: true, data: size });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete single size
// @route   DELETE /api/sizes/:id
// @access  Private
const deleteSize = async (req, res) => {
  try {
    const size = await Size.findOne({ _id: req.params.id, seller: req.user._id });

    if (!size) {
      return res.status(404).json({ message: 'Size not found' });
    }

    await size.deleteOne();

    res.status(200).json({ success: true, message: 'Size removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllSizes,
  getSizesByCategory,
  createSizesBulk,
  updateSize,
  deleteSize
};
