exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) {
      return res.status(200).json({ success: true, data: [] });
    }
    const reviews = await Review.find({ customerId: userId }).populate('productId', '_id name mainImage').lean();
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user reviews' });
  }
};

const Review = require('../models/Review');
const Product = require('../models/Product');

exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, minRating, startDate, endDate } = req.query;
    
    // Build filter
    let filter = {};
    if (status) filter.status = status;
    if (minRating) filter.rating = { $gte: parseInt(minRating) };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    // RBAC: If user is not admin, they only see reviews for their own products
    if (req.user && req.user.role !== 'admin') {
      const sellerProducts = await Product.find({ seller: req.user._id }).select('_id');
      const sellerProductIds = sellerProducts.map(p => p._id);
      filter.productId = { $in: sellerProductIds };
    }
    
    // For search, we might need to populate first or do a simple text search if applicable.
    // For simplicity, we skip full-text search here or filter by Product/User names after population
    // if needed. Real implementations would use text indexes or lookup aggregates.
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch reviews
    const reviews = await Review.find(filter)
      .populate('customerId', 'name email avatar')
      .populate({
        path: 'productId',
        select: 'name category price mainImage images',
        populate: { path: 'category', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalItems = await Review.countDocuments(filter);

    // Calculate Stats
    const totalReviews = await Review.countDocuments(filter);
    const approvedCount = await Review.countDocuments({ ...filter, status: 'approved' });
    const pendingCount = await Review.countDocuments({ ...filter, status: 'pending' });
    const rejectedCount = await Review.countDocuments({ ...filter, status: 'rejected' });
    
    const allApproved = await Review.find({ ...filter, status: 'approved' }, 'rating');
    const averageRating = allApproved.length > 0 
      ? allApproved.reduce((acc, curr) => acc + curr.rating, 0) / allApproved.length 
      : 0;

    const stats = {
      totalReviews,
      approvedCount,
      pendingCount,
      rejectedCount,
      averageRating
    };

    // Rating Distribution
    const ratingDistribution = await Review.aggregate([
      { $match: filter },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    // Top Products
    const topProducts = await Review.aggregate([
      { $match: { ...filter, status: 'approved' } },
      { $group: { 
          _id: "$productId", 
          avgRating: { $avg: "$rating" }, 
          reviewCount: { $sum: 1 } 
        } 
      },
      { $sort: { reviewCount: -1, avgRating: -1 } },
      { $limit: 5 }
    ]);
    
    // Populate top products
    await Product.populate(topProducts, { path: '_id', select: 'name mainImage images category' });
    const formattedTopProducts = topProducts.map(tp => ({
      ...tp._id._doc,
      avgRating: tp.avgRating,
      reviewCount: tp.reviewCount
    }));

    res.status(200).json({
      success: true,
      data: reviews,
      stats,
      ratingDistribution,
      topProducts: formattedTopProducts,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
        currentPage: pageNum
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Server error fetching reviews' });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    let review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    // RBAC: Verify ownership if not admin
    if (req.user && req.user.role !== 'admin') {
      const product = await Product.findById(review.productId);
      if (!product || product.seller.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this review' });
      }
    }

    review = await Review.findByIdAndUpdate(id, { status }, { new: true });

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating review status' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    let review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    // RBAC: Verify ownership if not admin
    if (req.user && req.user.role !== 'admin') {
      const product = await Product.findById(review.productId);
      if (!product || product.seller.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
      }
    }

    await review.deleteOne();

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting review' });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId, status: 'approved' })
      .populate('customerId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching product reviews' });
  }
};

exports.getFeaturedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' })
      .populate('customerId', 'name avatar email location')
      .populate('productId', 'name mainImage')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching featured reviews' });
  }
};

exports.checkUserPendingReviews = async (req, res) => {
  try {
    const Order = require('../models/Order');
    const userEmail = req.user.email;
    const userId = req.user._id;

    // Find all Delivered orders for this user
    const deliveredOrders = await Order.find({
      'customer.email': userEmail,
      status: 'Delivered'
    }).populate('items.product').sort({ updatedAt: -1 });

    if (!deliveredOrders || deliveredOrders.length === 0) {
      return res.status(200).json({ success: true, pendingItem: null });
    }

    for (const order of deliveredOrders) {
      for (const item of (order.items || [])) {
        if (!item.product) continue;
        const prodId = item.product._id || item.product;

        const existingReview = await Review.findOne({
          customerId: userId,
          productId: prodId
        });

        if (!existingReview) {
          return res.status(200).json({
            success: true,
            pendingItem: {
              orderId: order._id,
              orderNumber: order.orderId,
              productId: prodId,
              productName: item.product.name || 'Purchased Item',
              productImage: item.product.mainImage || (Array.isArray(item.product.images) ? item.product.images[0] : ''),
              productPrice: item.price
            }
          });
        }
      }
    }

    res.status(200).json({ success: true, pendingItem: null });
  } catch (error) {
    console.error('Error checking pending reviews:', error);
    res.status(500).json({ success: false, message: 'Server error checking pending reviews' });
  }
};

exports.createReview = async (req, res) => {
  try {
    const { productId, customerId, rating, comment, images, videos, orderId } = req.body;
    const mongoose = require('mongoose');

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    let finalProductId = productId;
    if (!finalProductId || !mongoose.Types.ObjectId.isValid(finalProductId)) {
      const firstProd = await Product.findOne();
      if (firstProd) {
        finalProductId = firstProd._id;
      } else {
        return res.status(400).json({ success: false, message: 'Valid product ID is required' });
      }
    }

    let finalOrderId = orderId;
    if (finalOrderId && !mongoose.Types.ObjectId.isValid(finalOrderId)) {
      finalOrderId = null;
    }

    const finalCustomerId = customerId || (req.user ? req.user._id : null);
    if (!finalCustomerId) {
      return res.status(401).json({ success: false, message: 'Authentication required to submit review' });
    }

    // Amazon / Flipkart 1-Review-Per-Item Check
    let existingReview = await Review.findOne({
      customerId: finalCustomerId,
      productId: finalProductId
    });

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment !== undefined ? comment : existingReview.comment;
      if (images && images.length > 0) existingReview.images = images;
      if (videos && videos.length > 0) existingReview.videos = videos;
      if (finalOrderId) existingReview.orderId = finalOrderId;
      existingReview.status = 'approved';
      existingReview.verified = true;
      await existingReview.save();

      return res.status(200).json({
        success: true,
        message: 'Your review has been updated successfully!',
        data: existingReview,
        isUpdate: true
      });
    }

    const review = await Review.create({
      customerId: finalCustomerId,
      productId: finalProductId,
      orderId: finalOrderId || null,
      rating,
      comment: comment || '',
      images: images || [],
      videos: videos || [],
      status: 'approved',
      verified: Boolean(finalOrderId),
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted successfully.',
      data: review,
      isUpdate: false
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Server error creating review', error: error.message });
  }
};

exports.seedDummyReviews = async (req, res) => {
  try {
    const User = require('../models/User');
    const Product = require('../models/Product');
    const Review = require('../models/Review');

    const dummyCustomers = [
      { name: 'Bansi Cus', email: 'bansi_cus@gmail.com' },
      { name: 'Priya Sharma', email: 'priya.sharma@gmail.com' },
      { name: 'Ananya Roy', email: 'ananya.r@gmail.com' },
      { name: 'Meera Patel', email: 'meera.patel@gmail.com' },
      { name: 'Kavita Singh', email: 'kavita.s@gmail.com' },
    ];

    const reviewComments = [
      "Absolutely breathtaking craftsmanship! The gold shine and diamond clarity exceeded all my expectations. Highly recommended!",
      "Purchased this for a special occasion. Fits perfectly, hallmarked quality, and express delivery was super fast!",
      "Stunning design! The finish is extremely premium and skin-safe. Getting so many compliments from my friends.",
      "100% authentic BIS hallmarked gold and certified diamonds. Exceptional concierge service from Nayzora!",
      "Pure luxury in a box! Packaging was beautiful and the jewelry piece looks even better in real life.",
      "Unbeatable value for money. Sparkling certified diamonds and very comfortable to wear daily."
    ];

    const customerUserMap = [];
    for (const cust of dummyCustomers) {
      let u = await User.findOne({ email: cust.email });
      if (!u) {
        u = await User.create({
          email: cust.email,
          name: cust.name,
          role: 'user',
          password: '$2a$10$e80yqF0M5N99hZ5j4fQ1.O7W92w3M1k5'
        });
      }
      customerUserMap.push(u);
    }

    const products = await Product.find();
    let addedCount = 0;

    for (const prod of products) {
      const numToAdd = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numToAdd; i++) {
        const userObj = customerUserMap[i % customerUserMap.length];
        const comment = reviewComments[(addedCount + i) % reviewComments.length];
        const rating = 5 - (i % 2 === 0 ? 0 : 1);

        const exists = await Review.findOne({ customerId: userObj._id, productId: prod._id });
        if (!exists) {
          await Review.create({
            customerId: userObj._id,
            productId: prod._id,
            rating,
            comment,
            status: 'approved',
            verified: true,
            images: prod.mainImage ? [prod.mainImage] : []
          });
          addedCount++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully created ${addedCount} dummy reviews across products!`,
      addedCount
    });
  } catch (error) {
    console.error('Error seeding dummy reviews:', error);
    res.status(500).json({ success: false, message: 'Server error seeding dummy reviews', error: error.message });
  }
};
