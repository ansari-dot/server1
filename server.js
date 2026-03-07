import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { securityHeaders, csrfProtection, xssProtection, requestLogger } from './middlewares/security.js';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import adminAuthRoutes from './routes/adminAuth.js';
import userAuthRoutes from './routes/userAuth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import couponRoutes from './routes/coupons.js';
import dashboardRoutes from './routes/dashboard.js';
import merchandisingRoutes from './routes/merchandising.js';
import flashDealRoutes from './routes/flashDeals.js';
import searchRoutes from './routes/search.js';
import heroSectionRoutes from './routes/heroSection.js';
import brandRoutes from './routes/brands.js';
import newsletterRoutes from './routes/newsletter.js';
import shopBannerRoutes from './routes/shopBanner.js';

dotenv.config();
connectDB();

const app = express();

// Trust proxy for ngrok/production
app.set('trust proxy', 1);

// CORS configuration - MUST BE FIRST
const allowedOrigins = [
    'https://flourishing-vacherin-28b8c4.netlify.app/',
    'https://transcendent-gaufre-9356a8.netlify.app/',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://tmobiletech.netlify.app',
    'https://admin-tmobiletech.netlify.app',
    'https://admin-tmobiletech.netlify.app/login'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow netlify URLs
        if (origin.includes('netlify.app')) return callback(null, true);

        // Allow specific origins
        if (allowedOrigins.includes(origin)) return callback(null, true);

        callback(null, true); // Allow all for now
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    exposedHeaders: ['set-cookie']
}));

app.options('*', cors());

// Serve images through API to add ngrok header
app.get('/api/uploads/*', (req, res) => {
    const imagePath = req.params[0];
    const fullPath = path.join(__dirname, 'uploads', imagePath);
    res.sendFile(fullPath);
});

// Static files fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security middleware AFTER static files
app.use(securityHeaders);
// app.use(csrfProtection);
app.use(xssProtection);
app.use(requestLogger);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'E-commerce Admin API Server is running' });
});

// API routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/auth', userAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/merchandising', merchandisingRoutes);
app.use('/api/flash-deals', flashDealRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/hero-section', heroSectionRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/shop-banner', shopBannerRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);

    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors
        });
    }

    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});