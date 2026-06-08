require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Order = require('./models/Order');
const connectDB = require('./config/db');

const seedCustomers = async () => {
  try {
    await connectDB();

    // Get admin
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Please seed users first.');
      process.exit(1);
    }

    console.log('Seeding customers and mapping their orders...');

    // Delete existing users with role 'user'
    await User.deleteMany({ role: 'user' });

    const today = new Date();

    const customers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
      },
      {
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
      },
      {
        name: 'Mike Tyson',
        email: 'mike@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago (New this month)
      },
      {
        name: 'Emma Watson',
        email: 'emma@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      },
      {
        name: 'Bruce Wayne',
        email: 'bruce@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago (New this month)
      },
      {
        name: 'Clark Kent',
        email: 'clark@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000) // 50 days ago
      },
      {
        name: 'Diana Prince',
        email: 'diana@example.com',
        password: 'password123',
        role: 'user',
        createdAt: new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
      }
    ];

    await User.insertMany(customers);
    console.log('Dummy customers inserted.');

    console.log('Customer seeding completed successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding customers:', error);
    process.exit(1);
  }
};

seedCustomers();
