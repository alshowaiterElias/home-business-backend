const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { otpRequestLimiter, otpVerifyLimiter } = require('../middlewares/rateLimiter');
const { validate, authSchemas } = require('../middlewares/validationMiddleware');

/* =========================================================
   OLD OTP FLOW ROUTES (Disabled)
   =========================================================
// router.post('/request-otp', otpRequestLimiter, validate(authSchemas.requestOTP), authController.requestOTP);
// router.post('/verify-otp', otpVerifyLimiter, validate(authSchemas.verifyOTP), authController.verifyOTP);
========================================================= */

// NEW FIREBASE AUTH FLOW
// POST /api/v1/auth/verify-firebase-token
router.post('/verify-firebase-token', otpVerifyLimiter, validate(authSchemas.verifyFirebaseToken), authController.verifyFirebaseToken);

module.exports = router;
