const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const { protect, admin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

// Public route for mobile app
router.get('/', adController.getPublicAds);

// Admin protected routes
router.get('/admin', protect, admin, adController.getAdminAds);
router.post('/', protect, admin, upload.single('image'), adController.createAd);
router.patch('/:id/status', protect, admin, adController.toggleAdStatus);
router.delete('/:id', protect, admin, adController.deleteAd);

module.exports = router;
