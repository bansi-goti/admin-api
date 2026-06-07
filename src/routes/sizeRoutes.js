const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

const {
  getAllSizes,
  getSizesByCategory,
  createSizesBulk,
  updateSize,
  deleteSize
} = require('../controllers/sizeController');

/**
 * @swagger
 * tags:
 *   name: Sizes
 *   description: Size management for products
 */

router.use(protect);

/**
 * @swagger
 * /api/sizes:
 *   get:
 *     summary: Get all sizes
 *     tags: [Sizes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sizes populated with category details
 */
router.route('/')
  .get(getAllSizes);

/**
 * @swagger
 * /api/sizes/bulk:
 *   post:
 *     summary: Create multiple sizes at once
 *     tags: [Sizes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - sizes
 *             properties:
 *               category_id:
 *                 type: string
 *               sizes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Sizes created successfully
 *       400:
 *         description: Invalid input
 */
router.route('/bulk')
  .post(createSizesBulk);

/**
 * @swagger
 * /api/sizes/{id}:
 *   put:
 *     summary: Update a specific size
 *     tags: [Sizes]
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
 *               size_value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Size updated successfully
 *   delete:
 *     summary: Delete a specific size
 *     tags: [Sizes]
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
 *         description: Size removed successfully
 */
router.route('/:id')
  .put(updateSize)
  .delete(deleteSize);

/**
 * @swagger
 * /api/sizes/{categoryId}:
 *   get:
 *     summary: Get sizes by category ID
 *     tags: [Sizes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sizes for the category
 */
router.route('/:categoryId')
  .get(getSizesByCategory);

module.exports = router;
