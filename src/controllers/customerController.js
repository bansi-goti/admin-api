const User = require('../models/User');
const Order = require('../models/Order');
const Address = require('../models/Address');

function escapeRegex(str) {
  if (!str) return '';
  return String(str);
}

// Helper to resolve primary address for a customer
async function resolveCustomerAddress(customerObj) {
  try {
    // 1. Try finding default or latest Address in Address collection
    let userAddr = await Address.findOne({
      $or: [
        { user: customerObj._id },
        { fullName: { $regex: '^' + customerObj.name + '$', $options: 'i' } }
      ]
    }).sort({ isDefault: -1, updatedAt: -1 }).lean();

    if (userAddr && (userAddr.streetAddress || userAddr.city || userAddr.pincode)) {
      return {
        streetAddress: userAddr.streetAddress || '',
        city: userAddr.city || '',
        state: userAddr.state || 'Maharashtra',
        pincode: userAddr.pincode || '',
        country: 'India',
        phone: userAddr.phone || customerObj.phone || '',
        fullAddress: [userAddr.streetAddress, userAddr.city, userAddr.state, userAddr.pincode ? 'PIN: ' + userAddr.pincode : ''].filter(Boolean).join(', ')
      };
    }

    // 2. Try finding address from latest order
    const cleanEmail = escapeRegex(customerObj.email);
    const lastOrder = await Order.findOne({
      $or: [
        { 'customer.email': cleanEmail ? new RegExp('^' + cleanEmail + '$', 'i') : '' },
        { user: customerObj._id }
      ]
    }).sort({ createdAt: -1 }).lean();

    if (lastOrder) {
      const orderAddr = lastOrder.shippingAddress || lastOrder.address || (lastOrder.customer && lastOrder.customer.address) || (lastOrder.customer && lastOrder.customer.shippingAddress) || {};
      if (typeof orderAddr === 'string' && orderAddr.trim()) {
        return { fullAddress: orderAddr, streetAddress: orderAddr };
      }
      if (orderAddr && (orderAddr.streetAddress || orderAddr.address || orderAddr.city || orderAddr.pincode)) {
        return {
          streetAddress: orderAddr.streetAddress || orderAddr.address || '',
          city: orderAddr.city || '',
          state: orderAddr.state || '',
          pincode: orderAddr.pincode || orderAddr.zipCode || '',
          country: orderAddr.country || 'India',
          fullAddress: [orderAddr.streetAddress || orderAddr.address, orderAddr.city, orderAddr.state, orderAddr.pincode ? 'PIN: ' + orderAddr.pincode : ''].filter(Boolean).join(', ')
        };
      }
    }
  } catch (err) {
    console.warn('Address resolve notice:', err.message);
  }

  return {
    streetAddress: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    fullAddress: ''
  };
}

// @desc    Get all customers (role: user) with orders/spent aggregation
// @route   GET /api/customers
// @access  Private
const getAllCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

    const query = { role: 'user' };
    if (req.user && req.user.role !== 'admin') {
      const customerEmails = await Order.distinct('customer.email', { seller: req.user._id });
      query.email = { $in: customerEmails };
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await User.countDocuments(query);

    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    // Attach order counts, spent, primary address
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const cleanEmail = escapeRegex(customer.email);
        let orderQuery = {
          $or: [
            { 'customer.email': cleanEmail ? new RegExp('^' + cleanEmail + '$', 'i') : '' },
            { user: customer._id }
          ]
        };

        if (req.user && req.user.role !== 'admin') {
          orderQuery = {
            $and: [
              orderQuery,
              { seller: req.user._id }
            ]
          };
        }

        const customerOrders = await Order.find(orderQuery).sort({ createdAt: -1 });
        const spent = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const orderCount = customerOrders.length;
        const displayCustomerId = customer.customerId || ('CUST-' + customer._id.toString().slice(-6).toUpperCase());
        const addressObj = await resolveCustomerAddress(customer);

        return {
          ...customer,
          authProvider: customer.authProvider || (customer.profileImage && customer.profileImage.includes('googleusercontent') ? 'google' : 'email'),
          customerId: displayCustomerId,
          address: addressObj,
          phone: customer.phone || addressObj.phone || '',
          totalOrders: orderCount,
          orders: orderCount,
          totalSpent: spent,
          spent: spent,
          averageOrderValue: orderCount > 0 ? Math.round(spent / orderCount) : 0,
          lastOrderDate: orderCount > 0 ? customerOrders[0].createdAt : null,
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

// @desc    Get customer metrics
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

    const orderQuery = {};
    const userQuery = { role: 'user' };
    
    if (req.user && req.user.role !== 'admin') {
      orderQuery.seller = req.user._id;
      const customerEmails = await Order.distinct('customer.email', { seller: req.user._id });
      userQuery.email = { $in: customerEmails };
    }

    const currentOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: currentPeriodStart, $lte: today }
    });

    const prevOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: prevPeriodStart, $lt: currentPeriodStart }
    });

    const currentUsers = await User.find({
      ...userQuery,
      createdAt: { $gte: currentPeriodStart, $lte: today }
    });

    const prevUsers = await User.find({
      ...userQuery,
      createdAt: { $gte: prevPeriodStart, $lt: currentPeriodStart }
    });

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    };

    const totalCustomers = await User.countDocuments(userQuery);
    
    let prevTotalCustomers;
    if (req.user && req.user.role !== 'admin') {
      const prevCustomerEmails = await Order.distinct('customer.email', { 
        seller: req.user._id, 
        createdAt: { $lt: currentPeriodStart } 
      });
      prevTotalCustomers = prevCustomerEmails.length;
    } else {
      prevTotalCustomers = await User.countDocuments({ role: 'user', createdAt: { $lt: currentPeriodStart } });
    }

    const currTotalValue = currentOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const prevTotalValue = prevOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const currNewThisMonth = currentUsers.length;
    const prevNewThisMonth = prevUsers.length;

    const allOrders = await Order.find(orderQuery);
    const lifetimeValue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

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

    const cleanEmail = escapeRegex(customer.email);
    let orderQuery = {
      $or: [
        { 'customer.email': cleanEmail ? new RegExp('^' + cleanEmail + '$', 'i') : '' },
        { user: customer._id }
      ]
    };

    if (req.user && req.user.role !== 'admin') {
      orderQuery = {
        $and: [
          orderQuery,
          { seller: req.user._id }
        ]
      };

      const hasOrder = await Order.findOne(orderQuery);
      if (!hasOrder) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this customer' });
      }
    }

    const customerOrders = await Order.find(orderQuery).populate('items.product').sort({ createdAt: -1 });
    const addressObj = await resolveCustomerAddress(customer);

    customer.customerId = customer.customerId || ('CUST-' + customer._id.toString().slice(-6).toUpperCase());
    customer.authProvider = customer.authProvider || (customer.profileImage && customer.profileImage.includes('googleusercontent') ? 'google' : 'email');
    customer.address = addressObj;
    customer.phone = customer.phone || addressObj.phone || '';
    customer.totalOrders = customerOrders.length;
    customer.orders = customerOrders.length;
    customer.totalSpent = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    customer.spent = customer.totalSpent;
    customer.averageOrderValue = customer.totalOrders > 0 ? Math.round(customer.totalSpent / customer.totalOrders) : 0;
    customer.lastOrderDate = customerOrders.length > 0 ? customerOrders[0].createdAt : null;

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
