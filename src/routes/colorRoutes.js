const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

const {
  getAllColors,
  getColorsByCategory,
  createColorsBulk,
  updateColor,
  deleteColor
} = require('../controllers/colorController');

/**
 * @swagger
 * tags:
 *   name: Colors
 *   description: Color management for products
 */

router.use(protect);

/**
 * @swagger
 * /api/colors:
 *   get:
 *     summary: Get all colors
 *     tags: [Colors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all colors populated with category details
 */
router.route('/')
  .get(getAllColors);

/**
 * @swagger
 * /api/colors/bulk:
 *   post:
 *     summary: Create multiple colors at once
 *     tags: [Colors]
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
 *               - colors
 *             properties:
 *               category_id:
 *                 type: string
 *               colors:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Colors created successfully
 *       400:
 *         description: Invalid input
 */
router.route('/bulk')
  .post(createColorsBulk);

/**
 * @swagger
 * /api/colors/{id}:
 *   put:
 *     summary: Update a specific color
 *     tags: [Colors]
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
 *               color_code:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Color updated successfully
 *   delete:
 *     summary: Delete a specific color
 *     tags: [Colors]
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
 *         description: Color removed successfully
 */
router.route('/:id')
  .put(updateColor)
  .delete(deleteColor);

/**
 * @swagger
 * /api/colors/{categoryId}:
 *   get:
 *     summary: Get colors by category ID
 *     tags: [Colors]
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
 *         description: List of colors for the category
 */
router.route('/:categoryId')
  .get(getColorsByCategory);

module.exports = router;
