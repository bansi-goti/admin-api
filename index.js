const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const swaggerDocs = require('./src/config/swagger');
const { errorHandler } = require('./src/middlewares/errorMiddleware');
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const subAdminRoutes = require('./src/routes/subAdminRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const sizeRoutes = require('./src/routes/sizeRoutes');
const colorRoutes = require('./src/routes/colorRoutes');
const countryRoutes = require('./src/routes/countryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const advertisementRoutes = require('./src/routes/advertisementRoutes');
const websiteSettingRoutes = require('./src/routes/websiteSettingRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const shippingRoutes = require('./src/routes/shippingRoutes');
const earningsRoutes = require('./src/routes/earningsRoutes');
const withdrawalRoutes = require('./src/routes/withdrawalRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const couponRoutes = require('./src/routes/couponRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const userRoutes = require('./src/routes/userRoutes');
const subAdminImageRoutes = require('./src/routes/subAdminImageRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');
const path = require('path');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sub-admins', subAdminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sizes', sizeRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings/payments', paymentRoutes);
app.use('/api/settings/website', websiteSettingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/subadmin-images', subAdminImageRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.get('/api/debug-customers', async (req, res) => {
  try {
    const User = require('./src/models/User');
    const Order = require('./src/models/Order');
    const limit = 10;
    const page = 1;
    const query = { role: 'user' };
    const startIndex = (page - 1) * limit;
    const total = await User.countDocuments(query);

    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderQuery = { 'customer.email': customer.email };
        const customerOrders = await Order.find(orderQuery).sort({ createdAt: -1 });
        const spent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        return {
          ...customer,
          totalOrders: customerOrders.length,
          totalSpent: spent,
          averageOrderValue: customerOrders.length > 0 ? Math.round(spent / customerOrders.length) : 0,
          lastOrderDate: customerOrders.length > 0 ? customerOrders[0].createdAt : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalData: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        data: customersWithStats,
      },
    });
  } catch (e) { res.status(500).json({ e: e.message }) }
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger Documentation setup
swaggerDocs(app, process.env.PORT || 5000);

// Error Handling Middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});


