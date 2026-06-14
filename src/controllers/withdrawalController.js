const Withdrawal = require('../models/Withdrawal');
const PayoutAccount = require('../models/PayoutAccount');
const Order = require('../models/Order');

// Helper to calculate total earnings
const calculateEarnings = async (userId, role) => {
  const query = role === 'admin' ? {} : { seller: userId };
  const orders = await Order.find(query);
  
  let totalEarnings = 0;
  let pendingPayout = 0;

  orders.forEach(order => {
    if (order.status === 'Delivered' || order.status === 'Completed') {
      totalEarnings += role === 'admin' ? (order.profit || 0) : (order.sellerEarning || (order.totalAmount * 0.85));
    } else if (!['Refunded', 'Cancelled', 'Returned'].includes(order.status)) {
      pendingPayout += role === 'admin' ? (order.profit || 0) : (order.sellerEarning || (order.totalAmount * 0.85));
    }
  });

  return { totalEarnings, pendingPayout };
};

// @desc    Get withdrawal stats & history
// @route   GET /api/withdrawals
// @access  Private
exports.getWithdrawals = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    
    const query = {};
    if (req.user.role !== 'admin') {
      query.seller = req.user._id;
    }

    if (status && status !== 'All Status') {
      query.status = status;
    }

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: new Date(startDate), $lte: end };
    }

    // Optional Search by ID or Remarks (Withdrawal model doesn't have much text)
    // Could do lookup for Bank account if needed, but skipped for simplicity

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const withdrawals = await Withdrawal.find(query)
      .populate('payoutAccount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalItems = await Withdrawal.countDocuments(query);

    // Get all withdrawals for stats calculation
    const allWithdrawals = await Withdrawal.find(req.user.role === 'admin' ? {} : { seller: req.user._id });
    
    let totalWithdrawn = 0;
    let pendingWithdrawn = 0;

    allWithdrawals.forEach(w => {
      if (w.status === 'Completed') totalWithdrawn += w.amount;
      else if (w.status === 'Processing') pendingWithdrawn += w.amount;
    });

    // Calculate Earnings
    const { totalEarnings, pendingPayout } = await calculateEarnings(req.user._id, req.user.role);
    
    const currentBalance = totalEarnings;
    const availableForWithdrawal = currentBalance - totalWithdrawn - pendingWithdrawn;

    const formattedHistory = withdrawals.map(w => ({
      id: `WD-${w._id.toString().substring(18).toUpperCase()}`,
      originalId: w._id,
      date: new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date(w.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      amount: `₹${w.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      account: w.payoutAccount ? w.payoutAccount.bankName : 'Unknown Bank',
      accountNo: w.payoutAccount ? `**** **** ${w.payoutAccount.accountNumber.slice(-4)}` : '****',
      status: w.status,
      remarks: w.remarks
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          currentBalance,
          availableForWithdrawal: Math.max(0, availableForWithdrawal),
          pendingAmount: pendingWithdrawn,
          totalWithdrawn
        },
        history: formattedHistory,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request a withdrawal
// @route   POST /api/withdrawals
// @access  Private
exports.requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, payoutAccountId } = req.body;

    if (!amount || amount < 1000) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹1000' });
    }

    if (!payoutAccountId) {
      return res.status(400).json({ success: false, message: 'Payout account is required' });
    }

    // Calculate available balance
    const { totalEarnings } = await calculateEarnings(req.user._id, req.user.role);
    const allWithdrawals = await Withdrawal.find({ seller: req.user._id });
    let totalWithdrawn = 0;
    let pendingWithdrawn = 0;
    allWithdrawals.forEach(w => {
      if (w.status === 'Completed') totalWithdrawn += w.amount;
      else if (w.status === 'Processing') pendingWithdrawn += w.amount;
    });

    const availableForWithdrawal = totalEarnings - totalWithdrawn - pendingWithdrawn;

    if (amount > availableForWithdrawal) {
      return res.status(400).json({ success: false, message: 'Insufficient available balance' });
    }

    const withdrawal = await Withdrawal.create({
      seller: req.user._id,
      amount: Number(amount),
      payoutAccount: payoutAccountId,
      status: 'Processing',
      remarks: 'Pending transfer'
    });

    res.status(201).json({ success: true, data: withdrawal, message: 'Withdrawal requested successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payout accounts
// @route   GET /api/withdrawals/accounts
// @access  Private
exports.getPayoutAccounts = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { seller: req.user._id };
    const accounts = await PayoutAccount.find(query).sort({ isPrimary: -1, createdAt: -1 });

    const formattedAccounts = accounts.map(a => ({
      _id: a._id,
      bank: a.bankName,
      name: a.accountHolderName,
      number: `**** **** ${a.accountNumber.slice(-4)}`,
      fullNumber: a.accountNumber,
      status: a.isPrimary ? 'Primary' : 'Secondary',
      icon: '🏦'
    }));

    res.status(200).json({ success: true, data: formattedAccounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Add payout account
// @route   POST /api/withdrawals/accounts
// @access  Private
exports.addPayoutAccount = async (req, res, next) => {
  try {
    const { bankName, accountHolderName, accountNumber, isPrimary } = req.body;

    if (!bankName || !accountHolderName || !accountNumber) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (isPrimary) {
      // Unset other primary accounts
      await PayoutAccount.updateMany({ seller: req.user._id }, { isPrimary: false });
    } else {
      // If no accounts exist, make this primary
      const existing = await PayoutAccount.countDocuments({ seller: req.user._id });
      if (existing === 0) req.body.isPrimary = true;
    }

    const account = await PayoutAccount.create({
      seller: req.user._id,
      bankName,
      accountHolderName,
      accountNumber,
      isPrimary: req.body.isPrimary || false
    });

    res.status(201).json({ success: true, data: account, message: 'Account added successfully' });
  } catch (error) {
    next(error);
  }
};
