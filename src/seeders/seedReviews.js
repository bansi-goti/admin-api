require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');

const sampleReviewers = [
  {
    name: 'Ananya Sharma',
    email: 'ananya.sharma@nayzora.com',
    password: 'password123',
    role: 'user',
    profileImage: '/reviewer_1.png',
  },
  {
    name: 'Rohan Kapoor',
    email: 'rohan.kapoor@nayzora.com',
    password: 'password123',
    role: 'user',
    profileImage: '/reviewer_2.png',
  },
  {
    name: 'Priya Mehta',
    email: 'priya.mehta@nayzora.com',
    password: 'password123',
    role: 'user',
    profileImage: '/reviewer_3.png',
  },
];

const sampleReviewsData = [
  {
    reviewerEmail: 'ananya.sharma@nayzora.com',
    rating: 5,
    comment: 'The Verdant Grace Ring is absolute perfection. Comes with certified hallmarking and stunning luxury packaging. Express shipping was lightning fast!',
    verified: true,
    status: 'approved',
  },
  {
    reviewerEmail: 'rohan.kapoor@nayzora.com',
    rating: 5,
    comment: 'I saved 3 pieces in my wishlist and bought them together. The 15-day return policy gave me total peace of mind, though I am keeping every piece!',
    verified: true,
    status: 'approved',
  },
  {
    reviewerEmail: 'priya.mehta@nayzora.com',
    rating: 5,
    comment: 'Exceptional craftsmanship! The gold purity certificate gave me 100% confidence. Nayzora is my go-to luxury jewellery store.',
    verified: true,
    status: 'approved',
  },
];

async function seedReviews() {
  try {
    await connectDB();
    console.log('🌱 Starting Reviews Seeder...');

    // 1. Get sample products
    const products = await Product.find({}).limit(5);
    if (products.length === 0) {
      console.error('❌ No products found in DB. Create products before seeding reviews.');
      process.exit(1);
    }

    // 2. Create or find reviewer users
    const userMap = {};
    for (const revUser of sampleReviewers) {
      let user = await User.findOne({ email: revUser.email });
      if (!user) {
        user = await User.create(revUser);
        console.log(`✅ Created reviewer user: ${user.name} (${user.email})`);
      }
      userMap[revUser.email] = user;
    }

    // 3. Clear existing sample reviews to avoid duplicates
    await Review.deleteMany({});
    console.log('🧹 Cleared previous reviews collection.');

    // 4. Create approved reviews
    for (let i = 0; i < sampleReviewsData.length; i++) {
      const revData = sampleReviewsData[i];
      const targetUser = userMap[revData.reviewerEmail];
      const targetProduct = products[i % products.length];

      await Review.create({
        customerId: targetUser._id,
        productId: targetProduct._id,
        rating: revData.rating,
        comment: revData.comment,
        verified: revData.verified,
        status: revData.status,
      });

      console.log(`✨ Created Review by ${targetUser.name} for product "${targetProduct.name}"`);
    }

    console.log('🎉 Reviews Seeder completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reviews Seeder failed:', error);
    process.exit(1);
  }
}

seedReviews();
