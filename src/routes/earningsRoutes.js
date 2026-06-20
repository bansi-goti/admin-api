const express = require('express');
const router = express.Router();
const { getEarnings } = require('../controllers/earningsController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Earnings
 *   description: Earnings and payouts endpoints
 */

/**
 * @swagger
 * /api/earnings:
 *   get:
 *     summary: Get earnings data
 *     tags: [Earnings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings data retrieved
 */
router.route('/').get(protect, getEarnings);

module.exports = router;
