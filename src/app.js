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

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Yemen Home Business Marketplace API' });
});

// Privacy Policy Page (required by Google Play)
app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>سياسة الخصوصية - السوق المنزلي</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.8; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
    header { background: linear-gradient(135deg, #009688, #4db6ac); color: white; padding: 40px 24px; text-align: center; }
    header h1 { font-size: 28px; margin-bottom: 8px; }
    header p { opacity: 0.9; font-size: 14px; }
    h2 { color: #009688; font-size: 18px; margin: 32px 0 12px; border-right: 4px solid #009688; padding-right: 12px; }
    p, li { font-size: 15px; color: #334155; margin-bottom: 8px; }
    ul { padding-right: 20px; margin-bottom: 12px; }
    li { margin-bottom: 6px; }
    .card { background: white; border-radius: 12px; padding: 32px; margin: 24px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 13px; }
    .highlight { background: #e0f2f1; border-radius: 8px; padding: 16px; margin: 12px 0; }
  </style>
</head>
<body>
  <header>
    <h1>🏠 السوق المنزلي</h1>
    <p>سياسة الخصوصية وحماية البيانات</p>
  </header>

  <div class="container">
    <div class="card">
      <p>آخر تحديث: أغسطس 2026</p>
      <p>مرحباً بك في تطبيق <strong>السوق المنزلي</strong>. نحن نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها.</p>
    </div>

    <h2>١. المعلومات التي نجمعها</h2>
    <div class="card">
      <ul>
        <li><strong>رقم الهاتف:</strong> يُستخدم فقط للتحقق من هويتك عبر Firebase Authentication ولا يُشارك مع أي طرف ثالث.</li>
        <li><strong>بيانات المتجر والمنتجات:</strong> المعلومات التي تُدخلها بنفسك عند إنشاء متجرك أو إضافة منتجات.</li>
        <li><strong>الصور:</strong> الصور التي ترفعها لمنتجاتك أو متجرك، وتُخزَّن على خوادمنا الآمنة.</li>
        <li><strong>بيانات الاستخدام:</strong> معلومات أساسية عن كيفية استخدامك للتطبيق لتحسين تجربتك.</li>
      </ul>
    </div>

    <h2>٢. كيف نستخدم معلوماتك</h2>
    <div class="card">
      <ul>
        <li>التحقق من هويتك وتأمين حسابك.</li>
        <li>تمكينك من نشر منتجاتك وإدارة متجرك.</li>
        <li>إرسال إشعارات متعلقة بنشاط حسابك ومنتجاتك.</li>
        <li>تحسين أداء التطبيق وتجربة المستخدم.</li>
      </ul>
    </div>

    <h2>٣. مشاركة البيانات مع أطراف ثالثة</h2>
    <div class="card">
      <div class="highlight">
        <p>✅ <strong>لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تجارية.</strong></p>
      </div>
      <p>نستخدم الخدمات التالية لتشغيل التطبيق:</p>
      <ul>
        <li><strong>Firebase (Google):</strong> للمصادقة وإرسال الإشعارات — <a href="https://policies.google.com/privacy">سياسة خصوصية Google</a></li>
        <li><strong>خوادمنا الآمنة:</strong> لتخزين بيانات المتاجر والمنتجات والصور.</li>
      </ul>
    </div>

    <h2>٤. أمان البيانات</h2>
    <div class="card">
      <p>نستخدم تشفير HTTPS لجميع الاتصالات بين التطبيق والخادم. بيانات حسابك محمية بكلمات مرور مشفرة ورموز JWT آمنة.</p>
    </div>

    <h2>٥. حقوقك</h2>
    <div class="card">
      <ul>
        <li>يمكنك طلب حذف حسابك وجميع بياناتك المرتبطة به في أي وقت.</li>
        <li>يمكنك تعديل معلومات متجرك ومنتجاتك من داخل التطبيق.</li>
        <li>لديك الحق في معرفة البيانات التي نحتفظ بها عنك.</li>
      </ul>
    </div>

    <h2>٦. بيانات الأطفال</h2>
    <div class="card">
      <p>تطبيقنا موجّه للمستخدمين البالغين من عمر ١٣ عاماً فأكثر. لا نجمع عن قصد بيانات من الأطفال دون هذا السن.</p>
    </div>

    <h2>٧. التواصل معنا</h2>
    <div class="card">
      <p>إذا كانت لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يمكنك التواصل معنا عبر:</p>
      <p>📧 <strong>البريد الإلكتروني:</strong> support@home-business.app</p>
    </div>
  </div>

  <div class="footer">
    <p>© 2026 السوق المنزلي — جميع الحقوق محفوظة</p>
  </div>
</body>
</html>`);
});


// Delete Account Page (required by Google Play)
const deleteAccountHtml = (message = '', isError = false) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>حذف الحساب - السوق المنزلي</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.8; }
    header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 40px 24px; text-align: center; }
    header h1 { font-size: 26px; margin-bottom: 8px; }
    header p { opacity: 0.9; font-size: 14px; }
    .container { max-width: 600px; margin: 32px auto; padding: 0 24px 40px; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    label { display: block; font-weight: 600; margin-bottom: 8px; color: #374151; }
    input { width: 100%; padding: 12px 16px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 16px; direction: ltr; margin-bottom: 20px; outline: none; }
    input:focus { border-color: #ef4444; }
    button { width: 100%; padding: 14px; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; }
    button:hover { background: #dc2626; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; color: #991b1b; font-size: 14px; }
    .success { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; color: #166534; text-align: center; font-size: 16px; }
    .error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; color: #991b1b; text-align: center; font-size: 16px; }
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 13px; }
  </style>
</head>
<body>
  <header>
    <h1>🗑️ حذف الحساب</h1>
    <p>السوق المنزلي — طلب حذف الحساب والبيانات</p>
  </header>
  <div class="container">
    ${message ? `<div class="${isError ? 'error' : 'success'}">${message}</div>` : `
    <div class="card">
      <div class="warning">
        ⚠️ <strong>تحذير:</strong> سيؤدي هذا الإجراء إلى حذف حسابك ومتجرك وجميع منتجاتك وبياناتك بشكل نهائي ولا يمكن التراجع عنه.
      </div>
      <label for="phone">رقم الهاتف المسجل في التطبيق</label>
      <form method="POST" action="/delete-account">
        <input type="tel" id="phone" name="phone" placeholder="+967 7XX XXX XXX" required>
        <button type="submit">تأكيد حذف الحساب نهائياً</button>
      </form>
    </div>
    `}
  </div>
  <div class="footer">© 2026 السوق المنزلي</div>
</body>
</html>`;

app.get('/delete-account', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(deleteAccountHtml());
});

app.post('/delete-account', express.urlencoded({ extended: true }), async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const prisma = require('./config/db');
    let phone = (req.body.phone || '').trim().replace(/\s/g, '');
    if (!phone) {
      return res.send(deleteAccountHtml('⚠️ يرجى إدخال رقم الهاتف.', true));
    }
    // Normalize to +967 format
    if (!phone.startsWith('+')) phone = '+' + phone;

    const user = await prisma.user.findUnique({ where: { phoneNumber: phone } });
    if (!user) {
      return res.send(deleteAccountHtml('❌ لم يتم العثور على حساب مرتبط بهذا الرقم. تأكد من الرقم وحاول مرة أخرى.', true));
    }

    await prisma.user.delete({ where: { id: user.id } });

    res.send(deleteAccountHtml('✅ تم حذف حسابك وجميع بياناتك بنجاح. نأسف لمغادرتك وندعوك للعودة مجدداً!', false));
  } catch (err) {
    console.error('Delete account error:', err);
    res.send(deleteAccountHtml('❌ حدث خطأ أثناء الحذف. يرجى المحاولة لاحقاً.', true));
  }
});


app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
