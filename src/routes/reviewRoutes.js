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

module.exports = router;
