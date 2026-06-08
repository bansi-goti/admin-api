const express = require('express');
const {
  getAllAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
} = require('../controllers/advertisementController');
const { protect } = require('../middlewares/authMiddleware');
const adUpload = require('../middlewares/adUploadMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getAllAdvertisements)
  .post(protect, adUpload.array('media', 5), createAdvertisement);

router.route('/:id')
  .patch(protect, adUpload.array('media', 5), updateAdvertisement)
  .delete(protect, deleteAdvertisement);

module.exports = router;
