const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');

dotenv.config();

async function testDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    
    console.log('Total Products in DB:', productCount);
    console.log('Total Orders in DB:', orderCount);
    
    const firstProduct = await Product.findOne();
    console.log('First Product:', firstProduct);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDB();
