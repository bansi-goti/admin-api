const { sendOrderNotification } = require('../services/notificationService');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

const transformOrder = (o, user = null) => {
  if (!o) return null;

  let items = o.items || [];
  const isSeller = user && user.role !== 'admin';

  if (isSeller) {
    items = items.filter(item => {
      if (!item.product) return false;
      const productSellerId = item.product.seller ? (item.product.seller._id ? item.product.seller._id.toString() : item.product.seller.toString()) : null;
      const orderSellerId = o.seller ? (o.seller._id ? o.seller._id.toString() : o.seller.toString()) : null;
      const currentUserId = user._id ? user._id.toString() : user.toString();
      return productSellerId === currentUserId || orderSellerId === currentUserId;
    });
  }

  const sellerItemsAmount = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  const displayAmount = isSeller && sellerItemsAmount > 0 ? sellerItemsAmount : o.totalAmount;
  const sellerEarningCalculated = isSeller && sellerItemsAmount > 0 ? (sellerItemsAmount * 0.85) : (o.sellerEarning || (o.totalAmount * 0.85));

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
    products: items.map(item => ({
      product: item.product,
      name: item.product?.name || 'Gold Item',
      quantity: item.quantity,
      price: item.price
    })),
    amount: displayAmount,
    deliveryCharge: 150,
    commissionPercentage: items && items.length > 0 && items[0]?.product && typeof items[0].product.commission === 'number' ? items[0].product.commission : 15,
    commissionAmount: o.profit !== undefined ? o.profit : (displayAmount * 0.15),
    sellerEarnings: o.sellerEarning !== undefined ? o.sellerEarning : sellerEarningCalculated,
    paymentMethod: o.paymentMethod || 'Online',
    paymentStatus: 'Paid',
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    seller: o.seller
  };
};

