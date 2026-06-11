const mongoose = require('mongoose');
require('dotenv').config({ path: 'F:\\admin api\\.env' });
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');
const Category = require('./models/Category');

const testDashboard = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  const user = await User.findOne({ role: 'subadmin' });
  const req = { user, query: { timeframe: 'month' } };
  
  const res = {
    json: (data) => {
      console.log('--- REVENUE TREND ---');
      console.log(JSON.stringify(data.chartData.revenueTrend, null, 2));
      console.log('--- CATEGORY DATA ---');
      console.log(JSON.stringify(data.chartData.categoryData, null, 2));
      process.exit(0);
    }
  };
  
  const { getDashboardStats } = require('./controllers/dashboardController');
  await getDashboardStats(req, res, (err) => { console.error(err); process.exit(1); });
};

testDashboard();
