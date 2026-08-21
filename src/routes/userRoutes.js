const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

// Register device token for push notifications
router.post('/device-token', protect, userController.saveDeviceToken);
// Get user profile
router.get('/profile', protect, userController.getProfile);
// Request account deletion (In-App user deletion)
router.post('/delete-account', protect, userController.deleteAccount);
router.delete('/delete-account', protect, userController.deleteAccount);
router.delete('/account', protect, userController.deleteAccount);

module.exports = router;
