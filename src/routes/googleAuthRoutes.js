const express = require('express');
const router = express.Router();
const {
  getGoogleAuthSettings,
  updateGoogleAuthSettings,
} = require('../controllers/googleAuthController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', getGoogleAuthSettings);
router.post('/', protect, updateGoogleAuthSettings);

module.exports = router;
