const express = require('express');
const router = express.Router();
const { calculateShippingAndPrice } = require('../controllers/shippingController');

router.post('/calculate', calculateShippingAndPrice);

module.exports = router;
