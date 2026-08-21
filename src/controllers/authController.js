const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide an email and password');
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('Login failed: User not found for email:', email);
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log('Login failed: Password mismatch for email:', email);
      res.status(401);
      throw new Error('Invalid credentials');
    }

    res.json({
      code: 200,
      _id: user._id,
      email: user.email,
      name: user.name || '',
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { email, password, role, name, fullName, phone } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide an email and password');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    // Determine role
    let assignedRole = 'user';
    if (role === 'admin') {
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        assignedRole = 'admin';
      }
    } else if (role) {
      assignedRole = role;
    }

    const userName = name || fullName || '';

    const user = await User.create({
      email,
      password,
      name: userName,
      phone: phone || '',
      role: assignedRole,
    });

    res.status(201).json({
      code: 201,
      _id: user._id,
      email: user.email,
      name: user.name || '',
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = req.user; // populated by protect middleware
    res.json({
      code: 200,
      _id: user._id,
      email: user.email,
      name: user.name || (user.role === 'admin' ? 'Admin' : 'User'),
      role: user.role,
      uiRole: user.uiRole || (user.role === 'admin' ? 'manager' : 'user'),
      profileImage: user.profileImage || null,
      phone: user.phone || '',
      currency: user.currency || 'INR (₹)'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginUser,
  registerUser,
  getProfile,
};
