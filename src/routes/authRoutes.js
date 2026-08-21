const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getProfile } = require('../controllers/authController');
const { googleAuthLogin } = require('../controllers/googleAuthController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/profile', protect, getProfile);
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/google', googleAuthLogin);

module.exports = router;
