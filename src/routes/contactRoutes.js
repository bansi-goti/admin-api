const express = require('express');
const { createContactMessage, getContactMessages } = require('../controllers/contactController');

const router = express.Router();

router.route('/')
  .post(createContactMessage)
  .get(getContactMessages);

module.exports = router;
