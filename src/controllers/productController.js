const Product = require('../models/Product');

// @desc    Get all products (with pagination & search)
// @route   GET /api/products
// @access  Private
const getAllProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('seller', 'name email username fullName')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        totalData: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: products,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email username fullName')
      .populate('category', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      price,
      stock,
      category,
      status,
      mainImage,
      gallery,
      tags
    } = req.body;

    // Check if product with SKU already exists
    const existingProduct = await Product.findOne({ sku: { $regex: new RegExp(`^${sku}$`, 'i') } });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'Product with this SKU already exists' });
    }

    const product = await Product.create({
      name,
      sku,
      price,
      stock: stock || 0,
      category,
      status: status || 'Pending',
      mainImage,
      gallery: gallery || [],
      tags: tags || [],
      seller: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product status
// @route   PATCH /api/products/:id/status
// @access  Private (Admin only ideally, but using protect)
const updateProductStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      data: product,
      message: `Product status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProductStatus,
  deleteProduct,
};
