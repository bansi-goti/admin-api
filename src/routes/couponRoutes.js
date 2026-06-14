const express = require('express');
const { createCoupon, getCoupons, getCouponStats, updateCoupon, deleteCoupon } = require('../controllers/couponController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/stats').get(protect, getCouponStats);
router.route('/')
  .post(protect, createCoupon)
  .get(protect, getCoupons);
router.route('/:id')
  .put(protect, updateCoupon)
  .delete(protect, deleteCoupon);

module.exports = router;
