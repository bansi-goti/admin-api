const express = require('express');
const { getNotifications, markAsRead, deleteNotifications } = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/mark-read').put(protect, markAsRead);
router.route('/')
  .get(protect, getNotifications)
  .delete(protect, deleteNotifications);

module.exports = router;
