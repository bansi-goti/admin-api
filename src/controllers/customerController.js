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

    // Attach order counts and total spent to each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const customerOrders = await Order.find({ 'customer.email': customer.email });
        const spent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        return {
          ...customer,
          orders: customerOrders.length,
          spent: spent,
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

    // Get current and previous period orders for value/orders metrics
    const currentOrders = await Order.find({
      createdAt: { $gte: currentPeriodStart, $lte: today }
    });

    const prevOrders = await Order.find({
      createdAt: { $gte: prevPeriodStart, $lt: currentPeriodStart }
    });

    // Get current and previous period users for new customers metric
    const currentUsers = await User.find({
      role: 'user',
      createdAt: { $gte: currentPeriodStart, $lte: today }
    });

    const prevUsers = await User.find({
      role: 'user',
      createdAt: { $gte: prevPeriodStart, $lt: currentPeriodStart }
    });

    // Helper to calculate trend
    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    };

    // Calculate specific stats
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const prevTotalCustomers = await User.countDocuments({ role: 'user', createdAt: { $lt: currentPeriodStart } }); // Approximation for trend

    const currOrdersCount = await Order.countDocuments(); // Lifetime orders
    const prevOrdersCount = await Order.countDocuments({ createdAt: { $lt: currentPeriodStart } }); 

    // Because lifetime orders/revenue never goes down, comparing lifetime totals is not a standard trend metric.
    // Instead we compare current period vs previous period for trends.
    const currTotalValue = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const prevTotalValue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const currNewThisMonth = currentUsers.length;
    const prevNewThisMonth = prevUsers.length;

    // For Lifetime Orders & Value
    const allOrders = await Order.find();
    const lifetimeValue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalOrders: {
          value: allOrders.length,
          trend: calcTrend(currentOrders.length, prevOrders.length) // Trend is order volume comparison
        },
        totalValue: {
          value: lifetimeValue,
          trend: calcTrend(currTotalValue, prevTotalValue) // Trend is revenue comparison
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

    const customerOrders = await Order.find({ 'customer.email': customer.email });
    customer.orders = customerOrders.length;
    customer.spent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);

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
