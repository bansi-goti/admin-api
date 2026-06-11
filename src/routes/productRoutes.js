const express = require('express');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

const productUpload = upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
  { name: 'threeSixtyImages', maxCount: 50 },
  { name: 'video', maxCount: 1 }
]);

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API to manage products
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name or sku
 *     responses:
 *       200:
 *         description: List of products
 *       401:
 *         description: Unauthorized
 */
router.route('/').get(protect, getAllProducts);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sku
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [Pending, Approved, Rejected]
 *               category:
 *                 type: string
 *               mainImage:
 *                 type: string
 *               gallery:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Product with SKU already exists
 */
router.route('/').post(protect, productUpload, createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
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
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.route('/:id').get(protect, getProductById);

/**
 * @swagger
 * /api/products/{id}/status:
 *   patch:
 *     summary: Update a product status
 *     tags: [Products]
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
 *               status:
 *                 type: string
 *                 enum: [Pending, Approved, Rejected]
 *     responses:
 *       200:
 *         description: Product status updated
 *       404:
 *         description: Product not found
 */
router.route('/:id/status').patch(protect, updateProductStatus);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
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
 *         description: Product deleted
 *       404:
 *         description: Product not found
 */
router.route('/:id')
  .get(protect, getProductById)
  .put(protect, productUpload, updateProduct)
  .delete(protect, deleteProduct);

module.exports = router;
