const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

// ALL routes here require the user to be logged in AND have the ADMIN role
router.use(protect, admin);

// Product Moderation
router.get('/products/pending', adminController.getPendingProducts);
router.put('/products/:id/approve', adminController.approveProduct);
router.put('/products/:id/reject', adminController.rejectProduct);

// Reports Management
router.get('/reports', adminController.getReports);
router.put('/reports/:id/resolve', adminController.resolveReport);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
