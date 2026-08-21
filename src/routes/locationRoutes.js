const express = require('express');
const {
  getStates,
  getCitiesByState,
  seedLocations,
} = require('../controllers/locationController');

const router = express.Router();

router.get('/states', getStates);
router.get('/cities', getCitiesByState);
router.post('/seed', seedLocations);

module.exports = router;
