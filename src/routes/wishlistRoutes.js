const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getWishlist,
  addToWishlist,
  toggleWishlist,
  removeFromWishlist,
} = require('../controllers/wishlistController');

// All wishlist operations require authentication
router.use(protect);

router.route('/')
  .get(getWishlist)
  .post(addToWishlist);

router.post('/toggle', toggleWishlist);
router.delete('/:productId', removeFromWishlist);

module.exports = router;
