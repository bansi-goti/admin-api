const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard operations
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics based on user role
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                     totalOrders:
 *                       type: number
 *                     totalProducts:
 *                       type: number
 *                     totalCustomers:
 *                       type: number
 *                     totalSellers:
 *                       type: number
 *                     pendingOrders:
 *                       type: number
 *                     averageOrderValue:
 *                       type: number
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       orderId:
 *                         type: string
 *                       customer:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       status:
 *                         type: string
 *       401:
 *         description: Not authorized, token failed
 *       500:
 *         description: Server error
 */
router.get('/stats', protect, getDashboardStats);

module.exports = router;
