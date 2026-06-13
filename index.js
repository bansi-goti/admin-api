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
app.use('/api/analytics', analyticsRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipping', shippingRoutes);

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


