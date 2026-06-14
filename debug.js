require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Order = require('./src/models/Order');
const connectDB = require('./src/config/db');

async function run() {
  await connectDB();
  const subadmins = await User.find({ role: 'subadmin' });
  for (const s of subadmins) {
    const customerEmails = await Order.distinct('customer.email', { seller: s._id });
    const query = { role: 'user', email: { $in: customerEmails } };
    const customers = await User.find(query).lean();
    console.log(`Subadmin ${s.email}: found ${customers.length} customers.`);
    if (customers.length > 0) {
      console.log('Customer data:', customers[0]);
    }
  }
  process.exit(0);
}

run();
