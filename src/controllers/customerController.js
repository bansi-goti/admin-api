const User = require('../models/User');
const Order = require('../models/Order');

// @desc    Get all customers (role: user) with orders/spent aggregation
// @route   GET /api/customers
// @access  Private
const getAllCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

    const query = { role: 'user' };
    if (req.user.role !== 'admin') {
      const customerEmails = await Order.distinct('customer.email', { seller: req.user._id });
      query.email = { $in: customerEmails };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await User.countDocuments(query);

    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    // Attach order counts, spent, averageOrderValue and lastOrderDate
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderQuery = { 'customer.email': customer.email };
        if (req.user.role !== 'admin') {
          orderQuery.seller = req.user._id;
        }
        const customerOrders = await Order.find(orderQuery).sort({ createdAt: -1 });
        const spent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        return {
          ...customer,
          totalOrders: customerOrders.length,
          totalSpent: spent,
          averageOrderValue: customerOrders.length > 0 ? Math.round(spent / customerOrders.length) : 0,
          lastOrderDate: customerOrders.length > 0 ? customerOrders[0].createdAt : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalData: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: customersWithStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer metrics (trends vs last X days)
// @route   GET /api/customers/metrics
// @access  Private
const getCustomerMetrics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const currentPeriodStart = new Date(today);
    currentPeriodStart.setDate(today.getDate() - days);
    currentPeriodStart.setHours(0, 0, 0, 0);

    const prevPeriodStart = new Date(currentPeriodStart);
    prevPeriodStart.setDate(currentPeriodStart.getDate() - days);

    // Build seller filter
    const orderQuery = {};
    const userQuery = { role: 'user' };
    
    if (req.user.role !== 'admin') {
      orderQuery.seller = req.user._id;
      const customerEmails = await Order.distinct('customer.email', { seller: req.user._id });
      userQuery.email = { $in: customerEmails };
    }

    // Get current and previous period orders for value/orders metrics
    const currentOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: currentPeriodStart, $lte: today }
    });

    const prevOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: prevPeriodStart, $lt: currentPeriodStart }
    });

    // Get current and previous period users for new customers metric
    const currentUsers = await User.find({
      ...userQuery,
      createdAt: { $gte: currentPeriodStart, $lte: today }
    });

    const prevUsers = await User.find({
      ...userQuery,
      createdAt: { $gte: prevPeriodStart, $lt: currentPeriodStart }
    });

    // Helper to calculate trend
    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    };

    // Calculate specific stats
    const totalCustomers = await User.countDocuments(userQuery);
    
    let prevTotalCustomers;
    if (req.user.role !== 'admin') {
      const prevCustomerEmails = await Order.distinct('customer.email', { 
        seller: req.user._id, 
        createdAt: { $lt: currentPeriodStart } 
      });
      prevTotalCustomers = prevCustomerEmails.length;
    } else {
      prevTotalCustomers = await User.countDocuments({ role: 'user', createdAt: { $lt: currentPeriodStart } });
    }

    const currOrdersCount = await Order.countDocuments(orderQuery);
    const prevOrdersCount = await Order.countDocuments({ ...orderQuery, createdAt: { $lt: currentPeriodStart } }); 

    const currTotalValue = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const prevTotalValue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const currNewThisMonth = currentUsers.length;
    const prevNewThisMonth = prevUsers.length;

    // For Lifetime Orders & Value
    const allOrders = await Order.find(orderQuery);
    const lifetimeValue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalOrders: {
          value: allOrders.length,
          trend: calcTrend(currentOrders.length, prevOrders.length)
        },
        totalValue: {
          value: lifetimeValue,
          trend: calcTrend(currTotalValue, prevTotalValue)
        },
        totalCustomers: {
          value: totalCustomers,
          trend: calcTrend(totalCustomers, prevTotalCustomers)
        },
        newThisMonth: {
          value: currNewThisMonth,
          trend: calcTrend(currNewThisMonth, prevNewThisMonth)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'user' }).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const orderQuery = { 'customer.email': customer.email };
    if (req.user.role !== 'admin') {
      orderQuery.seller = req.user._id;

      // Check authorization
      const hasOrder = await Order.findOne(orderQuery);
      if (!hasOrder) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this customer' });
      }
    }

    const customerOrders = await Order.find(orderQuery).populate('items.product').sort({ createdAt: -1 });
    customer.totalOrders = customerOrders.length;
    customer.totalSpent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    customer.averageOrderValue = customer.totalOrders > 0 ? Math.round(customer.totalSpent / customer.totalOrders) : 0;
    customer.lastOrderDate = customerOrders.length > 0 ? customerOrders[0].createdAt : null;

    // Calculate customer insights dynamically
    // shippingAddress: get from the last order's shipping address or default (if there's a shippingAddress logic later)
    // favoriteCategory: find the category with the most purchases
    const categoryCounts = {};
    for (const order of customerOrders) {
      for (const item of order.items) {
        if (item.product && item.product.category) {
          const catName = item.product.category.toString(); // or populating category name
          categoryCounts[catName] = (categoryCounts[catName] || 0) + item.quantity;
        }
      }
    }
    
    let favoriteCategory = 'None';
    let maxCount = 0;
    for (const cat in categoryCounts) {
      if (categoryCounts[cat] > maxCount) {
        maxCount = categoryCounts[cat];
        favoriteCategory = cat;
      }
    }
    
    // Resolve category name if it's an ObjectId by looking it up, or fallback
    if (favoriteCategory !== 'None') {
      const Category = require('../models/Category');
      const catObj = await Category.findById(favoriteCategory);
      if (catObj) favoriteCategory = catObj.name;
    }

    customer.favoriteCategory = favoriteCategory;

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer status
// @route   PATCH /api/customers/:id/status
// @access  Private
const updateCustomerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'user' },
      { status },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.status(200).json({
      success: true,
      data: customer,
      message: `Customer status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'user' });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await customer.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerMetrics,
  getCustomerById,
  updateCustomerStatus,
  deleteCustomer,
};
