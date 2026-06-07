const express = require('express');
const {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
} = require('../controllers/countryController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Countries
 *   description: API to manage countries
 */

/**
 * @swagger
 * /api/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by country name
 *     responses:
 *       200:
 *         description: List of countries
 *       401:
 *         description: Unauthorized
 */
router.route('/').get(protect, getAllCountries);

/**
 * @swagger
 * /api/countries:
 *   post:
 *     summary: Create a new country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       201:
 *         description: Country created
 *       400:
 *         description: Country already exists
 */
router.route('/').post(protect, createCountry);

/**
 * @swagger
 * /api/countries/{id}:
 *   get:
 *     summary: Get a country by ID
 *     tags: [Countries]
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
 *         description: Country found
 *       404:
 *         description: Country not found
 */
router.route('/:id').get(protect, getCountryById);

/**
 * @swagger
 * /api/countries/{id}:
 *   put:
 *     summary: Update a country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Country updated
 *       404:
 *         description: Country not found
 */
router.route('/:id').put(protect, updateCountry);

/**
 * @swagger
 * /api/countries/{id}:
 *   delete:
 *     summary: Delete a country
 *     tags: [Countries]
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
 *         description: Country deleted
 *       404:
 *         description: Country not found
 */
router.route('/:id').delete(protect, deleteCountry);

module.exports = router;
