const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const notificationService = require('./notificationService');
const { getAuth } = require('../config/firebase');

/* =========================================================
   OLD OTP FLOW (Manually generating and sending OTP)
   Commented out per request to switch to Firebase Auth
   =========================================================
// Placeholder for WhatsApp API
// In production, replace with real WhatsApp Business API or SMS gateway
const sendWhatsAppOTP = async (phoneNumber, otpCode) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n=============================================`);
    console.log(`[DEV OTP] Code ${otpCode} for ${phoneNumber}`);
    console.log(`=============================================\n`);
  }
  // TODO: Integrate real SMS/WhatsApp provider for production
  return true;
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
};

const loginOrRegister = async (phoneNumber) => {
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { phoneNumber }
  });

  const otpCode = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  if (!user) {
    // Register new user
    user = await prisma.user.create({
      data: {
        phoneNumber,
        otpCode,
        otpExpiresAt
      }
    });

    await notificationService.createNotification(
      user.id,
      'مرحباً بك!',
      'أهلاً بك في السوق المنزلي. أنشئ متجرك وابدأ البيع الآن.',
      'SYSTEM_ALERT'
    );
  } else {
    // Update existing user with new OTP
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt
      }
    });
  }

  await sendWhatsAppOTP(phoneNumber, otpCode);
  return { message: 'OTP sent successfully via WhatsApp' };
};

const verifyOTP = async (phoneNumber, otpCode) => {
  const user = await prisma.user.findUnique({
    where: { phoneNumber }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.otpCode !== otpCode) {
    throw new Error('Invalid OTP code');
  }

  if (user.otpExpiresAt < new Date()) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  // Clear OTP and mark as verified
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: null,
      otpExpiresAt: null,
      isVerified: true
    },
    select: { id: true, phoneNumber: true, role: true, isVerified: true, business: true }
  });

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { token, user: updatedUser };
};
========================================================= */

/* =========================================================
   NEW FIREBASE AUTH FLOW
   ========================================================= */
const verifyFirebaseToken = async (idToken) => {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase Admin SDK is not initialized. Please configure the service account.');
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      throw new Error('Firebase token does not contain a phone number.');
    }

    // Check if user exists in our DB
    let user = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!user) {
      // Register new user
      user = await prisma.user.create({
        data: {
          phoneNumber,
          isVerified: true // Inherently verified by Firebase
        }
      });

      await notificationService.createNotification(
        user.id,
        'مرحباً بك!',
        'أهلاً بك في السوق المنزلي. أنشئ متجرك وابدأ البيع الآن.',
        'SYSTEM_ALERT'
      );
    } else if (!user.isVerified) {
      // Edge case: User existed before but was never verified
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true }
      });
    }

    // Fetch the updated user with relations
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, phoneNumber: true, role: true, isVerified: true, business: true }
    });

    // Generate OUR custom backend JWT (we don't use Firebase tokens for backend requests to keep our roles system intact)
    const token = jwt.sign(
      { id: finalUser.id, role: finalUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return { token, user: finalUser };
  } catch (error) {
    console.error('Firebase token verification error:', error);
    throw new Error('Invalid or expired Firebase token');
  }
};

module.exports = {
  // loginOrRegister,
  // verifyOTP,
  verifyFirebaseToken
};
