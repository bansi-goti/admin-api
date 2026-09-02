const Product = require('../models/Product');
const Category = require('../models/Category');
const mongoose = require('mongoose');

const Advertisement = require('../models/Advertisement');

const applyActiveCampaignDiscounts = async (productsList) => {
  try {
    const activeAds = await Advertisement.find({
      status: { $in: ['Active', 'Approved', 'Scheduled', 'Draft'] },
      product: { $ne: null }
    }).lean();

    if (!activeAds || activeAds.length === 0) return productsList;

    const adMap = {};
    activeAds.forEach(ad => {
      if (ad.product) {
        const pId = ad.product.toString();
        adMap[pId] = ad;
      }
    });

    return productsList.map(p => {
      const pId = p._id ? p._id.toString() : String(p.id || '');
      const activeAd = adMap[pId];
      if (activeAd && activeAd.discountedPrice && activeAd.discountedPrice > 0) {
        p.originalCatalogPrice = p.price;
        p.originalPrice = activeAd.originalPrice || p.price;
        p.discountedPrice = activeAd.discountedPrice;
        p.price = activeAd.discountedPrice;
        p.discountPercentage = activeAd.discountPercentage || Math.round(((p.originalCatalogPrice - activeAd.discountedPrice) / p.originalCatalogPrice) * 100);
        p.campaignActive = true;
      }
      return p;
    });
  } catch (err) {
    console.error('Failed to apply active campaign discounts:', err);
    return productsList;
  }
};




