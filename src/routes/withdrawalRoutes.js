const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
  .get(withdrawalController.getWithdrawals)
  .post(withdrawalController.requestWithdrawal);

router.route('/accounts')
  .get(withdrawalController.getPayoutAccounts)
  .post(withdrawalController.addPayoutAccount);

module.exports = router;
