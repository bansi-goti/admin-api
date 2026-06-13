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

    const review = await Review.findByIdAndUpdate(id, { status }, { new: true });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating review status' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

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
