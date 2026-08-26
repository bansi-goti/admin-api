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
const googleAuthRoutes = require('./src/routes/googleAuthRoutes');
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
const contactRoutes = require('./src/routes/contactRoutes');
const addressRoutes = require('./src/routes/addressRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
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
app.use('/api/settings/payments', paymentRoutes);
app.use('/api/settings/website', websiteSettingRoutes);
app.use('/api/settings/google-auth', googleAuthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sub-admin-image', subAdminImageRoutes);
app.use('/api/subadmin-image', subAdminImageRoutes);
app.use('/api/sub-admin-images', subAdminImageRoutes);
app.use('/api/subadmin-images', subAdminImageRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/locations', locationRoutes);

// Static Uploads Folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'uploads')));

// Swagger Documentation setup
swaggerDocs(app, process.env.PORT || 5000);

// Error Handling Middleware (must be after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
