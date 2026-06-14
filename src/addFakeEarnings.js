const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Order = require('./models/Order');

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

    const fakeOrders = [];
    for (let i = 0; i < 5; i++) {
      fakeOrders.push({
        customer: {
            name: 'Fake Customer',
            email: 'fake@example.com'
        },
        orderId: `ORD-${Date.now()}-${i}`,
        seller: subadmin._id,
        items: [],
        totalAmount: 50000,
        sellerEarning: 40000,
        profit: 10000,
        status: 'Delivered',
        paymentStatus: 'Paid',
        shippingAddress: {
            street: '123 Fake St',
            city: 'Fake City',
            state: 'Fake State',
            country: 'Fake Country',
            zipCode: '12345'
        }
      });
    }

    await Order.insertMany(fakeOrders);
    console.log(`Added 5 fake delivered orders. Earnings increased by ₹2,00,000`);
    process.exit();
  } catch (error) {
    console.error(`Error with data import: ${error}`);
    process.exit(1);
  }
};

importData();
