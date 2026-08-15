const prisma = require('../config/db');

const saveDeviceToken = async (userId, fcmToken, devicePlatform) => {
  // Check if this exact token is already registered to this user
  const existingToken = await prisma.deviceToken.findFirst({
    where: { userId, fcmToken }
  });

  if (existingToken) {
    // Just update the lastUsedAt timestamp
    return await prisma.deviceToken.update({
      where: { id: existingToken.id },
      data: { lastUsedAt: new Date() }
    });
  }

  // Register new device token
  return await prisma.deviceToken.create({
    data: {
      userId,
      fcmToken,
      devicePlatform // Expected: 'ANDROID' or 'IOS'
    }
  });
};

const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phoneNumber: true,
      role: true,
      isVerified: true,
      business: true
    }
  });
  if (!user) throw new Error('User not found');
  return user;
};

module.exports = { saveDeviceToken, getUserProfile };
