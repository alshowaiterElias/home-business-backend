const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const notificationService = require('./notificationService');
const evolutionService = require('./evolutionService');

// =========================================================================
// LEGACY FIREBASE AUTH IMPORTS (commented out — pivoted to Evolution API)
// =========================================================================
// const { getAuth } = require('../config/firebase');

/**
 * Normalizes phone numbers to standard E.164 format (+967XXXXXXXXX).
 */
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, ''); // remove non-digits except +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('967')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('07'))) {
      cleaned = '+967' + (cleaned.startsWith('0') ? cleaned.substring(1) : cleaned);
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
};

/**
 * Generates OTP for login or registration.
 * Sends OTP via Evolution API (WhatsApp) instead of SMS/Firebase.
 */
const loginOrRegister = async (rawPhone) => {
  const phoneNumber = normalizePhoneNumber(rawPhone);
  if (!phoneNumber || phoneNumber.length < 8) {
    throw new Error('رقم الهاتف غير صحيح');
  }

  let user = await prisma.user.findUnique({
    where: { phoneNumber }
  });

  const otpCode = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

  if (!user) {
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
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt
      }
    });
  }

  // Send OTP via Evolution API (WhatsApp)
  const sendResult = await evolutionService.sendOTP(phoneNumber, otpCode);

  // Always log to console as a fallback for debugging
  console.log(`\n=============================================`);
  console.log(`[AUTH OTP] Code: ${otpCode} for Phone: ${phoneNumber}`);
  console.log(`[AUTH OTP] WhatsApp delivery: ${sendResult.success ? '✅ Sent' : '⚠️ Fallback (console only)'}`);
  console.log(`=============================================\n`);

  return {
    message: sendResult.success
      ? 'تم إرسال رمز التحقق عبر الواتساب'
      : 'تم إنشاء رمز التحقق (تحقق من السجل)',
    phoneNumber,
    otpDelivered: sendResult.success
  };
};

/**
 * Verifies OTP code entered by the user.
 */
const verifyOTP = async (rawPhone, otpCode) => {
  const phoneNumber = normalizePhoneNumber(rawPhone);

  const user = await prisma.user.findUnique({
    where: { phoneNumber }
  });

  if (!user) {
    throw new Error('المستخدم غير موجود');
  }

  if (!user.otpCode || user.otpCode !== otpCode.trim()) {
    throw new Error('رمز التحقق غير صحيح');
  }

  if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
    throw new Error('انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.');
  }

  // Mark user as verified and clear OTP
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: null,
      otpExpiresAt: null,
      isVerified: true
    },
    select: { id: true, phoneNumber: true, role: true, isVerified: true, business: true }
  });

  // Issue custom JWT token
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { token, user: updatedUser };
};

/**
 * Checks if user has been verified (polling endpoint for WhatsApp bot flow).
 */
const checkVerificationStatus = async (rawPhone) => {
  const phoneNumber = normalizePhoneNumber(rawPhone);

  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    select: { id: true, phoneNumber: true, role: true, isVerified: true, otpCode: true, business: true }
  });

  if (!user) return { isVerified: false };

  // If user is verified and OTP was cleared
  if (user.isVerified && !user.otpCode) {
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    return { isVerified: true, token, user };
  }

  return { isVerified: false };
};

/* =========================================================================
   LEGACY: FIREBASE AUTH FLOW (commented out — pivoted to Evolution API)
   =========================================================================
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

    // Generate OUR custom backend JWT
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
   ========================================================================= */

module.exports = {
  loginOrRegister,
  verifyOTP,
  checkVerificationStatus,
  // verifyFirebaseToken // LEGACY: Firebase auth disabled
};
