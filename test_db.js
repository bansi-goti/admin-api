const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nayzora').then(async () => {
    const products = await Product.find().sort({ createdAt: -1 }).limit(3);
    console.log(JSON.stringify(products, null, 2));
    process.exit(0);
});
