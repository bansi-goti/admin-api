const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/overview', inventoryController.getInventoryOverview);

module.exports = router;
