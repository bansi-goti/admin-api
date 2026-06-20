const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/overview', protect, inventoryController.getInventoryOverview);
router.post('/add', protect, inventoryController.addInventory);

module.exports = router;
