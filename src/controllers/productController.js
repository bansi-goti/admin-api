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

    // RBAC: If user is not admin, they only see their own products
    if (req.user && req.user.role !== 'admin') {
      query.seller = req.user._id;
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

    // RBAC: Verify ownership if not admin
    if (req.user && req.user.role !== 'admin' && product.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this product' });
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
      tags,
      productId,
      productType,
      description,
      barcode,
      costPrice,
      discountPrice,
      discountPercentage,
      commission,
      lowStockAlert,
      weight,
      metaTitle,
      metaDescription,
      focusKeyword,
      enableInternationalPricing,
      enableInternationalShipping,
      shippingType,
      variants,
      countryPricing,
      countryShipping,
      enable360,
      showOnHomepage,
      isFeatured,
      isTrending
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

    let threeSixtyImagesPaths = [];
    if (req.files && req.files['threeSixtyImages']) {
      threeSixtyImagesPaths = req.files['threeSixtyImages'].map(file => `/uploads/${file.filename}`);
    }

    let videoPath = '';
    if (req.files && req.files['video']) {
      videoPath = `/uploads/${req.files['video'][0].filename}`;
    }

    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    // Parse JSON stringified arrays from FormData
    const parseJSON = (val) => {
      if (!val) return [];
      if (typeof val !== 'string') return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return [];
      }
    };

    const parsedVariants = parseJSON(variants);
    const parsedCountryPricing = parseJSON(countryPricing);
    const parsedCountryShipping = parseJSON(countryShipping);

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
      subcategory,
      productId,
      productType,
      description,
      barcode,
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
      discountPercentage: discountPercentage ? parseFloat(discountPercentage) : 0,
      commission: commission ? parseFloat(commission) : undefined,
      lowStockAlert: lowStockAlert ? parseInt(lowStockAlert) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      metaTitle,
      metaDescription,
      focusKeyword,
      enableInternationalPricing: enableInternationalPricing === 'true' || enableInternationalPricing === true,
      enableInternationalShipping: enableInternationalShipping === 'true' || enableInternationalShipping === true,
      shippingType,
      variants: parsedVariants,
      countryPricing: parsedCountryPricing,
      countryShipping: parsedCountryShipping,
      videoUrl: videoPath || videoUrl,
      enable360: enable360 === 'true' || enable360 === true,
      threeSixtyImages: threeSixtyImagesPaths,
      showOnHomepage: showOnHomepage === 'true' || showOnHomepage === true,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isTrending: isTrending === 'true' || isTrending === true,
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

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // RBAC: Verify ownership if not admin
    if (req.user && req.user.role !== 'admin' && product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

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

    // RBAC: Verify ownership if not admin
    if (req.user && req.user.role !== 'admin' && product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }};

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
      tags,
      productId,
      productType,
      description,
      barcode,
      costPrice,
      discountPrice,
      discountPercentage,
      commission,
      lowStockAlert,
      weight,
      metaTitle,
      metaDescription,
      focusKeyword,
      enableInternationalPricing,
      enableInternationalShipping,
      shippingType,
      variants,
      countryPricing,
      countryShipping,
      enable360,
      showOnHomepage,
      isFeatured,
      isTrending
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // RBAC: Verify ownership if not admin
    if (req.user && req.user.role !== 'admin' && product.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
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

    if (productId !== undefined) product.productId = productId;
    if (productType !== undefined) product.productType = productType;
    if (description !== undefined) product.description = description;
    if (barcode !== undefined) product.barcode = barcode;
    if (costPrice !== undefined) product.costPrice = costPrice ? parseFloat(costPrice) : undefined;
    if (discountPrice !== undefined) product.discountPrice = discountPrice ? parseFloat(discountPrice) : undefined;
    if (discountPercentage !== undefined) product.discountPercentage = discountPercentage ? parseFloat(discountPercentage) : 0;
    if (commission !== undefined) product.commission = commission ? parseFloat(commission) : undefined;
    if (lowStockAlert !== undefined) product.lowStockAlert = lowStockAlert ? parseInt(lowStockAlert) : undefined;
    if (weight !== undefined) product.weight = weight ? parseFloat(weight) : undefined;
    if (metaTitle !== undefined) product.metaTitle = metaTitle;
    if (metaDescription !== undefined) product.metaDescription = metaDescription;
    if (focusKeyword !== undefined) product.focusKeyword = focusKeyword;
    if (enableInternationalPricing !== undefined) product.enableInternationalPricing = enableInternationalPricing === 'true' || enableInternationalPricing === true;
    if (enableInternationalShipping !== undefined) product.enableInternationalShipping = enableInternationalShipping === 'true' || enableInternationalShipping === true;
    if (shippingType !== undefined) product.shippingType = shippingType;

    // Parse JSON stringified arrays from FormData
    const parseJSON = (val) => {
      if (!val) return [];
      if (typeof val !== 'string') return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return [];
      }
    };

    if (variants !== undefined) product.variants = parseJSON(variants);
    if (countryPricing !== undefined) product.countryPricing = parseJSON(countryPricing);
    if (countryShipping !== undefined) product.countryShipping = parseJSON(countryShipping);

    // Process files
    if (req.files && req.files['mainImage']) {
      product.mainImage = `/uploads/${req.files['mainImage'][0].filename}`;
    }

    if (req.files && req.files['gallery']) {
      product.gallery = req.files['gallery'].map(file => `/uploads/${file.filename}`);
    }

    if (req.files && req.files['threeSixtyImages']) {
      product.threeSixtyImages = req.files['threeSixtyImages'].map(file => `/uploads/${file.filename}`);
    }

    if (req.files && req.files['video']) {
      product.videoUrl = `/uploads/${req.files['video'][0].filename}`;
    }

    if (tags) {
      product.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    if (enable360 !== undefined) product.enable360 = enable360 === 'true' || enable360 === true;
    if (showOnHomepage !== undefined) product.showOnHomepage = showOnHomepage === 'true' || showOnHomepage === true;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isTrending !== undefined) product.isTrending = isTrending === 'true' || isTrending === true;

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

// @desc    Bulk create products
// @route   POST /api/products/bulk
// @access  Private
const bulkCreateProducts = async (req, res, next) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty array of products'
      });
    }

    const sellerId = req.user._id;

    // Collect all SKUs from request
    const rawSkus = products.map(p => p.sku).filter(Boolean);
    
    // Find already existing SKUs in the DB
    const existingProducts = await Product.find({ sku: { $in: rawSkus } });
    const existingSkusSet = new Set(existingProducts.map(p => p.sku.toLowerCase()));

    const toInsert = [];
    const skippedSkus = [];
    const seenSkusInBatch = new Set();

    for (const item of products) {
      const sku = item.sku ? item.sku.trim() : '';
      const name = item.name ? item.name.trim() : '';
      const price = parseFloat(item.price);

      // Validation
      if (!name || !sku || isNaN(price)) {
        skippedSkus.push({
          sku: sku || 'No SKU',
          reason: 'Missing name, SKU, or valid price'
        });
        continue;
      }

      const lowerSku = sku.toLowerCase();

      // Check if SKU is duplicate in request batch
      if (seenSkusInBatch.has(lowerSku)) {
        skippedSkus.push({
          sku,
          reason: 'Duplicate SKU in uploaded file'
        });
        continue;
      }

      // Check if SKU exists in Database
      if (existingSkusSet.has(lowerSku)) {
        skippedSkus.push({
          sku,
          reason: 'SKU already exists in database'
        });
        continue;
      }

      seenSkusInBatch.add(lowerSku);

      toInsert.push({
        seller: sellerId,
        name,
        sku,
        price,
        stock: isNaN(parseInt(item.stock)) ? 0 : parseInt(item.stock),
        productId: item.productId || sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        productType: item.productType || 'simple',
        description: item.description || '',
        barcode: item.barcode || '',
        costPrice: isNaN(parseFloat(item.costPrice)) ? undefined : parseFloat(item.costPrice),
        discountPrice: isNaN(parseFloat(item.discountPrice)) ? undefined : parseFloat(item.discountPrice),
        commission: isNaN(parseFloat(item.commission)) ? undefined : parseFloat(item.commission),
        lowStockAlert: isNaN(parseInt(item.lowStockAlert)) ? undefined : parseInt(item.lowStockAlert),
        weight: isNaN(parseFloat(item.weight)) ? undefined : parseFloat(item.weight),
        metaTitle: item.metaTitle || '',
        metaDescription: item.metaDescription || '',
        focusKeyword: item.focusKeyword || '',
        status: 'Pending'
      });
    }

    let createdProducts = [];
    if (toInsert.length > 0) {
      createdProducts = await Product.insertMany(toInsert);
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdProducts.length} products.`,
      createdCount: createdProducts.length,
      skippedCount: skippedSkus.length,
      skippedDetails: skippedSkus
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
  bulkCreateProducts
};
