const Order = require('../models/Order');

// @desc    Get earnings data with date filters
// @route   GET /api/earnings
// @access  Private
const getEarnings = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to current month if dates not provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    
    if (start && end) {
      end.setHours(23, 59, 59, 999);
    }

    const query = {
      createdAt: { $gte: start, $lte: end }
    };

    // If subadmin (seller), only fetch their orders
    if (req.user && req.user.role !== 'admin') {
      query.seller = req.user._id;
    }

    const orders = await Order.find(query).sort({ createdAt: 1 });

    // Aggregate values
    let totalEarnings = 0; // The total sellerEarning from completed/delivered orders
    let grossSales = 0; // Total order value
    let totalOrdersCount = orders.length;
    let pendingPayout = 0;
    let returnsRefunds = 0;
    let platformFees = 0;

    // Daily aggregations
    const dailyDataMap = {};

    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyDataMap[dateKey]) {
        dailyDataMap[dateKey] = {
          date: new Date(dateKey).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          orders: 0,
          gross: 0,
          discounts: 0, // Placeholder
          returns: 0,
          net: 0,
          status: 'Completed' // Can be dynamic based on day's main status
        };
      }

      dailyDataMap[dateKey].orders += 1;
      dailyDataMap[dateKey].gross += order.totalAmount || 0;
      
      grossSales += order.totalAmount || 0;

      if (['Refunded', 'Cancelled', 'Returned'].includes(order.status)) {
        returnsRefunds += order.totalAmount || 0;
        dailyDataMap[dateKey].returns += order.totalAmount || 0;
      } else if (order.status === 'Delivered' || order.status === 'Completed') {
        totalEarnings += order.sellerEarning || (order.totalAmount * 0.85); // Fallback if sellerEarning missing
        platformFees += (order.totalAmount - (order.sellerEarning || (order.totalAmount * 0.85)));
        dailyDataMap[dateKey].net += order.sellerEarning || (order.totalAmount * 0.85);
      } else {
        pendingPayout += order.sellerEarning || (order.totalAmount * 0.85);
        dailyDataMap[dateKey].net += order.sellerEarning || (order.totalAmount * 0.85);
      }
    });

    const averageOrderValue = totalOrdersCount > 0 ? (grossSales / totalOrdersCount) : 0;

    // Prepare chart data (Map to array and sort by date)
    const historyData = Object.values(dailyDataMap).reverse(); // Newest first for history table
    
    // Chart data (oldest first)
    const chartData = Object.keys(dailyDataMap).sort().map(key => ({
      name: new Date(key).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: dailyDataMap[key].net
    }));

    res.status(200).json({
      success: true,
      data: {
        cards: {
          totalEarnings,
          netEarnings: totalEarnings, // Adjust as needed based on tax/deductions
          totalOrders: totalOrdersCount,
          averageOrderValue,
          pendingPayout
        },
        summary: {
          grossSales,
          returnsRefunds,
          discountsGiven: 0, // Hardcoded for now unless stored in DB
          shippingEarnings: 0, // Hardcoded for now
          otherEarnings: 0, // Hardcoded
          platformFees
        },
        chartData,
        historyData
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEarnings
};
