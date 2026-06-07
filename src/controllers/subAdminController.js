const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Helper to remove uploaded file in case of error or update
const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.join(__dirname, '../..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// @desc    Get all sub admins
// @route   GET /api/sub-admins
// @access  Private/Admin
const getAllSubAdmins = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = { role: 'subadmin' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const subAdmins = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      code: 200,
      data: subAdmins,
      total,
      totalPages: Math.ceil(total / limit),
      page: Number(page)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sub admin by ID
// @route   GET /api/sub-admins/:id
// @access  Private/Admin
const getSubAdminById = async (req, res, next) => {
  try {
    const subAdmin = await User.findById(req.params.id).select('-password');
    if (!subAdmin || subAdmin.role !== 'subadmin') {
      res.status(404);
      throw new Error('Sub admin not found');
    }
    res.json({
      code: 200,
      data: subAdmin
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create sub admin
// @route   POST /api/sub-admins
// @access  Private/Admin
const createSubAdmin = async (req, res, next) => {
  try {
    const { name, email, password, uiRole } = req.body;

    if (!name || !email || !password) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      res.status(400);
      throw new Error('Please provide name, email and password');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      res.status(400);
      throw new Error('User already exists');
    }

    let profileImage = null;
    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    const subAdmin = await User.create({
      name,
      email,
      password, // Password will be hashed in the User model pre-save middleware
      role: 'subadmin',
      uiRole: uiRole || 'moderator',
      profileImage,
      status: 'Active'
    });

    res.status(201).json({
      code: 201,
      message: 'Sub admin created successfully',
      data: {
        _id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        uiRole: subAdmin.uiRole,
        profileImage: subAdmin.profileImage,
        status: subAdmin.status
      }
    });
  } catch (error) {
    if (req.file) removeFile(`/uploads/${req.file.filename}`);
    next(error);
  }
};

// @desc    Update sub admin
// @route   PUT /api/sub-admins/:id
// @access  Private/Admin
const updateSubAdmin = async (req, res, next) => {
  try {
    const { name, email, password, uiRole } = req.body;

    const subAdmin = await User.findById(req.params.id);

    if (!subAdmin || subAdmin.role !== 'subadmin') {
      if (req.file) removeFile(`/uploads/${req.file.filename}`);
      res.status(404);
      throw new Error('Sub admin not found');
    }

    // Check if email is being updated and already exists
    if (email && email !== subAdmin.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        if (req.file) removeFile(`/uploads/${req.file.filename}`);
        res.status(400);
        throw new Error('Email already in use');
      }
    }

    subAdmin.name = name || subAdmin.name;
    subAdmin.email = email || subAdmin.email;
    if (uiRole) subAdmin.uiRole = uiRole;

    if (password) {
      subAdmin.password = password; // Will be hashed by pre-save
    }

    if (req.file) {
      // Remove old image if exists
      if (subAdmin.profileImage) {
        removeFile(subAdmin.profileImage);
      }
      subAdmin.profileImage = `/uploads/${req.file.filename}`;
    }

    const updatedSubAdmin = await subAdmin.save();

    res.json({
      code: 200,
      message: 'Sub admin updated successfully',
      data: {
        _id: updatedSubAdmin._id,
        name: updatedSubAdmin.name,
        email: updatedSubAdmin.email,
        uiRole: updatedSubAdmin.uiRole,
        profileImage: updatedSubAdmin.profileImage,
        status: updatedSubAdmin.status
      }
    });
  } catch (error) {
    if (req.file) removeFile(`/uploads/${req.file.filename}`);
    next(error);
  }
};

// @desc    Delete sub admin
// @route   DELETE /api/sub-admins/:id
// @access  Private/Admin
const deleteSubAdmin = async (req, res, next) => {
  try {
    const subAdmin = await User.findById(req.params.id);

    if (!subAdmin || subAdmin.role !== 'subadmin') {
      res.status(404);
      throw new Error('Sub admin not found');
    }

    // Remove image if exists
    if (subAdmin.profileImage) {
      removeFile(subAdmin.profileImage);
    }

    await subAdmin.deleteOne();

    res.json({ code: 200, message: 'Sub admin removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sub admin status
// @route   PATCH /api/sub-admins/:id/status
// @access  Private/Admin
const updateSubAdminStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['Active', 'Inactive'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }

    const subAdmin = await User.findById(req.params.id);

    if (!subAdmin || subAdmin.role !== 'subadmin') {
      res.status(404);
      throw new Error('Sub admin not found');
    }

    subAdmin.status = status;
    const updatedSubAdmin = await subAdmin.save();

    res.json({
      code: 200,
      message: 'Sub admin status updated',
      data: {
        _id: updatedSubAdmin._id,
        status: updatedSubAdmin.status
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSubAdmins,
  getSubAdminById,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  updateSubAdminStatus
};
