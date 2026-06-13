require('dotenv').config({ path: '../.env' }); // Adjust path if needed
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Review = require('./models/Review');

const seedReviews = async () => {
  try {
    // If running from src/ it might need correct path for .env. The root .env is at F:\admin api\.env
    require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
    
    await connectDB();

    console.log('Fetching users and products...');
    const users = await User.find({ role: 'user' });
    const products = await Product.find();

    if (users.length === 0 || products.length === 0) {
      console.log('Need at least 1 user and 1 product to seed reviews.');
      process.exit(1);
    }

    console.log('Deleting existing reviews...');
    await Review.deleteMany({});

    const comments = [
      'Absolutely stunning! The quality is excellent and it looks even better in person. Highly recommended!',
      'Nice and good finish. Delivery was quick. Would love more designs in this range.',
      'The product is okay, but expected a little more shine. Packing was good though.',
      'Beautiful and amazing craftsmanship. Totally worth the price!',
      'Not satisfied with the product. Broke within a week.',
      'Very elegant design. My wife loved it as a gift.',
      'Good quality but the size was a bit smaller than expected.',
      'Perfect for daily wear. So light and comfortable.',
      'Excellent customer service and premium packaging.',
      'Looks cheap in reality. Not happy with the purchase.'
    ];

    const reviews = [];
    const numReviews = 15;

    for (let i = 0; i < numReviews; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      
      // Determine rating based on comment sentiment roughly
      let rating = 5;
      if (i === 2 || i === 6) rating = 3;
      if (i === 4 || i === 9) rating = 1;
      if (i === 1) rating = 4;

      const statuses = ['approved', 'approved', 'approved', 'pending', 'rejected'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      reviews.push({
        customerId: randomUser._id,
        productId: randomProduct._id,
        rating,
        comment: comments[i % comments.length],
        status,
        verified: Math.random() > 0.2, // 80% verified
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date in last 30 days
      });
    }

    await Review.insertMany(reviews);
    console.log(`${reviews.length} reviews inserted successfully!`);

    process.exit();
  } catch (error) {
    console.error('Error seeding reviews:', error);
    process.exit(1);
  }
};

seedReviews();
