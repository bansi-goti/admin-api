const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Notification = require('./models/Notification');

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

    await Notification.deleteMany({ seller: subadmin._id });

    const notifications = [
      { type: "Order", title: "New Order Received", message: "You have received a new order #ORD-1254 for ₹12,500", isUnread: true },
      { type: "Payment", title: "Payment Received", message: "Payment of ₹10,625 for order #ORD-1253 has been received", isUnread: true },
      { type: "Product", title: "Product Approved", message: "Your product \"Gold Necklace\" has been approved and published", isUnread: true },
      { type: "Inventory", title: "Low Stock Alert", message: "\"Silver Ring\" is running low on stock. Only 3 items left.", isUnread: false },
      { type: "Order", title: "Order Shipped", message: "Order #ORD-1251 has been shipped and is on the way", isUnread: false },
      { type: "Review", title: "New Review Received", message: "You received a 5⭐ review for \"Diamond Earrings\"", isUnread: false },
      { type: "Payment", title: "Payout Initiated", message: "Your payout of ₹25,000 has been initiated", isUnread: false },
      { type: "System", title: "System Update", message: "We've updated our shipping policy. Please review the changes.", isUnread: false },
      
      { type: "Order", title: "Order Cancelled", message: "Order #ORD-1250 has been cancelled by the customer", isUnread: true },
      { type: "Product", title: "Product Rejected", message: "Your product \"Custom Engraved Ring\" was rejected. Please review guidelines.", isUnread: true },
      { type: "System", title: "Scheduled Maintenance", message: "The seller dashboard will be down for maintenance on Sunday 2 AM.", isUnread: false },
      { type: "Review", title: "New Review Received", message: "You received a 4⭐ review for \"Silver Bracelet\"", isUnread: false },
      { type: "Inventory", title: "Out of Stock", message: "\"Platinum Band\" is completely out of stock.", isUnread: true },
      { type: "Payment", title: "Payout Successful", message: "Your payout of ₹42,000 has successfully reached your bank account.", isUnread: false },
      { type: "Order", title: "New Order Received", message: "You have received a new order #ORD-1255 for ₹4,500", isUnread: true },
      { type: "Product", title: "Product Update", message: "Your product \"Diamond Studs\" was updated successfully.", isUnread: false },
    ];

    // Add seller to each
    const fakeNotifications = notifications.map((n, index) => ({
      ...n,
      seller: subadmin._id,
      // Distribute creation dates over the last few days
      createdAt: new Date(Date.now() - index * 3600000 * 2.5) // spread out every 2.5 hours
    }));

    await Notification.insertMany(fakeNotifications);
    console.log('Notifications imported successfully for subadmin1');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
