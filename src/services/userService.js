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

const requestAccountDeletion = async (userId, reason = '') => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { business: true }
  });

  if (!user) {
    throw new Error('المستخدم غير موجود');
  }

  if (user.role === 'ADMIN') {
    throw new Error('لا يمكن حذف حساب المسؤول الرئيسي عبر التطبيق');
  }

  // If user owns a business, deactivate business & products first
  if (user.business) {
    await prisma.business.update({
      where: { id: user.business.id },
      data: { isActive: false }
    });

    await prisma.product.updateMany({
      where: { businessId: user.business.id },
      data: { status: 'REJECTED', rejectionReason: 'تم توقيف المنتج بسبب حذف حساب التاجر' }
    });
  }

  // Delete device tokens & user account
  await prisma.deviceToken.deleteMany({ where: { userId } });
  
  const deletedUser = await prisma.user.delete({
    where: { id: userId }
  });

  return {
    deleted: true,
    phoneNumber: deletedUser.phoneNumber,
    message: 'تم حذف حسابك وجميع بياناتك المتعلقة بنجاح'
  };
};

module.exports = { saveDeviceToken, getUserProfile, requestAccountDeletion };
