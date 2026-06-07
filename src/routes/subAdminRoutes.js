const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { protect } = require('../middlewares/authMiddleware');

const {
  getAllSubAdmins,
  getSubAdminById,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  updateSubAdminStatus
} = require('../controllers/subAdminController');

/**
 * @swagger
 * tags:
 *   name: Sub Admins
 *   description: Sub Admin management
 */

// All sub admin routes must be protected
router.use(protect);

/**
 * @swagger
 * /api/sub-admins:
 *   get:
 *     summary: Get all sub admins
 *     tags: [Sub Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sub admins
 *   post:
 *     summary: Create a new sub admin
 *     tags: [Sub Admins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               uiRole:
 *                 type: string
 *                 enum: [moderator, seller, support, manager]
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Sub admin created successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.route('/')
  .get(getAllSubAdmins)
  .post(upload.single('profileImage'), createSubAdmin);

/**
 * @swagger
 * /api/sub-admins/{id}:
 *   get:
 *     summary: Get a sub admin by ID
 *     tags: [Sub Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub Admin ID
 *     responses:
 *       200:
 *         description: Sub admin data
 *       404:
 *         description: Sub admin not found
 *   put:
 *     summary: Update sub admin details
 *     tags: [Sub Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub Admin ID
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               uiRole:
 *                 type: string
 *                 enum: [moderator, seller, support, manager]
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Sub admin updated successfully
 *       404:
 *         description: Sub admin not found
 *   delete:
 *     summary: Delete a sub admin
 *     tags: [Sub Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub Admin ID
 *     responses:
 *       200:
 *         description: Sub admin removed successfully
 *       404:
 *         description: Sub admin not found
 */
router.route('/:id')
  .get(getSubAdminById)
  .put(upload.single('profileImage'), updateSubAdmin)
  .delete(deleteSubAdmin);

/**
 * @swagger
 * /api/sub-admins/{id}/status:
 *   patch:
 *     summary: Update sub admin status
 *     tags: [Sub Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub Admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Sub admin status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Sub admin not found
 */
router.route('/:id/status')
  .patch(updateSubAdminStatus);

module.exports = router;
