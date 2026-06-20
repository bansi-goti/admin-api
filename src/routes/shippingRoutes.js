const express = require('express');
const router = express.Router();
const { calculateShippingAndPrice } = require('../controllers/shippingController');

/**
 * @swagger
 * tags:
 *   name: Shipping
 *   description: Shipping calculation endpoints
 */

/**
 * @swagger
 * /api/shipping/calculate:
 *   post:
 *     summary: Calculate shipping and price
 *     tags: [Shipping]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Calculation result
 */
router.post('/calculate', calculateShippingAndPrice);

module.exports = router;
