require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const connectDB = require('./config/db');

const seedOrders = async () => {
  try {
    await connectDB();

    // Clear existing orders
    await Order.deleteMany({});
    console.log('Existing orders cleared.');

    // Get an admin user to act as seller for dummy orders
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Please seed users first.');
      process.exit(1);
    }

    // Dummy Orders spread across the last 7 days
    const today = new Date();
    
    const orders = [
      {
        seller: admin._id,
        orderId: 'ORD-8921',
        customer: { name: 'John Doe', email: 'john@example.com' },
        totalAmount: 12500,
        paymentMethod: 'Stripe',
        status: 'Delivered',
        createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
      },
      {
        seller: admin._id,
        orderId: 'ORD-8922',
        customer: { name: 'Sarah Connor', email: 'sarah@example.com' },
        totalAmount: 8400,
        paymentMethod: 'PayPal',
        status: 'Delivered',
        createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        seller: admin._id,
        orderId: 'ORD-8923',
        customer: { name: 'Mike Tyson', email: 'mike@example.com' },
        totalAmount: 45000,
        paymentMethod: 'Razorpay',
        status: 'Shipped',
        createdAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        seller: admin._id,
        orderId: 'ORD-8924',
        customer: { name: 'Emma Watson', email: 'emma@example.com' },
        totalAmount: 3200,
        paymentMethod: 'Stripe',
        status: 'Processing',
        createdAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        seller: admin._id,
        orderId: 'ORD-8925',
        customer: { name: 'Bruce Wayne', email: 'bruce@example.com' },
        totalAmount: 95000,
        paymentMethod: 'Bank Transfer',
        status: 'Processing',
        createdAt: new Date() // Today
      },
      {
        seller: admin._id,
        orderId: 'ORD-8926',
        customer: { name: 'Clark Kent', email: 'clark@example.com' },
        totalAmount: 1500,
        paymentMethod: 'Stripe',
        status: 'Cancelled',
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        seller: admin._id,
        orderId: 'ORD-8927',
        customer: { name: 'Diana Prince', email: 'diana@example.com' },
        totalAmount: 22000,
        paymentMethod: 'Razorpay',
        status: 'Refunded',
        createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      }
    ];

    await Order.insertMany(orders);
    console.log('Orders seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding orders:', error);
    process.exit(1);
  }
};

seedOrders();
