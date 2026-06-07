const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');
const Size = require('./models/Size');
const Color = require('./models/Color');
const User = require('./models/User');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nayzora');
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed', err);
    process.exit(1);
  }
};

const importData = async () => {
  await connectDB();

  try {
    console.log('Clearing old data...');
    await Category.deleteMany();
    await Size.deleteMany();
    await Color.deleteMany();
    
    let admin = await User.findOne({ email: 'admin@nayzora.com' });
    if (!admin) {
      console.log('Creating admin user...');
      admin = await User.create({
        name: 'Admin',
        email: 'admin@nayzora.com',
        password: 'password123',
        role: 'admin',
        uiRole: 'manager',
      });
    }

    console.log('Seeding Categories...');
    const categoriesData = [
      { name: 'Rings', description: 'Beautiful handcrafted rings', status: 'Active', seller: admin._id },
      { name: 'Necklaces', description: 'Elegant necklaces for all occasions', status: 'Active', seller: admin._id },
      { name: 'Earrings', description: 'Stunning earrings', status: 'Active', seller: admin._id },
      { name: 'Bracelets', description: 'Charming bracelets', status: 'Active', seller: admin._id },
      { name: 'Pendants', description: 'Gorgeous pendants', status: 'Active', seller: admin._id },
      { name: 'Bangles', description: 'Traditional and modern bangles', status: 'Active', seller: admin._id },
      { name: 'Anklets', description: 'Stylish anklets', status: 'Active', seller: admin._id },
      { name: 'Nose Pins', description: 'Elegant nose pins', status: 'Active', seller: admin._id },
      { name: 'Chains', description: 'Gold and silver chains', status: 'Active', seller: admin._id },
      { name: 'Jewellery Sets', description: 'Complete sets for weddings and parties', status: 'Active', seller: admin._id },
    ];

    const createdCategories = await Category.insertMany(categoriesData);
    
    console.log('Seeding Sizes and Colors...');
    const sizesData = [];
    const colorsData = [];

    const commonSizes = ['US 5', 'US 6', 'US 7', 'US 8', 'US 9', 'Free Size'];
    const commonColors = [
      '#FFD700', // Gold
      '#C0C0C0', // Silver
      '#B76E79', // Rose Gold
      '#E5E4E2', // Platinum
      '#b9f2ff', // Diamond
      '#000000', // Black
      '#FFFFFF', // White
      '#FF0000', // Ruby Red
      '#0000FF', // Sapphire Blue
      '#008000', // Emerald Green
    ];

    for (const category of createdCategories) {
      for (const size of commonSizes) {
        sizesData.push({
          category_id: category._id,
          size_value: size,
          seller: admin._id
        });
      }

      for (const colorCode of commonColors) {
        colorsData.push({
          category_id: category._id,
          color_code: colorCode,
          status: 'Active',
          seller: admin._id
        });
      }
    }

    await Size.insertMany(sizesData);
    await Color.insertMany(colorsData);

    console.log('Data Seeded Successfully! 🎉');
    process.exit();
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

importData();
