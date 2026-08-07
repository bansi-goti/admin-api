require('dotenv').config();
const connectDB = require('../config/db');
const Country = require('../models/Country');
const User = require('../models/User');

const sampleCountries = [
  {
    name: 'India',
    status: 'Active',
    currency: {
      code: 'INR',
      name: 'Indian Rupee',
      symbol: '₹',
      exchangeRate: 1, // Base currency
    },
  },
  {
    name: 'United States',
    status: 'Active',
    currency: {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      exchangeRate: 0.012, // 1 INR = 0.012 USD (~$12 for ₹1000)
    },
  },
  {
    name: 'United Kingdom',
    status: 'Active',
    currency: {
      code: 'GBP',
      name: 'British Pound',
      symbol: '£',
      exchangeRate: 0.0094, // 1 INR = 0.0094 GBP
    },
  },
  {
    name: 'European Union',
    status: 'Active',
    currency: {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      exchangeRate: 0.011, // 1 INR = 0.011 EUR
    },
  },
  {
    name: 'United Arab Emirates',
    status: 'Active',
    currency: {
      code: 'AED',
      name: 'UAE Dirham',
      symbol: 'AED',
      exchangeRate: 0.044, // 1 INR = 0.044 AED
    },
  },
  {
    name: 'Canada',
    status: 'Active',
    currency: {
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'CA$',
      exchangeRate: 0.016, // 1 INR = 0.016 CAD
    },
  },
  {
    name: 'Australia',
    status: 'Active',
    currency: {
      code: 'AUD',
      name: 'Australian Dollar',
      symbol: 'A$',
      exchangeRate: 0.018, // 1 INR = 0.018 AUD
    },
  },
];

async function seedCountries() {
  try {
    await connectDB();
    console.log('🌱 Starting Countries Seeder...');

    const admin = await User.findOne({ role: 'admin' });
    const sellerId = admin ? admin._id : new mongoose.Types.ObjectId();

    await Country.deleteMany({});
    console.log('🧹 Cleared previous Countries collection.');

    const docs = sampleCountries.map(c => ({
      ...c,
      seller: sellerId,
    }));

    await Country.insertMany(docs);
    console.log('🎉 Countries & Currencies Seeder completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Countries Seeder failed:', error);
    process.exit(1);
  }
}

seedCountries();
