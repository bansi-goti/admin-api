const express = require('express');
const { updateProfile, updatePassword, toggleTwoFactor } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.put('/profile', protect, upload.single('profileImage'), updateProfile);
router.put('/password', protect, updatePassword);
router.put('/2fa', protect, toggleTwoFactor);

module.exports = router;
