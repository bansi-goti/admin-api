const Order = require('../models/Order');

const transformOrder = (o) => {
  if (!o) return null;
  return {
    _id: o._id,
    orderId: o.orderId,
    customer: o.customer?.name || 'N/A',
    customerId: {
      profileImage: o.seller?.profileImage || ''
    },
    shippingAddress: {
      email: o.customer?.email || '',
      phone: '98765 43210',
      name: o.customer?.name || '',
      address: '123 Premium Lane, Gold Bazar',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    },
    products: (o.items || []).map(item => ({
      product: item.product,
      name: item.product?.name || 'Gold Item',
      quantity: item.quantity,
      price: item.price
    })),
    amount: o.totalAmount,
    deliveryCharge: 150,
    commissionPercentage: 15,
    commissionAmount: o.totalAmount * 0.15,
    sellerEarnings: o.sellerEarning || (o.totalAmount * 0.85),
    paymentMethod: o.paymentMethod || 'Online',
    paymentStatus: 'Paid',
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    seller: o.seller
  };
};

// @desc    Get all orders (with pagination & search)
// @route   GET /api/orders
// @access  Private
const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

    const query = {};
    if (req.user.role !== 'admin') {
      query.seller = req.user._id;
    }

    if (req.query.customerId) {
      const User = require('../models/User');
      const user = await User.findById(req.query.customerId);
      if (user) {
        query['customer.email'] = user.email;
      }
    } else if (req.query.customerEmail) {
      query['customer.email'] = req.query.customerEmail;
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('seller', 'name email username fullName')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const transformedOrders = orders.map(transformOrder);

    res.status(200).json({
      success: true,
      data: {
        total: total,
        totalData: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: transformedOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('seller', 'name email username fullName')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({
      success: true,
      data: transformOrder(order),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    order.status = status;
    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role !== 'admin' && order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this order' });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order metrics (trends vs last X days)
// @route   GET /api/orders/metrics
// @access  Private
const getOrderMetrics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(startDate.getDate() - days);
    const filterQuery = {};
    if (req.user.role !== 'admin') {
      filterQuery.seller = req.user._id;
    }

    // Get orders for current period
    const currentOrders = await Order.find({
      ...filterQuery,
      createdAt: { $gte: startDate, $lte: today }
    });

    // Get orders for previous period
    const prevOrders = await Order.find({
      ...filterQuery,
      createdAt: { $gte: prevStartDate, $lt: startDate }
    });
    // Helper to calculate trend
    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
    };

    // Current Metrics
    const currTotal = currentOrders.length;
    const currActive = currentOrders.filter(o => ['Processing', 'Shipped'].includes(o.status)).length;
    const currCompleted = currentOrders.filter(o => o.status === 'Delivered').length;
    const currRevenue = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Previous Metrics
    const prevTotal = prevOrders.length;
    const prevActive = prevOrders.filter(o => ['Processing', 'Shipped'].includes(o.status)).length;
    const prevCompleted = prevOrders.filter(o => o.status === 'Delivered').length;
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Prepare chart data (group by date)
    const generateChartData = (ordersList, valueFn) => {
      const map = {};
      // Initialize last `days` days
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        map[label] = 0;
      }
      
      ordersList.forEach(o => {
        const d = new Date(o.createdAt);
        const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (map[label] !== undefined) {
          map[label] += valueFn(o);
        }
      });

      return Object.keys(map).map(k => ({ name: k, value: map[k] }));
    };

    res.status(200).json({
      success: true,
      data: {
        total: {
          value: currTotal,
          trend: calcTrend(currTotal, prevTotal),
          data: generateChartData(currentOrders, () => 1)
        },
        active: {
          value: currActive,
          trend: calcTrend(currActive, prevActive),
          data: generateChartData(currentOrders.filter(o => ['Processing', 'Shipped'].includes(o.status)), () => 1)
        },
        completed: {
          value: currCompleted,
          trend: calcTrend(currCompleted, prevCompleted),
          data: generateChartData(currentOrders.filter(o => o.status === 'Delivered'), () => 1)
        },
        revenue: {
          value: currRevenue,
          trend: calcTrend(currRevenue, prevRevenue),
          data: generateChartData(currentOrders, o => o.totalAmount)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrderMetrics,
  updateOrderStatus,
  deleteOrder,
};
