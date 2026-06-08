const express = require('express');
const {
  getPaymentSettings,
  savePaymentSetting,
  updatePaymentStatus,
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getPaymentSettings);
router.route('/').post(protect, savePaymentSetting);
router.route('/:id/status').patch(protect, updatePaymentStatus);

module.exports = router;
