const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');

// Use protect middleware for all review routes
router.use(protect);

// GET all reviews (with filters, pagination, stats)
router.get('/all', reviewController.getAllReviews);

// GET reviews for a product
router.get('/product/:productId', reviewController.getProductReviews);

// PATCH update review status
router.patch('/:id/status', reviewController.updateReviewStatus);

// DELETE review
router.delete('/:id', reviewController.deleteReview);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new customer review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - rating
 *             properties:
 *               productId:
 *                 type: string
 *               customerId:
 *                 type: string
 *               rating:
 *                 type: number
 *               comment:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', reviewController.createReview);

module.exports = router;
