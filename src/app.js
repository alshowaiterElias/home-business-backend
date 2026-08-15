const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const routes = require('./routes');

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict in production, allow all in development
const corsOptions = {};
if (process.env.CORS_ORIGINS) {
  corsOptions.origin = process.env.CORS_ORIGINS.split(',').map(o => o.trim());
}
app.use(cors(corsOptions));

// Parse bodies with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP request logging — concise in production
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve static files (uploads) with cache headers for CDN support
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '30d' // Cache images for 30 days
}));

const { apiLimiter } = require('./middlewares/rateLimiter');

// Main API Router with Rate Limiting and Versioning
app.use('/api/v1', apiLimiter, routes);

// Legacy fallback (optional, for clients that haven't updated yet)
app.use('/api', apiLimiter, routes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Yemen Home Business Marketplace API' });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
