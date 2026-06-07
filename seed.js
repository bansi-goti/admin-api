const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');
const User = require('./src/models/User');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const importData = async () => {
  await connectDB();

  try {
    // Clear old data (if any)
    await Order.deleteMany();
    await Product.deleteMany();

    // Find the admin user to attach products and orders to
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Attempting to find any user...');
      admin = await User.findOne(); // fallback to any existing user
    }
    
    if (!admin) {
        console.error('No users exist in the DB! Please register at least one user from the website first.');
        process.exit(1);
    }

    // Create Dummy Products
    const productsData = [
      { name: "Diamond Necklace", code: "PROD-001", price: 15000, sales: 45, seller: admin._id },
      { name: "Gold Bangles Set", code: "PROD-002", price: 25000, sales: 30, seller: admin._id },
      { name: "Platinum Ring", code: "PROD-003", price: 35000, sales: 15, seller: admin._id },
      { name: "Silver Anklet Pair", code: "PROD-004", price: 2000, sales: 60, seller: admin._id },
      { name: "Ruby Earrings", code: "PROD-005", price: 18000, sales: 25, seller: admin._id },
      { name: "Emerald Pendant", code: "PROD-006", price: 22000, sales: 12, seller: admin._id },
      { name: "Bridal Jewellery Set", code: "PROD-007", price: 85000, sales: 5, seller: admin._id },
      { name: "Rose Gold Bracelet", code: "PROD-008", price: 12000, sales: 40, seller: admin._id },
    ];

    await Product.insertMany(productsData);
    console.log('Products Seeded!');

    // Create Dummy Orders spread across time for charts
    const customers = ["Rahul Sharma", "Priya Patel", "Amit Verma", "Sneha Iyer", "Vikram Singh", "Neha Gupta", "Rohan Das"];
    const statuses = ["Completed", "Completed", "Completed", "Pending", "Cancelled"]; // More weight to Completed
    
    const ordersData = [];
    const now = new Date();

    // Create 45 random orders spread over the last 40 days
    for (let i = 1; i <= 45; i++) {
      const daysAgo = Math.floor(Math.random() * 40); // 0 to 39 days ago
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - daysAgo);

      ordersData.push({
        seller: admin._id,
        orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: { name: customers[Math.floor(Math.random() * customers.length)] },
        totalAmount: Math.floor(Math.random() * 40000) + 1500,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt,
        updatedAt: createdAt
      });
    }

    // Add exactly 3 orders for TODAY so the "Today" filter looks nice
    for (let i = 1; i <= 3; i++) {
        ordersData.push({
            seller: admin._id,
            orderId: `ORD-TODAY-${i}`,
            customer: { name: "Aarav " + i },
            totalAmount: 1500 * i,
            status: 'Completed',
            createdAt: new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)), // 2, 4, 6 hours ago
            updatedAt: new Date()
        })
    }
    
    // Add 2 orders for YESTERDAY so "Today" filter has a trend comparison
    for (let i = 1; i <= 2; i++) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        ordersData.push({
            seller: admin._id,
            orderId: `ORD-YEST-${i}`,
            customer: { name: "Yest Cust " + i },
            totalAmount: 2000 * i,
            status: 'Completed',
            createdAt: yesterday,
            updatedAt: yesterday
        })
    }

    await Order.insertMany(ordersData);
    console.log('Orders Seeded with Timeline Data!');

    console.log('Dummy Data Injection Complete!');
    process.exit();
  } catch (error) {
    console.error(`Seed Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
