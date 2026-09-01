const express = require('express');
const router = express.Router();

// TODO: Import and use specific route modules here
// Example:
// const userRoutes = require('./userRoutes');
// const productRoutes = require('./productRoutes');

const authRoutes = require('./authRoutes');
const taxonomyRoutes = require('./taxonomyRoutes');
const productRoutes = require('./productRoutes');
const businessRoutes = require('./businessRoutes');
const interactionRoutes = require('./interactionRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const aiRoutes = require('./aiRoutes');
const adRoutes = require('./adRoutes');

router.use('/auth', authRoutes);
router.use('/taxonomy', taxonomyRoutes);
router.use('/products', productRoutes);
router.use('/business', businessRoutes);
router.use('/interactions', interactionRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/ai', aiRoutes);
router.use('/ads', adRoutes);

// Public app configuration endpoint
router.get('/config', async (req, res) => {
  try {
    const adminService = require('../services/adminService');
    const settings = await adminService.getSystemSettings();
    res.json({
      success: true,
      data: {
        supportPhone: settings.supportPhone,
        supportEmail: settings.supportEmail,
        developerPhone: settings.developerPhone,
        developerEmail: settings.developerEmail,
        maintenanceMode: settings.maintenanceMode
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API Health check route (verifies DB connectivity)
router.get('/health', async (req, res) => {
  try {
    const prisma = require('../config/db');
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

module.exports = router;
