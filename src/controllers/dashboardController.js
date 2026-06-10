const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// Helper to calculate percentage change
const calculateTrend = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
};

// Helper to format trend
const formatTrend = (trend) => {
  if (trend > 0) return `↑ ${trend}%`;
  if (trend < 0) return `↓ ${Math.abs(trend)}%`;
  return `↑ 0%`;
};

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user._id;
    const { timeframe } = req.query; // 'today', 'monthly', 'yearly', 'all'

    // Time boundaries
    const now = new Date();
    let startOfCurrent, startOfPrevious, endOfPrevious;

    if (timeframe === 'today') {
      startOfCurrent = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startOfPrevious = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endOfPrevious = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (timeframe === 'yearly') {
      startOfCurrent = new Date(now.getFullYear(), 0, 1);
      startOfPrevious = new Date(now.getFullYear() - 1, 0, 1);
      endOfPrevious = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (timeframe === 'all') {
      startOfCurrent = new Date(0);
      startOfPrevious = new Date(0);
      endOfPrevious = new Date(0);
    } else {
      // Default: monthly
      startOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfPrevious = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endOfPrevious = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    // Queries
    const baseQuery = role === 'admin' ? {} : { seller: userId };
    const userQuery = role === 'admin' ? { role: { $in: ['subadmin', 'user'] } } : { _id: userId };

    const currentIntervalQuery = { ...baseQuery, createdAt: { $gte: startOfCurrent } };
    const previousIntervalQuery = { ...baseQuery, createdAt: { $gte: startOfPrevious, $lte: endOfPrevious } };
    if (timeframe === 'all') previousIntervalQuery.createdAt = { $lt: new Date(0) };

    const userCurrentIntervalQuery = { ...userQuery, createdAt: { $gte: startOfCurrent } };
    const userPreviousIntervalQuery = { ...userQuery, createdAt: { $gte: startOfPrevious, $lte: endOfPrevious } };
    if (timeframe === 'all') userPreviousIntervalQuery.createdAt = { $lt: new Date(0) };

    const [
      totalOrdersCurrent, prevTotalOrders,
      totalProductsOverall, prevTotalProducts,
      outOfStockProducts,
      totalSellersCurrent, prevTotalSellers,
      pendingOrdersCurrent, prevPendingOrders,
      completedOrdersCurrent, cancelledOrdersCurrent,
      ordersCurrent, ordersPrevious,
      topProductsData,
      recentOrdersData
    ] = await Promise.all([
      Order.countDocuments(currentIntervalQuery),
      Order.countDocuments(previousIntervalQuery),
      Product.countDocuments(baseQuery), // Product count is always overall catalog
      Product.countDocuments(timeframe === 'all' ? { createdAt: { $lt: new Date(0) } } : { ...baseQuery, createdAt: { $lte: endOfPrevious } }),
      Product.countDocuments({ ...baseQuery, stock: { $lte: 0 } }),
      User.countDocuments(userCurrentIntervalQuery),
      User.countDocuments(userPreviousIntervalQuery),
      Order.countDocuments({ ...currentIntervalQuery, status: 'Pending' }),
      Order.countDocuments({ ...previousIntervalQuery, status: 'Pending' }),
      Order.countDocuments({ ...currentIntervalQuery, status: 'Completed' }),
      Order.countDocuments({ ...currentIntervalQuery, status: 'Cancelled' }),
      Order.find(currentIntervalQuery).populate({ path: 'items.product', populate: { path: 'category' } }),
      Order.find(previousIntervalQuery),
      Product.find(baseQuery).sort({ sales: -1 }).limit(5),
      Order.find(currentIntervalQuery).sort({ createdAt: -1 }).limit(5).populate('items.product')
    ]);

    // Revenue & Profit
    const totalRevenueCurrent = ordersCurrent.reduce((acc, order) => acc + order.totalAmount, 0);
    const totalRevenuePrev = ordersPrevious.reduce((acc, order) => acc + order.totalAmount, 0);

    const totalProfitCurrent = ordersCurrent.reduce((acc, order) => {
      const p = role === 'admin' ? (order.profit || 0) : (order.sellerEarning || 0);
      return acc + p;
    }, 0);
    const totalProfitPrev = ordersPrevious.reduce((acc, order) => {
      const p = role === 'admin' ? (order.profit || 0) : (order.sellerEarning || 0);
      return acc + p;
    }, 0);

    const netAmountReceived = ordersCurrent.filter(o => o.status === 'Delivered').reduce((acc, o) => acc + (o.sellerEarning || 0), 0);
    const pendingAmount = ordersCurrent.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').reduce((acc, o) => acc + (o.sellerEarning || 0), 0);

    // Items Sold
    const itemsSoldCurrent = ordersCurrent.reduce((acc, order) => {
      return acc + (order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0);
    }, 0);
    const itemsSoldPrev = ordersPrevious.reduce((acc, order) => {
      return acc + (order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0);
    }, 0);

    // Unique Customers
    const uniqueCustomersCurrent = new Set(ordersCurrent.map(order => order.customer.name)).size;
    const uniqueCustomersPrev = new Set(ordersPrevious.map(order => order.customer.name)).size;

    // Average Order Value
    const currentAOV = ordersCurrent.length > 0 ? totalRevenueCurrent / ordersCurrent.length : 0;
    const prevAOV = ordersPrevious.length > 0 ? totalRevenuePrev / ordersPrevious.length : 0;

    // Trends
    const trends = {
      revenue: formatTrend(calculateTrend(totalRevenueCurrent, totalRevenuePrev)),
      profit: formatTrend(calculateTrend(totalProfitCurrent, totalProfitPrev)),
      orders: formatTrend(calculateTrend(totalOrdersCurrent, prevTotalOrders)),
      products: formatTrend(calculateTrend(totalProductsOverall, prevTotalProducts)),
      customers: formatTrend(calculateTrend(uniqueCustomersCurrent, uniqueCustomersPrev)),
      subadmins: formatTrend(calculateTrend(totalSellersCurrent, prevTotalSellers)),
      pending: formatTrend(calculateTrend(pendingOrdersCurrent, prevPendingOrders)),
      aov: formatTrend(calculateTrend(currentAOV, prevAOV)),
      itemsSold: formatTrend(calculateTrend(itemsSoldCurrent, itemsSoldPrev))
    };

    // Chart Data Generation
    const revenueByInterval = {};
    const profitByInterval = {};
    const ordersByInterval = {};
    const revenueTrendArray = [];
    const profitTrendArray = [];
    const ordersTrendArray = [];
    const barChartArray = [];

    const categoryMap = {}; // For category doughnut chart

    ordersCurrent.forEach(order => {
      // Category aggregation
      if (order.items) {
        order.items.forEach(item => {
          if (item.product && item.product.category) {
            const catName = item.product.category.name || 'Uncategorized';
            if (!categoryMap[catName]) categoryMap[catName] = 0;
            categoryMap[catName] += item.price * item.quantity;
          }
        });
      }
    });

    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    const totalCategoryRevenue = Object.values(categoryMap).reduce((a, b) => a + b, 0);
    const categoryData = Object.keys(categoryMap).map((catName, idx) => {
      const val = categoryMap[catName];
      const percent = totalCategoryRevenue > 0 ? ((val / totalCategoryRevenue) * 100).toFixed(1) + '%' : '0%';
      return {
        name: catName,
        value: val,
        displayValue: `₹${val.toLocaleString('en-IN')}`,
        percent,
        color: colors[idx % colors.length]
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5); // top 5 categories

    // Chart interval logic
    if (timeframe === 'today') {
      for (let i = 0; i <= now.getHours(); i++) {
        const key = i < 10 ? `0${i}:00` : `${i}:00`;
        revenueByInterval[key] = 0;
        profitByInterval[key] = 0;
        ordersByInterval[key] = 0;
      }
      ordersCurrent.forEach(order => {
        const h = new Date(order.createdAt).getHours();
        const key = h < 10 ? `0${h}:00` : `${h}:00`;
        if (revenueByInterval[key] !== undefined) {
          revenueByInterval[key] += order.totalAmount;
          profitByInterval[key] += role === 'admin' ? (order.profit || 0) : (order.sellerEarning || 0);
          ordersByInterval[key] += 1;
        }
      });
    } else if (timeframe === 'yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i <= now.getMonth(); i++) {
        revenueByInterval[months[i]] = 0;
        profitByInterval[months[i]] = 0;
        ordersByInterval[months[i]] = 0;
      }
      ordersCurrent.forEach(order => {
        const m = new Date(order.createdAt).getMonth();
        if (revenueByInterval[months[m]] !== undefined) {
          revenueByInterval[months[m]] += order.totalAmount;
          profitByInterval[months[m]] += role === 'admin' ? (order.profit || 0) : (order.sellerEarning || 0);
          ordersByInterval[months[m]] += 1;
        }
      });
    } else if (timeframe === 'all') {
      ordersCurrent.forEach(order => {
        const y = new Date(order.createdAt).getFullYear().toString();
        if (revenueByInterval[y] === undefined) {
          revenueByInterval[y] = 0;
          profitByInterval[y] = 0;
          ordersByInterval[y] = 0;
        }
        revenueByInterval[y] += order.totalAmount;
        profitByInterval[y] += role === 'admin' ? (order.profit || 0) : (order.sellerEarning || 0);
        ordersByInterval[y] += 1;
      });
    } else {
      // Monthly
      for (let i = 1; i <= now.getDate(); i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        revenueByInterval[key] = 0;
        profitByInterval[key] = 0;
        ordersByInterval[key] = 0;
      }
      ordersCurrent.forEach(order => {
        const key = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        if (revenueByInterval[key] !== undefined) {
          revenueByInterval[key] += order.totalAmount;
          profitByInterval[key] += role === 'admin' ? (order.profit || 0) : (order.sellerEarning || 0);
          ordersByInterval[key] += 1;
        }
      });
    }

    for (const [key, value] of Object.entries(revenueByInterval)) {
      revenueTrendArray.push({ name: key, revenue: value, profit: profitByInterval[key] });
      barChartArray.push({ name: key, date: key, revenue: value, profit: profitByInterval[key] });
    }
    for (const [key, value] of Object.entries(ordersByInterval)) {
      ordersTrendArray.push({ name: key, value });
    }

    // Top Products
    const topProducts = topProductsData.map(p => ({
      id: p._id,
      name: p.name,
      code: p.code,
      orders: p.sales || 0,
      price: `₹${(p.price || 0).toLocaleString('en-IN')}`,
      img: p.mainImage || 'https://via.placeholder.com/100'
    }));

    // Formatting Recent Orders
    const recentOrders = recentOrdersData.map(order => {
      const firstItem = (order.items && order.items.length > 0) ? order.items[0] : null;
      let productStr = 'N/A';
      let img = 'https://via.placeholder.com/100';
      let qty = 1;

      if (firstItem && firstItem.product) {
        productStr = firstItem.product.name;
        img = firstItem.product.mainImage || img;
        qty = firstItem.quantity;
      }

      return {
        id: order.orderId,
        customer: order.customer.name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customer.name)}&background=random`,
        product: productStr,
        img: img,
        qty: qty,
        amount: `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
        earning: `₹${(order.sellerEarning || 0).toLocaleString('en-IN')}`,
        status: order.status,
        date: new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
    });

    res.json({
      code: 200,
      stats: {
        totalRevenue: totalRevenueCurrent,
        totalProfit: totalProfitCurrent,
        totalOrders: totalOrdersCurrent,
        totalProducts: totalProductsOverall,
        outOfStockProducts: outOfStockProducts,
        totalCustomers: uniqueCustomersCurrent,
        totalSellers: totalSellersCurrent,
        pendingOrders: pendingOrdersCurrent,
        completedOrders: completedOrdersCurrent,
        cancelledOrders: cancelledOrdersCurrent,
        averageOrderValue: Math.round(currentAOV),
        itemsSold: itemsSoldCurrent,
        netAmountReceived: netAmountReceived,
        pendingAmount: pendingAmount,
      },
      trends,
      chartData: {
        revenueTrend: revenueTrendArray,
        ordersTrend: ordersTrendArray,
        barChart: barChartArray,
        categoryData: categoryData
      },
      topProducts,
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
