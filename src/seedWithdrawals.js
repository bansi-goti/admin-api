const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const PayoutAccount = require('./models/PayoutAccount');
const Withdrawal = require('./models/Withdrawal');

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

    console.log(`Found subadmin: ${subadmin.name} (${subadmin._id})`);

    // Clear existing withdrawals/accounts for this subadmin
    await PayoutAccount.deleteMany({ seller: subadmin._id });
    await Withdrawal.deleteMany({ seller: subadmin._id });

    // 1. Create Payout Accounts
    const accounts = await PayoutAccount.insertMany([
      {
        seller: subadmin._id,
        bankName: 'HDFC Bank',
        accountHolderName: subadmin.name,
        accountNumber: '98765432101234',
        isPrimary: true
      },
      {
        seller: subadmin._id,
        bankName: 'ICICI Bank',
        accountHolderName: subadmin.name,
        accountNumber: '11223344556677',
        isPrimary: false
      }
    ]);

    console.log('Payout Accounts created');

    // 2. Create Withdrawals
    const primaryAccountId = accounts[0]._id;
    const secondaryAccountId = accounts[1]._id;

    // We'll spread these out over the last 30 days
    const today = new Date();
    const getDate = (daysAgo) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d;
    };

    const withdrawals = await Withdrawal.insertMany([
      {
        seller: subadmin._id,
        amount: 25800,
        payoutAccount: primaryAccountId,
        status: 'Completed',
        remarks: 'Transferred successfully',
        createdAt: getDate(2),
        updatedAt: getDate(1)
      },
      {
        seller: subadmin._id,
        amount: 18500,
        payoutAccount: secondaryAccountId,
        status: 'Completed',
        remarks: 'Transferred successfully',
        createdAt: getDate(5),
        updatedAt: getDate(4)
      },
      {
        seller: subadmin._id,
        amount: 32000,
        payoutAccount: primaryAccountId,
        status: 'Processing',
        remarks: 'Expected by tomorrow',
        createdAt: getDate(1),
        updatedAt: getDate(1)
      },
      {
        seller: subadmin._id,
        amount: 15750,
        payoutAccount: secondaryAccountId,
        status: 'Failed',
        remarks: 'Bank details mismatch',
        createdAt: getDate(10),
        updatedAt: getDate(9)
      },
      {
        seller: subadmin._id,
        amount: 12000,
        payoutAccount: primaryAccountId,
        status: 'Cancelled',
        remarks: 'Cancelled by user',
        createdAt: getDate(15),
        updatedAt: getDate(15)
      }
    ]);

    console.log(`Successfully created ${withdrawals.length} withdrawals`);
    process.exit();
  } catch (error) {
    console.error(`Error with data import: ${error}`);
    process.exit(1);
  }
};

importData();
