const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Public routes for fetching templates (used by mobile app)
router.get('/templates', whatsappController.getTemplates);
router.get('/templates/:type', whatsappController.getTemplateByType);

// Admin route to update templates
router.put('/templates/:type', protect, admin, whatsappController.updateTemplate);

module.exports = router;
