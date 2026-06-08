const express = require('express');
const {
  getAllCustomers,
  getCustomerMetrics,
  getCustomerById,
  updateCustomerStatus,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getAllCustomers);
router.route('/metrics').get(protect, getCustomerMetrics);
router.route('/:id').get(protect, getCustomerById);
router.route('/:id/status').patch(protect, updateCustomerStatus);
router.route('/:id').delete(protect, deleteCustomer);

module.exports = router;
