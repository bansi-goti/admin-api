require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const Category = require('./models/Category');
const connectDB = require('./config/db');

const seedProducts = async () => {
  try {
    await connectDB();

    // Clear existing products
    await Product.deleteMany({});
    console.log('Existing products cleared.');

    // Get an admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Please seed users first.');
      process.exit(1);
    }

    // Get some categories
    const categories = await Category.find();
    if (categories.length === 0) {
      console.log('No categories found. Please seed categories first.');
      process.exit(1);
    }

    // Dummy Products
    const products = [
      {
        seller: admin._id,
        category: categories[0]?._id,
        name: 'Diamond Solitaire Ring',
        sku: 'RNG-DMD-001',
        price: 45000,
        stock: 12,
        sales: 5,
        status: 'Approved',
        tags: ['Ring', 'Diamond', 'Wedding'],
        mainImage: '/uploads/dummy1.jpg'
      },
      {
        seller: admin._id,
        category: categories[1]?._id || categories[0]?._id,
        name: 'Gold Chain Necklace',
        sku: 'NCK-GLD-002',
        price: 25000,
        stock: 30,
        sales: 12,
        status: 'Approved',
        tags: ['Necklace', 'Gold', 'Daily Wear'],
        mainImage: '/uploads/dummy2.jpg'
      },
      {
        seller: admin._id,
        category: categories[2]?._id || categories[0]?._id,
        name: 'Platinum Wedding Band',
        sku: 'RNG-PLT-003',
        price: 32000,
        stock: 0,
        sales: 8,
        status: 'Pending',
        tags: ['Ring', 'Platinum', 'Men'],
        mainImage: '/uploads/dummy3.jpg'
      },
      {
        seller: admin._id,
        category: categories[0]?._id,
        name: 'Ruby Drop Earrings',
        sku: 'EAR-RBY-004',
        price: 18000,
        stock: 5,
        sales: 2,
        status: 'Rejected',
        tags: ['Earrings', 'Ruby', 'Party'],
        mainImage: '/uploads/dummy4.jpg'
      }
    ];

    await Product.insertMany(products);
    console.log('Products seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

seedProducts();
