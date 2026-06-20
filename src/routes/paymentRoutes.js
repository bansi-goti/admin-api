const express = require('express');
const {
  getPaymentSettings,
  savePaymentSetting,
  updatePaymentStatus,
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment settings endpoints
 */

/**
 * @swagger
 * /api/settings/payments:
 *   get:
 *     summary: Get payment settings
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment settings
 *   post:
 *     summary: Save payment setting
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Saved
 */
router.route('/').get(protect, getPaymentSettings);
router.route('/').post(protect, savePaymentSetting);

/**
 * @swagger
 * /api/settings/payments/{id}/status:
 *   patch:
 *     summary: Update payment status
 *     tags: [Payments]
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
 *         description: Status updated
 */
router.route('/:id/status').patch(protect, updatePaymentStatus);

module.exports = router;
