const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory management endpoints
 */

/**
 * @swagger
 * /api/inventory/overview:
 *   get:
 *     summary: Get inventory overview
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory overview retrieved
 */
router.get('/overview', protect, inventoryController.getInventoryOverview);

/**
 * @swagger
 * /api/inventory/add:
 *   post:
 *     summary: Add stock to inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Inventory added
 */
router.post('/add', protect, inventoryController.addInventory);

module.exports = router;
