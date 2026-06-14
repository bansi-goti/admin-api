const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');

const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const diff = ((current - previous) / previous) * 100;
  return diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
};

const getDetailedAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates or default to 'This Month'
    const currEnd = endDate ? new Date(endDate) : new Date();
    const currStart = startDate ? new Date(startDate) : new Date(currEnd.getFullYear(), currEnd.getMonth(), 1);
    
    // Set End to 23:59:59
    currEnd.setHours(23, 59, 59, 999);
    currStart.setHours(0, 0, 0, 0);

    // Calculate previous period for trends (same duration)
    const duration = currEnd.getTime() - currStart.getTime();
    const prevEnd = new Date(currStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    const isAdmin = req.user.role === 'admin';
    const orderQuery = isAdmin ? {} : { seller: req.user._id };

    // Fetch Orders for Current and Previous Period
    const currentOrders = await Order.find({ 
        ...orderQuery, 
        createdAt: { $gte: currStart, $lte: currEnd } 
    }).populate({ path: 'items.product', populate: { path: 'category' }});
    
    const prevOrders = await Order.find({ 
        ...orderQuery, 
        createdAt: { $gte: prevStart, $lte: prevEnd } 
    });

    // 1. SUMMARY STATS
    const currRevenue = currentOrders.reduce((acc, o) => acc + (isAdmin ? o.totalAmount : (o.sellerEarning || (o.totalAmount * 0.85))), 0);
    const prevRevenue = prevOrders.reduce((acc, o) => acc + (isAdmin ? o.totalAmount : (o.sellerEarning || (o.totalAmount * 0.85))), 0);

    const currProfit = currentOrders.reduce((acc, o) => acc + (isAdmin ? (o.profit || 0) : (o.sellerEarning || (o.totalAmount * 0.85))), 0);
    const prevProfit = prevOrders.reduce((acc, o) => acc + (isAdmin ? (o.profit || 0) : (o.sellerEarning || (o.totalAmount * 0.85))), 0);

    const currItemsSold = currentOrders.reduce((acc, o) => acc + o.items.reduce((sum, item) => sum + item.quantity, 0), 0);
    const prevItemsSold = prevOrders.reduce((acc, o) => acc + o.items.reduce((sum, item) => sum + item.quantity, 0), 0);

    const currAOV = currentOrders.length > 0 ? currRevenue / currentOrders.length : 0;
    const prevAOV = prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0;

    // Repeat Customers Logic
    const currCustomers = {};
    currentOrders.forEach(o => {
        const email = o.customer?.email;
        if (email) {
            currCustomers[email] = (currCustomers[email] || 0) + 1;
        }
    });
    const currRepeatCustomers = Object.values(currCustomers).filter(count => count > 1).length;

    const prevCustomers = {};
    prevOrders.forEach(o => {
        const email = o.customer?.email;
        if (email) {
            prevCustomers[email] = (prevCustomers[email] || 0) + 1;
        }
    });
    const prevRepeatCustomers = Object.values(prevCustomers).filter(count => count > 1).length;

    const summaryStats = {
        totalRevenue: { value: currRevenue, trend: calculateTrend(currRevenue, prevRevenue) },
        totalProfit: { value: currProfit, trend: calculateTrend(currProfit, prevProfit) },
        totalOrders: { value: currentOrders.length, trend: calculateTrend(currentOrders.length, prevOrders.length) },
        avgOrderValue: { value: currAOV, trend: calculateTrend(currAOV, prevAOV) },
        itemsSold: { value: currItemsSold, trend: calculateTrend(currItemsSold, prevItemsSold) },
        repeatCustomers: { value: currRepeatCustomers, trend: calculateTrend(currRepeatCustomers, prevRepeatCustomers) }
    };

    // 2. TIME SERIES DATA (Revenue Overview & Sales Trend)
    const timeMap = {};
    const growthMap = {};
    
    // Group by Date for 'This Month' or similar ranges
    currentOrders.forEach(o => {
        const d = new Date(o.createdAt);
        const key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        
        if (!timeMap[key]) timeMap[key] = { date: key, revenue: 0, profit: 0, orders: 0 };
        if (!growthMap[key]) growthMap[key] = new Set();
        
        timeMap[key].revenue += (isAdmin ? o.totalAmount : (o.sellerEarning || (o.totalAmount * 0.85)));
        timeMap[key].profit += (isAdmin ? (o.profit || 0) : (o.sellerEarning || (o.totalAmount * 0.85)));
        timeMap[key].orders += 1;
        
        if (o.customer?.email) growthMap[key].add(o.customer.email);
    });

    const timeSeriesData = Object.values(timeMap).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    let cumulativeCustomers = 0;
    const customerGrowthData = Object.keys(growthMap).sort((a,b) => new Date(a) - new Date(b)).map(key => {
        cumulativeCustomers += growthMap[key].size;
        return { date: key, count: cumulativeCustomers };
    });

    // 3. PIE CHARTS (Category & Payment Method)
    const categorySales = {};
    const paymentMethods = {};
    const productSales = {};

    currentOrders.forEach(o => {
        // Payment Methods
        const pMethod = o.paymentStatus === 'Paid' ? 'Online Payment' : (o.paymentMethod || 'Unknown');
        if (!paymentMethods[pMethod]) paymentMethods[pMethod] = 0;
        paymentMethods[pMethod] += o.totalAmount;

        // Categories & Products
        o.items.forEach(item => {
            if (item.product) {
                // Category
                const catName = item.product.category?.name || 'Uncategorized';
                if (!categorySales[catName]) categorySales[catName] = 0;
                categorySales[catName] += (item.quantity * item.price);

                // Top Products
                const pid = item.product._id.toString();
                if (!productSales[pid]) {
                    productSales[pid] = {
                        id: pid,
                        name: item.product.name,
                        subtitle: catName,
                        image: item.product.images?.[0] || 'https://via.placeholder.com/40',
                        orders: 0,
                        sold: 0,
                        revenue: 0,
                        profit: 0
                    };
                }
                productSales[pid].orders += 1;
                productSales[pid].sold += item.quantity;
                productSales[pid].revenue += (item.quantity * item.price);
                productSales[pid].profit += (item.quantity * item.price * 0.3); // Rough estimate if not stored
            }
        });
    });

    const colors = ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6", "#f43f5e"];
    
    const categoryData = Object.keys(categorySales).map((k, i) => ({
        name: k, value: categorySales[k], color: colors[i % colors.length]
    })).sort((a,b) => b.value - a.value);

    const paymentMethodData = Object.keys(paymentMethods).map((k, i) => ({
        name: k, value: paymentMethods[k], color: colors[i % colors.length]
    })).sort((a,b) => b.value - a.value);

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20);

    // Quick Insights
    const revenueUp = currRevenue >= prevRevenue;
    const topCat = categoryData.length > 0 ? categoryData[0] : null;
    const topCatPercent = topCat && currRevenue > 0 ? ((topCat.value / currRevenue) * 100).toFixed(1) : 0;
    const topPay = paymentMethodData.length > 0 ? paymentMethodData[0] : null;
    const topPayPercent = topPay && currRevenue > 0 ? ((topPay.value / currRevenue) * 100).toFixed(1) : 0;

    const insights = [
        {
            type: revenueUp ? 'success' : 'danger',
            icon: revenueUp ? 'TrendingUp' : 'TrendingDown',
            title: `Revenue is ${revenueUp ? 'up' : 'down'} by ${summaryStats.totalRevenue.trend.replace('+','')} this period`,
            desc: `Your store is performing ${revenueUp ? 'better' : 'worse'} than the previous period.`
        },
        ...(topCat ? [{
            type: 'warning',
            icon: 'Package',
            title: `${topCat.name} is your top selling category`,
            desc: `You made ${topCatPercent}% of total revenue from ${topCat.name}.`
        }] : []),
        ...(topPay ? [{
            type: 'info',
            icon: 'DollarSign',
            title: `${topPay.name} is the most used payment method`,
            desc: `${topPayPercent}% of revenue came via ${topPay.name}.`
        }] : [])
    ];

    res.status(200).json({
      success: true,
      data: {
        summaryStats,
        timeSeriesData,
        customerGrowthData,
        categoryData,
        paymentMethodData,
        topProducts,
        insights
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDetailedAnalytics,
};
