const express = require('express');
const { createCoupon, getCoupons, getCouponStats, updateCoupon, deleteCoupon, validateCoupon } = require('../controllers/couponController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public coupon validation endpoint
router.route('/validate').post(validateCoupon);

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management endpoints
 */

/**
 * @swagger
 * /api/coupons/stats:
 *   get:
 *     summary: Get coupon statistics
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon statistics retrieved
 */
router.route('/stats').get(protect, getCouponStats);

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Get all coupons
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons
 *   post:
 *     summary: Create a coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               discountType:
 *                 type: string
 *               discountValue:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created
 */
router.route('/')
  .post(protect, createCoupon)
  .get(protect, getCoupons);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Update a coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               discountType:
 *                 type: string
 *               discountValue:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Delete a coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.route('/:id')
  .put(protect, updateCoupon)
  .delete(protect, deleteCoupon);

module.exports = router;
