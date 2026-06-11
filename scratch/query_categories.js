const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../src/models/Category');

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const categories = await Category.find();
  console.log("Categories:", JSON.stringify(categories, null, 2));
  process.exit(0);
}
run();
