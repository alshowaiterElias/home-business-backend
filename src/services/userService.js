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

  if (!user || user.deletedAt) {
    throw new Error('المستخدم غير موجود أو تم حذفه سابقاً');
  }

  if (user.role === 'ADMIN') {
    throw new Error('لا يمكن حذف حساب المسؤول الرئيسي عبر التطبيق');
  }

  // If user owns a business, soft delete business & suspend products
  if (user.business) {
    await prisma.business.update({
      where: { id: user.business.id },
      data: { isActive: false, deletedAt: new Date() }
    });

    await prisma.product.updateMany({
      where: { businessId: user.business.id },
      data: { status: 'SUSPENDED', isAvailable: false, deletedAt: new Date(), rejectionReason: 'تم توقيف المنتج بسبب حذف حساب التاجر' }
    });
  }

  // Delete device tokens
  await prisma.deviceToken.deleteMany({ where: { userId } });

  const anonymizedPhone = `DELETED_${user.id.slice(0, 8)}_${Date.now()}`;
  await prisma.user.update({
    where: { id: userId },
    data: {
      isVerified: false,
      phoneNumber: anonymizedPhone,
      deletedAt: new Date()
    }
  });

  return {
    deleted: true,
    message: 'تم حذف حسابك وإلغاء تنشيط جميع بياناتك بنجاح'
  };
};

module.exports = { saveDeviceToken, getUserProfile, requestAccountDeletion };
