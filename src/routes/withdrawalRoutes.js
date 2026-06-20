const express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Withdrawals
 *   description: Withdrawal management endpoints
 */

/**
 * @swagger
 * /api/withdrawals:
 *   get:
 *     summary: Get withdrawals
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Withdrawals retrieved
 *   post:
 *     summary: Request withdrawal
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Withdrawal requested
 */
router.route('/')
  .get(withdrawalController.getWithdrawals)
  .post(withdrawalController.requestWithdrawal);

/**
 * @swagger
 * /api/withdrawals/accounts:
 *   get:
 *     summary: Get payout accounts
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounts retrieved
 *   post:
 *     summary: Add payout account
 *     tags: [Withdrawals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Account added
 */
router.route('/accounts')
  .get(withdrawalController.getPayoutAccounts)
  .post(withdrawalController.addPayoutAccount);

module.exports = router;
