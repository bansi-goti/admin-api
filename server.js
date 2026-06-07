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
