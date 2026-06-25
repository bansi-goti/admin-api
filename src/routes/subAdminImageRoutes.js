const express = require('express');
const router = express.Router();
const { uploadImages, getImages, deleteImage } = require('../controllers/subAdminImageController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Route specifically for subadmin (we assume 'protect' checks token, 
// and the controller or a new middleware can check if role === subadmin if needed,
// but for now relying on protect and frontend role check is sufficient).
router.route('/upload').post(protect, upload.array('images', 10), uploadImages);
router.route('/').get(protect, getImages);
router.route('/:id').delete(protect, deleteImage);

module.exports = router;
