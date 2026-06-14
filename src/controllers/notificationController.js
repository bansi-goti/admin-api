const Notification = require('../models/Notification');

// @desc    Get all notifications and stats
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin ? {} : { seller: req.user._id };

    // Filters
    const typeFilter = req.query.type;
    if (typeFilter && typeFilter !== 'All Notifications') {
      if (typeFilter === 'System Alerts') {
        query.type = 'System';
      } else if (typeFilter === 'Orders') {
        query.type = 'Order';
      } else if (typeFilter === 'Products') {
        query.type = 'Product';
      } else if (typeFilter === 'Payments') {
        query.type = 'Payment';
      } else if (typeFilter === 'Inventory') {
        query.type = 'Inventory';
      } else if (typeFilter === 'Reviews') {
        query.type = 'Review';
      }
    }

    const statusFilter = req.query.status;
    if (statusFilter === 'Unread') {
      query.isUnread = true;
    } else if (statusFilter === 'Read') {
      query.isUnread = false;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 8;
    const skip = (page - 1) * limit;

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate Stats across ALL notifications for this user (ignore filters for stats)
    const allQuery = isAdmin ? {} : { seller: req.user._id };
    const allNotifs = await Notification.find(allQuery);
    
    const stats = {
      total: allNotifs.length,
      unread: allNotifs.filter(n => n.isUnread).length,
      orders: allNotifs.filter(n => n.type === 'Order').length,
      products: allNotifs.filter(n => n.type === 'Product').length,
      payments: allNotifs.filter(n => n.type === 'Payment').length,
      inventory: allNotifs.filter(n => n.type === 'Inventory').length,
      reviews: allNotifs.filter(n => n.type === 'Review').length,
      system: allNotifs.filter(n => n.type === 'System').length,
    };

    res.status(200).json({
      success: true,
      data: notifications,
      stats,
      pagination: {
        page, limit, total, pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin ? {} : { seller: req.user._id };
    
    if (req.body.id) {
      query._id = req.body.id;
    }

    await Notification.updateMany(query, { isUnread: false });
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notifications (clear all or specific)
// @route   DELETE /api/notifications
// @access  Private
const deleteNotifications = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin ? {} : { seller: req.user._id };
    
    if (req.query.id) {
      query._id = req.query.id;
    }

    await Notification.deleteMany(query);
    res.status(200).json({ success: true, message: 'Notifications cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  deleteNotifications
};