const getAllProducts = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection offline. Please whitelist your IP address in MongoDB Atlas (https://cloud.mongodb.com -> Security -> Network Access -> Add IP 0.0.0.0/0).'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';
    const categoryParam = req.query.category;
    const subcategoryParam = req.query.subcategory;
    const isFeaturedParam = req.query.isFeatured;
    const isTrendingParam = req.query.isTrending;
    const statusParam = req.query.status;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (statusParam) {
      query.status = statusParam;
    }

    if (isFeaturedParam !== undefined) {
      query.isFeatured = isFeaturedParam === 'true' || isFeaturedParam === true;
    }

    if (isTrendingParam !== undefined) {
      query.isTrending = isTrendingParam === 'true' || isTrendingParam === true;
    }

    if (subcategoryParam) {
      query.subcategory = { $regex: subcategoryParam, $options: 'i' };
    }

    if (categoryParam) {
      if (mongoose.Types.ObjectId.isValid(categoryParam)) {
        query.category = categoryParam;
      } else {
        const matchedCats = await Category.find({ name: { $regex: categoryParam, $options: 'i' } });
        if (matchedCats.length > 0) {
          query.category = { $in: matchedCats.map(c => c._id) };
        }
      }
    }

    // RBAC & Status Filtering logic:
    const isSeller = req.user && (req.user.role === 'seller' || req.user.uiRole === 'seller' || req.user.role === 'subadmin');
    const isAdmin = req.user && req.user.role === 'admin';
    const isCustomer = req.user && req.user.role === 'user' && !isSeller;

    if (isAdmin || isCustomer) {
      if (statusParam && statusParam !== 'All Status') {
        query.status = { $regex: '^' + statusParam + '$', $options: 'i' };
      }
      if (req.query.seller) query.seller = req.query.seller;
    } else if (isSeller) {
      query.seller = req.user._id;
      if (statusParam && statusParam !== 'All Status') {
        query.status = { $regex: '^' + statusParam + '$', $options: 'i' };
      }
    } else {
      if (req.query.seller) query.seller = req.query.seller;
    }

    const startIndex = (page - 1) * limit;
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('seller', 'name email username fullName')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const Review = require('../models/Review');
    const productsWithReviews = await Promise.all(
      products.map(async (prod) => {
        const prodObj = prod.toObject();
        const reviews = await Review.find({ productId: prod._id, status: { $ne: 'rejected' } });
        const numReviews = reviews.length;
        let avgRating = 0;
        if (numReviews > 0) {
          const sum = reviews.reduce((acc, item) => acc + (item.rating || 0), 0);
          avgRating = Number((sum / numReviews).toFixed(1));
        } else if (typeof prod.rating === 'number' && prod.rating > 0) {
          avgRating = prod.rating;
        }
        prodObj.rating = avgRating;
        prodObj.ratingScore = avgRating > 0 ? avgRating.toFixed(1) : '0.0';
        prodObj.reviewCount = numReviews;
        return prodObj;
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalData: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: await applyActiveCampaignDiscounts(await (async () => {
          const Wishlist = require('../models/Wishlist');
          const allWishlists = await Wishlist.find({});
          const wishlistCountsMap = {};
          allWishlists.forEach(w => {
            if (w.product) {
              const pIdStr = w.product.toString();
              wishlistCountsMap[pIdStr] = (wishlistCountsMap[pIdStr] || 0) + 1;
            }
          });
          return productsWithReviews.map(prod => {
            prod.wishlistCount = Math.max(prod.wishlistCount || 0, wishlistCountsMap[prod._id.toString()] || 0);
            return prod;
          });
        })()),
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
    const Review = require('../models/Review');
    let product = null;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      product = await Product.findById(req.params.id)
        .populate('seller', 'name email username fullName')
        .populate('category', 'name');
    }

    if (!product) {
      product = await Product.findOne({
        $or: [
          { slug: req.params.id }, { productId: req.params.id },
          { sku: req.params.id }
        ]
      })
        .populate('seller', 'name email username fullName')
        .populate('category', 'name');
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // RBAC & Status Check:
    // Admin can access any product regardless of status.
    // Seller can access their own products regardless of status.
    // Public/Customer can ONLY access products with status 'Approved'.
    const isAdminUser = req.user && req.user.role === 'admin';
    const isSellerOwner = req.user && (
      (product.seller && product.seller._id && product.seller._id.toString() === req.user._id.toString()) ||
      (product.seller && product.seller.toString() === req.user._id.toString())
    );

    const isApprovedStatus = product.status && product.status.toLowerCase() === 'approved';
    if (!isAdminUser && !isSellerOwner && !isApprovedStatus) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const productObj = product.toObject();
    
    // Calculate real rating & reviewCount from Review collection
    const reviews = await Review.find({ productId: product._id, status: { $ne: 'rejected' } });
    const numReviews = reviews.length;
    let avgRating = 0;

    if (numReviews > 0) {
      const sum = reviews.reduce((acc, item) => acc + (item.rating || 0), 0);
      avgRating = Number((sum / numReviews).toFixed(1));
    } else if (typeof product.rating === 'number' && product.rating > 0) {
      avgRating = product.rating;
    }

    productObj.rating = avgRating;
    productObj.ratingScore = avgRating > 0 ? avgRating.toFixed(1) : '0.0';
    productObj.reviewCount = numReviews;

    const Wishlist = require('../models/Wishlist');
    const realWishlistCount = await Wishlist.countDocuments({ product: product._id });
    productObj.wishlistCount = Math.max(product.wishlistCount || 0, realWishlistCount);

    res.status(200).json({
      success: true,
      data: productObj,
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
      isTrending,
      videoUrl
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
      status: (req.user && (req.user.role === 'admin' || req.user.uiRole === 'admin') && status) ? status : 'Pending',
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
      { new: true, returnDocument: 'after', runValidators: true }
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
        category: item.category || undefined,
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
        status: 'Pending',
        mainImage: item.mainImage || '',
        gallery: Array.isArray(item.gallery) ? item.gallery : [],
        threeSixtyImages: Array.isArray(item.threeSixtyImages) ? item.threeSixtyImages : [],
        videoUrl: item.videoUrl || '',
        subcategory: item.subcategory || '',
        discountPercentage: isNaN(parseFloat(item.discountPercentage)) ? 0 : parseFloat(item.discountPercentage),
        enableInternationalPricing: item.enableInternationalPricing === true,
        enableInternationalShipping: item.enableInternationalShipping === true,
        shippingType: item.shippingType || '',
        variants: Array.isArray(item.variants) ? item.variants : [],
        countryPricing: Array.isArray(item.countryPricing) ? item.countryPricing : [],
        countryShipping: Array.isArray(item.countryShipping) ? item.countryShipping : [],
        enable360: item.enable360 === true,
        showOnHomepage: item.showOnHomepage === true,
        isFeatured: item.isFeatured === true,
        isTrending: item.isTrending === true,
        tags: Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []),
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


// @desc    Seed sample products into MongoDB
// @route   GET /api/products/seed
// @access  Public

const seedProducts = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const Category = require('../models/Category');

    let adminUser = await User.findOne({ role: 'admin' });
    const sellerId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();

    let categories = await Category.find({});
    let catId = categories.length > 0 ? categories[0]._id : new mongoose.Types.ObjectId();

    await Product.deleteMany({});

    const sampleProducts = [
      {
        seller: sellerId,
        category: catId,
        name: 'Royal Emerald Diamond Necklace',
        sku: 'ROYAL-EMERALD-01',
        price: 45999,
        costPrice: 55999,
        discountPercentage: 18,
        stock: 25,
        sales: 0,
        rating: 4.9,
        reviewCount: 128,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Necklace', 'Emerald', 'Gold', 'Diamond'],
        mainImage: '/hero_necklace_emerald.png',
        gallery: ['/hero_necklace_emerald.png'],
        description: 'Handcrafted luxury 24K gold emerald necklace set with brilliant cut diamonds.'
      },
      {
        seller: sellerId,
        category: catId,
        name: 'Solitaire Diamond Engagement Ring',
        sku: 'SOLITAIRE-RING-02',
        price: 28500,
        costPrice: 34000,
        discountPercentage: 16,
        stock: 30,
        sales: 0,
        rating: 4.8,
        reviewCount: 94,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Ring', 'Diamond', 'Solitaire', 'Wedding'],
        mainImage: '/arrival_1.png',
        gallery: ['/arrival_1.png'],
        description: 'Timeless solitaire diamond ring crafted in 18K white gold.'
      },
      {
        seller: sellerId,
        category: catId,
        name: 'Heritage Gold Bangle Collection',
        sku: 'HERITAGE-BANGLE-03',
        price: 62000,
        costPrice: 72000,
        discountPercentage: 14,
        stock: 15,
        sales: 0,
        rating: 4.9,
        reviewCount: 156,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Bangle', 'Gold', 'Heritage', 'Traditional'],
        mainImage: '/arrival_2.png',
        gallery: ['/arrival_2.png'],
        description: 'Traditional handcrafted gold bangles with detailed filigree work.'
      },
      {
        seller: sellerId,
        category: catId,
        name: 'Imperial Ruby Drop Earrings',
        sku: 'RUBY-EARRINGS-04',
        price: 18999,
        costPrice: 22999,
        discountPercentage: 17,
        stock: 20,
        sales: 0,
        rating: 4.7,
        reviewCount: 82,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Earrings', 'Ruby', 'Gold', 'Party'],
        mainImage: '/trending_1.png',
        gallery: ['/trending_1.png'],
        description: 'Stunning ruby drop earrings with diamond halo design.'
      },
      {
        seller: sellerId,
        category: catId,
        name: 'Vintage Gold Pendant Set',
        sku: 'GOLD-PENDANT-05',
        price: 34500,
        costPrice: 40000,
        discountPercentage: 13,
        stock: 18,
        sales: 0,
        rating: 4.8,
        reviewCount: 64,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Pendant', 'Gold', 'Vintage'],
        mainImage: '/arrival_3.png',
        gallery: ['/arrival_3.png'],
        description: 'Vintage gold pendant set featuring intricate craftsmanship.'
      },
      {
        seller: sellerId,
        category: catId,
        name: 'Classic Solitaire Platinum Band',
        sku: 'PLAT-BAND-06',
        price: 52000,
        costPrice: 60000,
        discountPercentage: 13,
        stock: 12,
        sales: 0,
        rating: 4.9,
        reviewCount: 45,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Ring', 'Platinum', 'Band'],
        mainImage: '/arrival_4.png',
        gallery: ['/arrival_4.png'],
        description: 'Elegant 950 platinum band with micro-pave diamonds.'
      },
      {
        seller: sellerId,
        category: catId,
        name: 'Luxury Diamond Choker Necklace',
        sku: 'CHOKER-DMD-07',
        price: 89000,
        costPrice: 99000,
        discountPercentage: 10,
        stock: 8,
        sales: 0,
        rating: 5.0,
        reviewCount: 38,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Necklace', 'Choker', 'Diamond'],
        mainImage: '/trending_2.png',
        gallery: ['/trending_2.png'],
        description: 'Opulent diamond choker necklace for special royal occasions.'
      },
      {
        seller: sellerId,
        category: catId,
        name: 'Handcrafted Kundan Earrings',
        sku: 'KUNDAN-EAR-08',
        price: 15500,
        costPrice: 18500,
        discountPercentage: 16,
        stock: 22,
        sales: 0,
        rating: 4.8,
        reviewCount: 52,
        status: 'Approved',
        isFeatured: true,
        isTrending: true,
        tags: ['Earrings', 'Kundan', 'Traditional'],
        mainImage: '/trending_3.png',
        gallery: ['/trending_3.png'],
        description: 'Traditional Indian Kundan earrings with pearl drops.'
      }
    ];

    const created = await Product.insertMany(sampleProducts);

    res.status(200).json({
      success: true,
      message: `Successfully seeded ${created.length} products into MongoDB!`,
      count: created.length
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Increment or decrement public wishlist count for a product
// @route   POST /api/products/:id/wishlist-count
// @access  Public
const updateProductWishlistCount = async (req, res, next) => {
  try {
    const { action } = req.body; // 'add' or 'remove'
    const productId = req.params.id;

    let targetProduct = null;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      targetProduct = await Product.findById(productId);
    }
    if (!targetProduct) {
      targetProduct = await Product.findOne({
        $or: [
          { slug: productId },
          { productId: productId },
          { sku: productId },
          { name: productId }
        ]
      });
    }

    if (!targetProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const currentCount = targetProduct.wishlistCount || 0;
    const delta = action === 'add' ? 1 : -1;
    const newCount = Math.max(0, currentCount + delta);

    targetProduct.wishlistCount = newCount;
    await targetProduct.save();

    res.status(200).json({
      success: true,
      wishlistCount: newCount,
      message: 'Wishlist count updated',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProductWishlistCount,
  getAllProducts,
  seedProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  bulkCreateProducts
};
