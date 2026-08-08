const Address = require('../models/Address');

// @desc    Get user addresses
// @route   GET /api/addresses
// @access  Public/Private
const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const guestId = req.query.guestId || '';

    let query = {};
    if (userId) {
      query = { user: userId };
    } else if (guestId) {
      query = { guestId };
    } else {
      // Return latest public addresses or empty array
      const addresses = await Address.find().sort({ createdAt: -1 }).limit(10);
      return res.status(200).json({ success: true, data: addresses });
    }

    const addresses = await Address.find(query).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new address
// @route   POST /api/addresses
// @access  Public/Private
const createAddress = async (req, res, next) => {
  try {
    const { fullName, streetAddress, city, state, pincode, phone, isDefault, guestId } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!fullName || !streetAddress || !city || !pincode || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name, street address, city, pincode, and phone are required fields',
      });
    }

    // If setting as default, clear default flag on user's existing addresses
    if (isDefault) {
      const resetQuery = userId ? { user: userId } : { guestId: guestId || '' };
      await Address.updateMany(resetQuery, { isDefault: false });
    }

    const address = await Address.create({
      user: userId,
      guestId: guestId || '',
      fullName,
      streetAddress,
      city,
      state: state || 'Maharashtra',
      pincode,
      phone,
      isDefault: Boolean(isDefault),
    });

    res.status(201).json({
      success: true,
      data: address,
      message: 'Shipping address created successfully!',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Public/Private
const updateAddress = async (req, res, next) => {
  try {
    let address = await Address.findById(req.params.id);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    const { fullName, streetAddress, city, state, pincode, phone, isDefault } = req.body;
    const userId = req.user ? req.user._id : null;

    if (isDefault) {
      const resetQuery = userId ? { user: userId } : { guestId: address.guestId };
      await Address.updateMany(resetQuery, { isDefault: false });
    }

    address = await Address.findByIdAndUpdate(
      req.params.id,
      {
        fullName: fullName || address.fullName,
        streetAddress: streetAddress || address.streetAddress,
        city: city || address.city,
        state: state || address.state,
        pincode: pincode || address.pincode,
        phone: phone || address.phone,
        isDefault: typeof isDefault === 'boolean' ? isDefault : address.isDefault,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: address,
      message: 'Shipping address updated successfully!',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Public/Private
const deleteAddress = async (req, res, next) => {
  try {
    const address = await Address.findByIdAndDelete(req.params.id);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shipping address deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
