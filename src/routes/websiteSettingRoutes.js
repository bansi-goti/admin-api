const express = require('express');
const {
  getWebsiteSettings,
  updateWebsiteSettings,
} = require('../controllers/websiteSettingController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getWebsiteSettings)
  .post(protect, upload.single('logo'), updateWebsiteSettings);

module.exports = router;
