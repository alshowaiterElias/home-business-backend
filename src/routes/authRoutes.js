const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { otpRequestLimiter, otpVerifyLimiter } = require('../middlewares/rateLimiter');
const { validate, authSchemas } = require('../middlewares/validationMiddleware');

// Native OTP Routes
router.post('/request-otp', otpRequestLimiter, authController.requestOTP);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyOTP);
router.post('/check-status', authController.checkStatus);

// Firebase Token Route (legacy option)
router.post('/verify-firebase-token', otpVerifyLimiter, validate(authSchemas.verifyFirebaseToken), authController.verifyFirebaseToken);

module.exports = router;
