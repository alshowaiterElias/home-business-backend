const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// Register device token for push notifications
router.post('/device-token', protect, userController.saveDeviceToken);
// Get user profile
router.get('/profile', protect, userController.getProfile);

module.exports = router;
