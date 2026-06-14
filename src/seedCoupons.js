const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Coupon = require('./models/Coupon');

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
    const subadminEmail = 'subadmin1@nayzora.com';
    const subadmin = await User.findOne({ email: subadminEmail });

    if (!subadmin) {
      console.error(`Subadmin not found: ${subadminEmail}`);
      process.exit(1);
    }

    await Coupon.deleteMany({ seller: subadmin._id });

    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(now.getMonth() + 1);
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);

    const fakeCoupons = [
      {
        code: 'SAVE20',
        name: 'Summer Sale',
        discountType: 'Percentage (%)',
        discountValue: 20,
        minOrder: 1000,
        maxDiscount: 500,
        usageLimit: 1000,
        usedCount: 320,
        perCustomer: 1,
        validFrom: now,
        validTo: nextMonth,
        seller: subadmin._id
      },
      {
        code: 'FREESHIP',
        name: 'Free Shipping Promo',
        discountType: 'Free Shipping',
        discountValue: 0,
        minOrder: 499,
        maxDiscount: 0,
        usageLimit: 1000,
        usedCount: 527,
        perCustomer: 1,
        validFrom: now,
        validTo: nextMonth,
        seller: subadmin._id
      },
      {
        code: 'WELCOME10',
        name: 'Welcome Offer',
        discountType: 'Percentage (%)',
        discountValue: 10,
        minOrder: 0,
        maxDiscount: 500,
        usageLimit: 500,
        usedCount: 245,
        perCustomer: 1,
        validFrom: lastMonth,
        validTo: nextMonth,
        seller: subadmin._id
      },
      {
        code: 'FLAT200',
        name: 'Flat Discount',
        discountType: 'Fixed Amount (₹)',
        discountValue: 200,
        minOrder: 1000,
        maxDiscount: 0,
        usageLimit: 300,
        usedCount: 156,
        perCustomer: 1,
        validFrom: now,
        validTo: nextMonth,
        seller: subadmin._id
      },
      {
        code: 'EXTRA5',
        name: 'Extra 5% Off',
        discountType: 'Percentage (%)',
        discountValue: 5,
        minOrder: 0,
        maxDiscount: 300,
        usageLimit: 200,
        usedCount: 0,
        perCustomer: 1,
        validFrom: nextMonth, // Scheduled
        validTo: new Date(nextMonth.getTime() + 86400000 * 30),
        seller: subadmin._id
      },
      {
        code: 'OLD25',
        name: 'Old User Offer',
        discountType: 'Percentage (%)',
        discountValue: 25,
        minOrder: 0,
        maxDiscount: 1500,
        usageLimit: 500,
        usedCount: 500,
        perCustomer: 1,
        validFrom: lastMonth,
        validTo: new Date(now.getTime() - 86400000), // Expired
        seller: subadmin._id
      }
    ];

    await Coupon.insertMany(fakeCoupons);
    console.log('Coupons imported successfully for subadmin1');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
