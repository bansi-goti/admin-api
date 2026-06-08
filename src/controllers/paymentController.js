const PaymentSetting = require('../models/PaymentSetting');

// @desc    Get all payment settings
// @route   GET /api/settings/payments
// @access  Private
const getPaymentSettings = async (req, res, next) => {
  try {
    const settings = await PaymentSetting.find({});

    res.status(200).json({
      success: true,
      data: {
        data: settings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save/Upsert payment setting
// @route   POST /api/settings/payments
// @access  Private
const savePaymentSetting = async (req, res, next) => {
  try {
    const { gateway, keyId, keySecret, mode, isActive } = req.body;

    if (!gateway || !keyId || !keySecret) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Upsert: Find by gateway, update if exists, else create new
    const setting = await PaymentSetting.findOneAndUpdate(
      { gateway },
      { keyId, keySecret, mode, isActive },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: setting,
      message: `${gateway} settings saved successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment setting status
// @route   PATCH /api/settings/payments/:id/status
// @access  Private
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const setting = await PaymentSetting.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!setting) {
      return res.status(404).json({ success: false, message: 'Payment setting not found' });
    }

    res.status(200).json({
      success: true,
      data: setting,
      message: `${setting.gateway} status updated`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPaymentSettings,
  savePaymentSetting,
  updatePaymentStatus,
};
