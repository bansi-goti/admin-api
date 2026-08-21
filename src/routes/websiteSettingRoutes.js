const express = require('express');
const {
  getWebsiteSettings,
  updateWebsiteSettings,
} = require('../controllers/websiteSettingController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: WebsiteSettings
 *   description: Website settings management
 */

/**
 * @swagger
 * /api/settings/website:
 *   get:
 *     summary: Get website settings
 *     tags: [WebsiteSettings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Website settings retrieved
 *   post:
 *     summary: Update website settings
 *     tags: [WebsiteSettings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Website settings updated
 */
router.route('/')
  .get(getWebsiteSettings)
  .post(protect, upload.single('logo'), updateWebsiteSettings);

module.exports = router;
