const express = require('express');
const router = express.Router();
const adUpload = require('../middlewares/adUploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a media file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file
 */
router.post('/', protect, adUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Return the filename or full path as needed
  // Based on current convention, storing filename or /uploads/filename
  // We'll return just the filename and let the frontend/backend decide how to format it.
  // wait, Advertisement uses just filename, Category uses /uploads/filename
  // Let's return just the filename, and the caller can format it if needed.
  res.status(200).json({
    success: true,
    url: req.file.filename,
    message: 'File uploaded successfully'
  });
});

module.exports = router;
