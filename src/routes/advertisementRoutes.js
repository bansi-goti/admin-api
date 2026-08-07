const express = require('express');
const {
  getAllAdvertisements,
  getPublicBanners,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisementStatus,
} = require('../controllers/advertisementController');
const { protect } = require('../middlewares/authMiddleware');
const adUpload = require('../middlewares/adUploadMiddleware');

const router = express.Router();

// PUBLIC BANNER ROUTE
router.get('/public', getPublicBanners);

/**
 * @swagger
 * tags:
 *   name: Advertisements
 *   description: Advertisement management endpoints
 */

/**
 * @swagger
 * /api/advertisements:
 *   get:
 *     summary: Get all advertisements
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of advertisements
 *   post:
 *     summary: Create an advertisement
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created
 */
router.route('/')
  .get(protect, getAllAdvertisements)
  .post(protect, adUpload.array('media', 5), createAdvertisement);

/**
 * @swagger
 * /api/advertisements/{id}/status:
 *   patch:
 *     summary: Toggle advertisement status
 *     tags: [Advertisements]
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
 *         description: Status updated
 */
router.patch('/:id/status', protect, toggleAdvertisementStatus);

/**
 * @swagger
 * /api/advertisements/{id}:
 *   patch:
 *     summary: Update an advertisement
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Delete an advertisement
 *     tags: [Advertisements]
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
 *         description: Deleted
 */
router.route('/:id')
  .patch(protect, adUpload.array('media', 5), updateAdvertisement)
  .delete(protect, deleteAdvertisement);

module.exports = router;
