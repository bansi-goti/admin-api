const express = require('express');
const { getDetailedAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.route('/detailed').get(protect, getDetailedAnalytics);

module.exports = router;
