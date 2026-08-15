const authService = require('../services/authService');

/* =========================================================
   OLD OTP FLOW 
   =========================================================
const requestOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const result = await authService.loginOrRegister(phoneNumber);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, otpCode } = req.body;
    
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP code are required' });
    }

    const { token, user } = await authService.verifyOTP(phoneNumber, otpCode);
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
========================================================= */

/* =========================================================
   NEW FIREBASE AUTH FLOW
   ========================================================= */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID Token is required' });
    }

    const { token, user } = await authService.verifyFirebaseToken(idToken);
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

module.exports = {
  // requestOTP,
  // verifyOTP,
  verifyFirebaseToken
};
