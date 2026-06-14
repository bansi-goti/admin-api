const express = require('express');
const router = express.Router();
const { getEarnings } = require('../controllers/earningsController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getEarnings);

module.exports = router;
