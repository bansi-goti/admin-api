const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getProfile, sendOtp, sendOtpWhatsApp, verifyOtp } = require('../controllers/authController');
const { googleAuthLogin } = require('../controllers/googleAuthController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/profile', protect, getProfile);
router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/google', googleAuthLogin);
router.post('/send-otp', sendOtp);
router.post('/send-otp-whatsapp', sendOtpWhatsApp);
router.post('/verify-otp', verifyOtp);
router.post('/verify-whatsapp-otp', verifyOtp);

module.exports = router;
