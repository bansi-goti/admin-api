require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const Product = require('./models/Product');
const connectDB = require('./config/db');

const seedOrders = async () => {
  try {
    await connectDB();

    // Clear existing orders
    await Order.deleteMany({});
    console.log('Existing orders cleared.');

    // Get all admin and subadmin users to act as sellers
    const sellers = await User.find({ role: { $in: ['admin', 'subadmin'] } });
    if (sellers.length === 0) {
      console.log('No admin or subadmin users found. Please seed users first.');
      process.exit(1);
    }

    const products = await Product.find({});
    if (products.length === 0) {
       console.log('No products found. Please seed products first.');
       process.exit(1);
    }

    const getRandomProduct = () => products[Math.floor(Math.random() * products.length)];

    // Dummy Orders spread across the last 7 days
    const today = new Date();
    
    const generateOrder = (sellerId, daysAgo, orderId, name, email, status) => {
      const p1 = getRandomProduct();
      const items = [
        { product: p1._id, quantity: 1, price: p1.price || 1000 },
      ];
      if (Math.random() > 0.5) {
        const p2 = getRandomProduct();
        items.push({ product: p2._id, quantity: 2, price: p2.price || 500 });
      }
      
      const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

      return {
        seller: sellerId,
        orderId,
        customer: { name, email },
        items,
        totalAmount,
        sellerEarning: totalAmount * 0.8,
        profit: totalAmount * 0.2,
        paymentMethod: 'Stripe',
        status,
        createdAt: new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      };
    };

    let allOrders = [];

    sellers.forEach((seller, idx) => {
      // Find products that belong to this seller
      const sellerProducts = products.filter(p => p.seller && p.seller.toString() === seller._id.toString());
      
      // If seller has no products, don't generate dummy orders for them
      if (sellerProducts.length === 0) {
        return;
      }

      const getRandomSellerProduct = () => sellerProducts[Math.floor(Math.random() * sellerProducts.length)];

      const generateOrder = (sellerId, daysAgo, orderId, name, email, status) => {
        const p1 = getRandomSellerProduct();
        const items = [
          { product: p1._id, quantity: 1, price: p1.price || 1000 },
        ];
        if (Math.random() > 0.5 && sellerProducts.length > 1) {
          const p2 = getRandomSellerProduct();
          // Avoid duplicate product in same order if possible, though random
          if (p2._id.toString() !== p1._id.toString()) {
            items.push({ product: p2._id, quantity: 2, price: p2.price || 500 });
          }
        }
        
        const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        return {
          seller: sellerId,
          orderId,
          customer: { name, email },
          items,
          totalAmount,
          sellerEarning: totalAmount * 0.8,
          profit: totalAmount * 0.2,
          paymentMethod: 'Stripe',
          status,
          createdAt: new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        };
      };

      const prefix = `ORD-${8900 + idx * 100}`;
      const orders = [
        generateOrder(seller._id, 6, `${prefix}-1`, 'John Doe', 'john@example.com', 'Delivered'),
        generateOrder(seller._id, 5, `${prefix}-2`, 'Sarah Connor', 'sarah@example.com', 'Delivered'),
        generateOrder(seller._id, 3, `${prefix}-3`, 'Mike Tyson', 'mike@example.com', 'Shipped'),
        generateOrder(seller._id, 1, `${prefix}-4`, 'Emma Watson', 'emma@example.com', 'Processing'),
        generateOrder(seller._id, 0, `${prefix}-5`, 'Bruce Wayne', 'bruce@example.com', 'Processing'),
        generateOrder(seller._id, 2, `${prefix}-6`, 'Clark Kent', 'clark@example.com', 'Cancelled'),
        generateOrder(seller._id, 4, `${prefix}-7`, 'Diana Prince', 'diana@example.com', 'Refunded')
      ];
      allOrders = allOrders.concat(orders);
    });

    await Order.insertMany(allOrders);
    console.log('Orders seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding orders:', error);
    process.exit(1);
  }
};

seedOrders();
