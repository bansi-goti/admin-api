const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Order = require('./models/Order');
const Product = require('./models/Product');
const Category = require('./models/Category');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const importData = async () => {
  await connectDB();
  try {
    const subadminEmail = 'subadmin1@nayzora.com';
    const subadmin = await User.findOne({ email: subadminEmail, role: 'subadmin' });

    if (!subadmin) {
      console.error(`Subadmin not found: ${subadminEmail}`);
      process.exit(1);
    }

    // Delete existing orders for this subadmin
    await Order.deleteMany({ seller: subadmin._id });
    console.log('Cleared old orders for subadmin1.');

    // Fetch existing categories
    const categories = await Category.find();
    if (categories.length === 0) {
        console.error('No categories found. Please create categories first.');
        process.exit(1);
    }

    // Fetch existing products, or create some if none exist for this subadmin
    let products = await Product.find({ seller: subadmin._id });
    if (products.length === 0) {
        console.log('No products found for subadmin1. Creating fake products...');
        const fakeProducts = [
            { name: 'Diamond Ring', price: 45000, category: categories[0]._id, seller: subadmin._id, stock: 50 },
            { name: 'Gold Necklace', price: 85000, category: categories[1 % categories.length]._id, seller: subadmin._id, stock: 30 },
            { name: 'Silver Bracelet', price: 12000, category: categories[2 % categories.length]._id, seller: subadmin._id, stock: 100 },
            { name: 'Platinum Earrings', price: 55000, category: categories[3 % categories.length]._id, seller: subadmin._id, stock: 40 },
            { name: 'Ruby Pendant', price: 35000, category: categories[4 % categories.length]._id, seller: subadmin._id, stock: 25 },
        ];
        products = await Product.insertMany(fakeProducts);
    }

    const paymentMethods = ['UPI', 'Online Payment', 'COD', 'Card'];
    const fakeOrders = [];
    const today = new Date();

    // Create 60 orders spread over the last 30 days
    for (let i = 0; i < 60; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date(today);
      orderDate.setDate(today.getDate() - daysAgo);
      orderDate.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59));

      const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
      const items = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
          const randomProduct = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 2) + 1;
          items.push({
              product: randomProduct._id,
              quantity: qty,
              price: randomProduct.price
          });
          totalAmount += (qty * randomProduct.price);
      }

      const isDelivered = Math.random() > 0.1; // 90% delivered
      const pMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      fakeOrders.push({
        orderId: `ORD-${Date.now()}-${i}`,
        customer: {
            name: `Customer ${i}`,
            email: `customer${i}@example.com`
        },
        seller: subadmin._id,
        items: items,
        totalAmount: totalAmount,
        sellerEarning: totalAmount * 0.85,
        profit: totalAmount * 0.15,
        status: isDelivered ? 'Delivered' : 'Processing',
        paymentStatus: pMethod === 'COD' && !isDelivered ? 'Pending' : 'Paid',
        paymentMethod: pMethod,
        shippingAddress: {
            street: '123 Fake St',
            city: 'Fake City',
            state: 'Fake State',
            country: 'Fake Country',
            zipCode: '12345'
        },
        createdAt: orderDate,
        updatedAt: orderDate
      });
    }

    await Order.insertMany(fakeOrders);
    console.log(`Successfully added 60 diverse fake orders spanning 30 days for subadmin1!`);
    process.exit();
  } catch (error) {
    console.error(`Error with data import: ${error}`);
    process.exit(1);
  }
};

importData();
