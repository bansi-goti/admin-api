const express = require('express');
const router = express.Router();
const { loginUser, registerUser } = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication operations
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login an admin user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email
 *               password:
 *                 type: string
 *                 description: The user's password
 *             example:
 *               email: admin@nayzora.com
 *               password: password123
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The user ID
 *                 email:
 *                   type: string
 *                   description: The user email
 *                 role:
 *                   type: string
 *                   description: The user role
 *                 token:
 *                   type: string
 *                   description: The JWT token
 *       400:
 *         description: Bad request (missing fields)
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (only one admin allowed)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, subadmin, user]
 *                 description: System forces 'user' if an admin already exists
 *             example:
 *               email: newuser@nayzora.com
 *               password: password123
 *               role: user
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/register', registerUser);

module.exports = router;
