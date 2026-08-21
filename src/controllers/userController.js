const User = require('../models/User');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.currency !== undefined) user.currency = req.body.currency;

    if (req.file) {
      // delete old image if it exists and isn't a default
      if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
        const oldImagePath = `.${user.profileImage}`;
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      code: 200,
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        uiRole: updatedUser.uiRole,
        phone: updatedUser.phone,
        currency: updatedUser.currency || 'INR (₹)',
        profileImage: updatedUser.profileImage,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    // Since select: false is on password, we must query again and explicitly select it
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    // Set new password (the pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle 2FA
// @route   PUT /api/users/2fa
// @access  Private
const toggleTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: `Two-factor authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`,
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  updatePassword,
  toggleTwoFactor
};