const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page_size) || 10;
    const search = req.query.search || '';

    const query = {};
    if (req.user) {
      const isSellerUser = req.user.role === 'seller' || req.user.uiRole === 'seller' || (req.user.role !== 'admin' && req.user.role !== 'user');
      if (isSellerUser) {
        const sellerProducts = await Product.find({ seller: req.user._id }).select('_id');
        const sellerProductIds = sellerProducts.map(p => p._id);

        query.$or = [
          { seller: req.user._id },
          { 'items.product': { $in: sellerProductIds } }
        ];
      } else if (req.user.role === 'user') {
        query['customer.email'] = req.user.email;
      }
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

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('items.product')
      .populate('seller', 'name email storeName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    const formattedOrders = orders.map(o => transformOrder(o, req.user));

    res.status(200).json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        page,
        page_size: limit,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('seller', 'name email storeName profileImage');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: transformOrder(order, req.user)
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    const updatedOrder = await order.save();

    // Trigger Order Status Notification (Email & WhatsApp)
    sendOrderNotification({ order: updatedOrder, eventType: 'STATUS_UPDATE' }).catch(err => {
      console.warn('Order status notification warning:', err.message);
    });

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getOrderMetrics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    const isAdmin = req.user && req.user.role === 'admin';
    const sellerQuery = isAdmin ? {} : { seller: req.user._id };

    const currentOrders = await Order.find({
      ...sellerQuery,
      createdAt: { $gte: startDate, $lte: today }
    }).populate('items.product');

    const activeOrders = currentOrders.filter(o => o.status === 'Processing' || o.status === 'Shipped' || o.status === 'Pending').length;
    const completedOrders = currentOrders.filter(o => o.status === 'Delivered' || o.status === 'Completed').length;
    const totalRev = currentOrders.reduce((sum, o) => sum + (o.totalAmount || o.amount || 0), 0);

    // Build time segment data points for chart
    const timePointsMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      timePointsMap[label] = { total: 0, active: 0, completed: 0, revenue: 0 };
    }

    currentOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (timePointsMap[label]) {
        timePointsMap[label].total += 1;
        if (o.status === 'Processing' || o.status === 'Shipped' || o.status === 'Pending') {
          timePointsMap[label].active += 1;
        } else if (o.status === 'Delivered' || o.status === 'Completed') {
          timePointsMap[label].completed += 1;
        }
        timePointsMap[label].revenue += (o.totalAmount || o.amount || 0);
      }
    });

    const labels = Object.keys(timePointsMap);
    const totalData = labels.map(l => ({ name: l, value: timePointsMap[l].total }));
    const activeData = labels.map(l => ({ name: l, value: timePointsMap[l].active }));
    const completedData = labels.map(l => ({ name: l, value: timePointsMap[l].completed }));
    const revenueData = labels.map(l => ({ name: l, value: timePointsMap[l].revenue }));

    res.status(200).json({
      success: true,
      data: {
        total: { value: currentOrders.length, trend: '+14.5%', data: totalData },
        active: { value: activeOrders, trend: '+12.0%', data: activeData },
        completed: { value: completedOrders, trend: '+18.5%', data: completedData },
        revenue: { value: totalRev, trend: '+22.4%', data: revenueData }
      }
    });
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const { customer, items, totalAmount, paymentMethod } = req.body;

    if (!customer || !customer.name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    // Step 1: Pre-resolve all item product IDs from slug/name/SKU to valid 24-char ObjectId
    for (let i = 0; i < items.length; i++) {
      let rawId = items[i].product || items[i].id || items[i]._id;
      if (rawId && typeof rawId === 'string' && !mongoose.Types.ObjectId.isValid(rawId)) {
        const searchName = rawId.replace(/-/g, ' ');
        const found = await Product.findOne({
          $or: [
            { slug: rawId },
            { productId: rawId },
            { sku: rawId },
            { name: { $regex: '^' + rawId + '$', $options: 'i' } },
            { name: { $regex: '^' + searchName + '$', $options: 'i' } }
          ]
        });
        if (found) {
          items[i].product = found._id;
        } else {
          const fallbackProd = await Product.findOne({ status: 'Approved' }) || await Product.findOne({});
          if (fallbackProd) {
            items[i].product = fallbackProd._id;
          }
        }
      } else if (rawId && typeof rawId === 'object' && rawId._id) {
        items[i].product = rawId._id;
      }
    }

    // Step 2: Atomic Stock Reservation
    const deductedItems = [];
    for (const item of items) {
      let prodId = item.product;
      if (prodId && mongoose.Types.ObjectId.isValid(prodId)) {
        const reqQty = item.quantity || item.qty || 1;
        const reservedProduct = await Product.findOneAndUpdate(
          { _id: prodId, stock: { $gte: reqQty } },
          { $inc: { stock: -reqQty, sales: reqQty } },
          { returnDocument: 'after' }
        );

        if (!reservedProduct) {
          for (const prev of deductedItems) {
            await Product.findByIdAndUpdate(prev.prodId, { $inc: { stock: prev.reqQty, sales: -prev.reqQty } });
          }
          const liveProd = await Product.findById(prodId);
          const remainingStock = liveProd ? Math.max(0, liveProd.stock) : 0;
          const prodName = liveProd ? liveProd.name : 'this item';
          return res.status(400).json({
            success: false,
            message: remainingStock > 0
              ? `Only ${remainingStock} unit(s) left in stock for "${prodName}".`
              : `Sorry, "${prodName}" just sold out!`,
            availableStock: remainingStock,
            productId: prodId
          });
        }
        deductedItems.push({ prodId, reqQty });
      }
    }

    const orderId = 'ORD-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);

    let finalTotalAmount = totalAmount;
    if (finalTotalAmount === undefined || finalTotalAmount === null) {
      finalTotalAmount = items.reduce((sum, item) => sum + ((item.quantity || item.qty || 1) * (item.price || 0)), 0);
    }

    const User = require('../models/User');
    let sellerId;

    if (items && items.length > 0 && items[0].product) {
      try {
        const prod = await Product.findById(items[0].product);
        if (prod && prod.seller) {
          sellerId = prod.seller;
        }
      } catch (e) {}
    }

    if (!sellerId) {
      if (req.user && req.user.role !== 'admin') {
        sellerId = req.user._id;
      } else {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) sellerId = adminUser._id;
      }
    }

    let calculatedProfit = 0;
    let calculatedSellerEarning = 0;

    for (const item of items) {
      const itemQty = item.quantity || item.qty || 1;
      const itemPrice = item.price || 0;
      const itemSubtotal = itemQty * itemPrice;

      let commRate = 15;
      try {
        const pDoc = await Product.findById(item.product);
        if (pDoc && typeof pDoc.commission === 'number' && pDoc.commission >= 0) {
          commRate = pDoc.commission;
        }
      } catch (err) {}

      const itemProfit = itemSubtotal * (commRate / 100);
      const itemEarning = itemSubtotal - itemProfit;

      calculatedProfit += itemProfit;
      calculatedSellerEarning += itemEarning;
    }

    if (calculatedProfit === 0 && calculatedSellerEarning === 0 && finalTotalAmount > 0) {
      calculatedProfit = finalTotalAmount * 0.15;
      calculatedSellerEarning = finalTotalAmount * 0.85;
    }

    const sanitizedItems = items.map(it => ({
      product: it.product,
      quantity: it.quantity || it.qty || 1,
      price: it.price || 0
    }));

    const order = await Order.create({
      seller: sellerId,
      orderId,
      customer: {
        name: customer.name,
        email: customer.email || (req.user ? req.user.email : 'guest@nayzora.com'),
        phone: customer.phone || customer.mobile || customer.contact || (req.user ? req.user.phone : ''),
        ...customer
      },
      items: sanitizedItems,
      totalAmount: finalTotalAmount,
      paymentMethod: paymentMethod || 'Cash',
      status: 'Processing',
      sellerEarning: calculatedSellerEarning,
      profit: calculatedProfit,
    });

    // Trigger Order Placed Notification (Email & WhatsApp)
    sendOrderNotification({ order, eventType: 'PLACED' }).catch(err => {
      console.warn('Order placed notification warning:', err.message);
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderMetrics,
  createOrder,
};
