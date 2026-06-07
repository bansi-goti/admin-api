const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

// Load env vars
dotenv.config();

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'admin@nayzora.com' });
    if (existingUser) {
      console.log('User admin@nayzora.com already exists.');
      process.exit();
    }

    // Create user
    const adminUser = await User.create({
      email: 'admin@nayzora.com',
      password: 'password123',
      role: 'admin'
    });

    console.log('Admin user created successfully!');
    console.log('Email:', adminUser.email);
    console.log('Password: password123');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding user:', error);
    process.exit(1);
  }
};

seedUser();
