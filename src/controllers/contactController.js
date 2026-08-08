const Contact = require('../models/Contact');
const Notification = require('../models/Notification');

// @desc    Create contact inquiry message
// @route   POST /api/contact
// @access  Public
const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required fields',
      });
    }

    const contact = await Contact.create({
      name,
      email,
      phone: phone || '',
      subject: subject || 'General Inquiry',
      message,
    });

    // Create system notification so Admin gets alerted immediately in Admin Panel
    try {
      await Notification.create({
        title: `New Inquiry from ${name}`,
        message: `[${subject || 'General Inquiry'}] ${message.slice(0, 120)}... (Email: ${email}, Ph: ${phone || 'N/A'})`,
        type: 'System',
        isUnread: true,
      });
    } catch (notifErr) {
      console.warn('Failed to create notification for contact inquiry:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      data: contact,
      message: 'Thank you! Your message has been received successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Public
const getContactMessages = async (req, res, next) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
};
