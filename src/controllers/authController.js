const { sendEmail, sendWhatsApp } = require('../services/notificationService');
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


// In-memory OTP storage: phone -> { otp, expiresAt }
const otpStore = new Map();

// @desc    Send OTP to phone via WhatsApp
// @route   POST /api/auth/send-otp-whatsapp
// @access  Public

// Unified Send OTP Handler (Supports WhatsApp OTP, Email OTP & Dual Both OTP)
// @desc    Send OTP to phone (WhatsApp), email, or BOTH
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res, next) => {
  try {
    const { contact, phone, email } = req.body;
    const rawContact = (contact || '').trim();
    const rawPhone = (phone || (!rawContact.includes('@') ? rawContact : '')).trim();
    const rawEmail = (email || (rawContact.includes('@') ? rawContact : '')).trim();

    const cleanPhone = rawPhone.replace(/\D/g, '');
    const cleanEmail = rawEmail.toLowerCase();

    const hasPhone = Boolean(cleanPhone && cleanPhone.length >= 10);
    const hasEmail = Boolean(cleanEmail && cleanEmail.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail));

    if (!hasPhone && !hasEmail) {
      res.status(400);
      throw new Error('Please enter a valid mobile number or email address');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const otpData = { otp, expiresAt };

    if (hasPhone) {
      otpStore.set(cleanPhone, otpData);
    }
    if (hasEmail) {
      otpStore.set(cleanEmail, otpData);
    }

    let emailSent = false;
    let waSent = false;

    // Send Email OTP if email exists
    if (hasEmail) {
      const emailSubject = `Your Nayzora Verification OTP Code`;
      const emailHtml = `<div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #6d28d9; margin-top: 0;">Nayzora Verification</h2>
        <p style="font-size: 14px; color: #475569;">Your 6-Digit Checkout Verification OTP code is:</p>
        <div style="background: #f3e8ff; color: #6d28d9; padding: 14px 24px; display: inline-block; border-radius: 10px; font-weight: 800; font-size: 24px; letter-spacing: 6px; margin: 10px 0;">${otp}</div>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">This OTP code is valid for 5 minutes. Please do not share this OTP with anyone.</p>
      </div>`;

      emailSent = await sendEmail({ to: cleanEmail, subject: emailSubject, html: emailHtml });
    }

    // Send WhatsApp OTP if phone exists
    let defaultWhatsappUrl = '';
    if (hasPhone) {
      const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
      const whatsappMsg = `Your Nayzora Verification OTP is *${otp}*. Valid for 5 minutes. Please do not share this OTP with anyone.`;
      const encodedMsg = encodeURIComponent(whatsappMsg);
      defaultWhatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;

      waSent = await sendWhatsApp({ phone: cleanPhone, message: whatsappMsg });
    }

    if (hasPhone && hasEmail) {
      return res.status(200).json({
        success: true,
        mode: 'both',
        message: `OTP sent successfully to BOTH ${cleanPhone} (WhatsApp) and ${cleanEmail} (Email)!`,
        contact: cleanPhone || cleanEmail,
        whatsappUrl: defaultWhatsappUrl,
        emailSent,
        waSent,
      });
    } else if (hasPhone) {
      return res.status(200).json({
        success: true,
        mode: 'whatsapp',
        message: `OTP sent successfully to +${cleanPhone} on WhatsApp!`,
        contact: cleanPhone,
        whatsappUrl: defaultWhatsappUrl,
        apiSent: waSent,
      });
    } else {
      return res.status(200).json({
        success: true,
        mode: 'email',
        message: `OTP sent successfully to ${cleanEmail} on Email!`,
        contact: cleanEmail,
        emailSent,
      });
    }
  } catch (error) {
    next(error);
  }
};


// Update verifyOtp to handle both email and phone keys & auto-login / auto-register user
const verifyOtp = async (req, res, next) => {
  try {
    const { contact, phone, email, otp } = req.body;
    const rawInput = (contact || phone || email || '').trim();
    const cleanOtp = (otp || '').trim();

    if (!rawInput) {
      res.status(400);
      throw new Error('Please enter a valid mobile number or email address');
    }

    if (!cleanOtp) {
      res.status(400);
      throw new Error('Please enter the 6-digit OTP code');
    }

    const isEmailInput = rawInput.includes('@');
    const key = isEmailInput ? rawInput.toLowerCase() : rawInput.replace(/\D/g, '');
    const storedData = otpStore.get(key);

    if (!storedData) {
      res.status(400);
      throw new Error('OTP expired or not requested. Please click "Get OTP" again.');
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(key);
      res.status(400);
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    if (storedData.otp !== cleanOtp) {
      res.status(400);
      throw new Error('Invalid OTP code. Please enter the correct code received.');
    }

    otpStore.delete(key);

    // Auto-login or Auto-register user account
    const User = require('../models/User');
    const generateToken = require('../utils/generateToken');

    let user;
    if (isEmailInput) {
      user = await User.findOne({ email: key });
    } else {
      user = await User.findOne({ phone: key });
    }

    if (!user) {
      // Auto-create user account for seamless checkout login
      const defaultEmail = isEmailInput ? key : `${key}@nayzora.com`;
      const defaultName = isEmailInput
        ? key.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim()
        : `Customer ${key.slice(-4)}`;
      const randomPass = Math.random().toString(36).slice(-8) + 'N#1';

      user = await User.create({
        name: defaultName || 'Valued Customer',
        email: defaultEmail,
        phone: !isEmailInput ? key : '',
        password: randomPass,
        role: 'user',
        status: 'Active',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      verified: true,
      message: `${isEmailInput ? 'Email' : 'Mobile number'} verified & logged in successfully!`,
      contact: key,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};


const sendOtpWhatsApp = sendOtp;

module.exports = {
  sendOtp,
  sendOtpWhatsApp,
  verifyOtp,
  loginUser,
  registerUser,
  getProfile,
};
