const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { otpRequestLimiter, otpVerifyLimiter } = require('../middlewares/rateLimiter');

// OTP Routes (Evolution API / WhatsApp delivery)
router.post('/request-otp', otpRequestLimiter, authController.requestOTP);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyOTP);
router.post('/check-status', authController.checkStatus);

// =========================================================================
// LEGACY: Firebase Token Route (commented out — pivoted to Evolution API)
// =========================================================================
// const { validate, authSchemas } = require('../middlewares/validationMiddleware');
// router.post('/verify-firebase-token', otpVerifyLimiter, validate(authSchemas.verifyFirebaseToken), authController.verifyFirebaseToken);

// Delete account alias
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
router.post('/delete-account', protect, userController.deleteAccount);

module.exports = router;
