const rateLimit = require('express-rate-limit');

// General API rate limiter (e.g., 100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Stricter limiter for OTP requests (e.g., 5 requests per 15 minutes)
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests from this IP. Please wait 15 minutes.' }
});

// Stricter limiter for OTP verification (e.g., 10 attempts per 15 minutes to prevent brute force)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many failed verification attempts. Please wait 15 minutes.' }
});

module.exports = {
  apiLimiter,
  otpRequestLimiter,
  otpVerifyLimiter
};
