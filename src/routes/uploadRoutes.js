const express = require('express');
const router = express.Router();
const adUpload = require('../middlewares/adUploadMiddleware');

/**
 * Flexible Upload Handler supporting any field name ('file', 'image', 'upload')
 */
router.post('/', adUpload.any(), (req, res) => {
  const uploadedFile = req.file || (req.files && req.files[0]);
  if (!uploadedFile) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  res.status(200).json({
    success: true,
    url: uploadedFile.filename,
    filename: uploadedFile.filename,
    filePath: `/uploads/${uploadedFile.filename}`,
    message: 'File uploaded successfully'
  });
});

module.exports = router;
