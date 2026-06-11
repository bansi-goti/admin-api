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
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Product not found (Invalid ID format)' });
    }

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
      basePrice,
      stock,
      totalStock,
      category,
      subcategory,
      status,
      tags
    } = req.body;

    const actualPrice = price || basePrice;
    const actualStock = stock || totalStock || 0;

    // Check if product with SKU already exists
    const existingProduct = await Product.findOne({ sku: { $regex: new RegExp(`^${sku}$`, 'i') } });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'Product with this SKU already exists' });
    }

    let mainImagePath = '';
    if (req.files && req.files['mainImage']) {
      mainImagePath = `/uploads/${req.files['mainImage'][0].filename}`;
    }

    let galleryPaths = [];
    if (req.files && req.files['gallery']) {
      galleryPaths = req.files['gallery'].map(file => `/uploads/${file.filename}`);
    }

    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    const productData = {
      name,
      sku,
      price: actualPrice,
      stock: actualStock,
      status: status || 'Pending',
      mainImage: mainImagePath,
      gallery: galleryPaths,
      tags: parsedTags,
      seller: req.user._id,
      subcategory
    };

    // Only add category if it's not a placeholder "string" and has length
    if (category && category !== 'string') {
      productData.category = category;
    }

    const product = await Product.create(productData);

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

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Product not found (Invalid ID format)' });
    }

    const {
      name,
      sku,
      price,
      basePrice,
      stock,
      totalStock,
      category,
      subcategory,
      status,
      tags
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Update fields
    if (name) product.name = name;
    if (sku) product.sku = sku;
    
    const actualPrice = price || basePrice;
    if (actualPrice !== undefined) product.price = actualPrice;

    const actualStock = stock || totalStock;
    if (actualStock !== undefined) product.stock = actualStock;

    if (status) product.status = status;
    if (subcategory !== undefined) product.subcategory = subcategory;

    if (category && category !== 'string') {
      product.category = category;
    }

    // Process files
    if (req.files && req.files['mainImage']) {
      product.mainImage = `/uploads/${req.files['mainImage'][0].filename}`;
    }

    if (req.files && req.files['gallery']) {
      product.gallery = req.files['gallery'].map(file => `/uploads/${file.filename}`);
    }

    if (tags) {
      product.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    const updatedProduct = await product.save();

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};
