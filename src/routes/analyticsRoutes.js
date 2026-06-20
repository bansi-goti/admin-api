const express = require('express');
const { getDetailedAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and reporting endpoints
 */

/**
 * @swagger
 * /api/analytics/detailed:
 *   get:
 *     summary: Get detailed analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed analytics retrieved successfully
 */
router.route('/detailed').get(protect, getDetailedAnalytics);

module.exports = router;
