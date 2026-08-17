const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const routes = require('./routes');

const app = express();

// Trust reverse proxy (Render / Nginx / Cloudflare) for accurate rate limiting
app.set('trust proxy', 1);

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

const { getQRDataURL, getBotStatus } = require('./services/whatsappBot');

// Serve crisp, clear QR Code page for WhatsApp linking
app.get('/qr', async (req, res) => {
  const { isConnected } = getBotStatus();
  const qrDataURL = await getQRDataURL();

  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>WhatsApp Bot Connected</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #f8fafc; }
          .card { max-width: 420px; margin: 0 auto; background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; }
          .icon { font-size: 64px; margin-bottom: 16px; }
          h1 { color: #22c55e; margin-bottom: 8px; }
          p { color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>بوت الواتساب متصل بنجاح!</h1>
          <p>تطبيق السوق المنزلي جاهز الآن لاستقبال ومعالجة طلبات التحقق تلقائياً عبر الواتساب.</p>
        </div>
      </body>
      </html>
    `);
  }

  if (!qrDataURL) {
    return res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>جاري تجهيز رمز QR</title>
        <meta http-equiv="refresh" content="3">
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #f8fafc; }
          .card { max-width: 420px; margin: 0 auto; background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; }
          h1 { color: #38bdf8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>جاري توليد رمز الـ QR...</h1>
          <p>يرجى الانتظار بضع ثوانٍ وسيتم تحديث الصفحة تلقائياً.</p>
        </div>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>ربط واتساب السوق المنزلي</title>
      <meta http-equiv="refresh" content="25">
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; background: #0f172a; color: #f8fafc; }
        .card { max-width: 440px; margin: 0 auto; background: #1e293b; padding: 28px; border-radius: 20px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .qr-img { width: 280px; height: 280px; border-radius: 12px; background: white; padding: 12px; margin: 20px 0; }
        h1 { color: #25D366; font-size: 22px; margin-bottom: 8px; }
        p { color: #cbd5e1; font-size: 14px; line-height: 1.6; }
        .steps { text-align: right; background: #0f172a; padding: 16px; border-radius: 12px; font-size: 13px; color: #94a3b8; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>ربط واتساب الأعمال بالسوق المنزلي 💬</h1>
        <p>افتح تطبيق الواتساب على هاتفك وامسح الرمز أدناه للربط:</p>
        <img class="qr-img" src="${qrDataURL}" alt="WhatsApp QR Code" />
        <div class="steps">
          <strong>خطوات الربط:</strong><br>
          1. افتح تطبيق واتساب الأعمال.<br>
          2. اضغط على القائمة (⋮) أو الإعدادات > <strong>الأجهزة المرتبطة</strong>.<br>
          3. اضغط على <strong>ربط جهاز</strong> ووجّه الكاميرا نحو هذا الرمز.
        </div>
      </div>
    </body>
    </html>
  `);
});

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
