const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

// ALL routes here require the user to be logged in AND have the ADMIN role
router.use(protect, admin);

// Dashboard Overview Stats
router.get('/stats', adminController.getDashboardStats);

// Product Moderation & Management
router.get('/products/pending', adminController.getPendingProducts);
router.get('/products', adminController.getAllProducts);
router.put('/products/:id/approve', adminController.approveProduct);
router.put('/products/:id/reject', adminController.rejectProduct);
router.put('/products/:id/suspend', adminController.suspendProduct);
router.put('/products/:id/request-revision', adminController.requestProductRevision);
router.patch('/products/:id/featured', adminController.toggleProductFeatured);
router.delete('/products/:id', adminController.deleteProduct);

// Users Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Businesses / Stores Management
router.get('/businesses', adminController.getAllBusinesses);
router.put('/businesses/:id/status', adminController.toggleBusinessStatus);
router.patch('/businesses/:id/featured', adminController.toggleBusinessFeatured);

// Review Moderation
router.get('/reviews', adminController.getAllReviews);
router.delete('/reviews/:id', adminController.deleteReview);

// Reports Management
router.get('/reports', adminController.getReports);
router.put('/reports/:id/resolve', adminController.resolveReport);
router.get('/reports/conversations/:id', adminController.getConversationMessages);

// System Settings
router.get('/settings', adminController.getSettings);
router.patch('/settings', adminController.updateSettings);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Push Notifications Broadcast
router.post('/notifications/broadcast', adminController.sendBroadcastNotification);
router.get('/notifications/broadcast-history', adminController.getBroadcastHistory);

// WhatsApp Gateway Management (Evolution API)
router.get('/whatsapp/status', adminController.getWhatsAppStatus);
router.get('/whatsapp/qr', adminController.getWhatsAppQR);
router.get('/whatsapp/pairing-code', adminController.getWhatsAppPairingCode);
router.post('/whatsapp/instance', adminController.createWhatsAppInstance);
router.delete('/whatsapp/instance', adminController.deleteWhatsAppInstance);
router.post('/whatsapp/send-test', adminController.sendWhatsAppTestMessage);

module.exports = router;
