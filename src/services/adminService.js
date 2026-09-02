const prisma = require('../config/db');
const notificationService = require('./notificationService');

const getDashboardStats = async () => {
  const [
    totalUsers,
    totalBusinesses,
    totalProducts,
    pendingProductsCount,
    approvedProductsCount,
    totalCategories,
    totalCities,
    pendingReportsCount,
    totalReviews
  ] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.product.count(),
    prisma.product.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { status: 'APPROVED' } }),
    prisma.category.count(),
    prisma.city.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.productReview.count()
  ]);

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, phoneNumber: true, role: true, isVerified: true, createdAt: true, business: { select: { businessName: true } } }
  });

  const recentPendingProducts = await prisma.product.findMany({
    take: 5,
    where: { status: 'PENDING' },
    include: { business: true, category: true, images: true },
    orderBy: { createdAt: 'desc' }
  });

  return {
    totals: {
      users: totalUsers,
      businesses: totalBusinesses,
      products: totalProducts,
      pendingProducts: pendingProductsCount,
      approvedProducts: approvedProductsCount,
      categories: totalCategories,
      cities: totalCities,
      pendingReports: pendingReportsCount,
      reviews: totalReviews
    },
    recentUsers,
    recentPendingProducts
  };
};

const getPendingProducts = async () => {
  return await prisma.product.findMany({
    where: { status: 'PENDING' },
    include: {
      business: true,
      images: true,
      category: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const getAllProducts = async ({ status, categoryId, search }) => {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } }
    ];
  }

  return await prisma.product.findMany({
    where,
    include: {
      business: { select: { id: true, businessName: true, contactPhone: true } },
      category: { select: { id: true, nameAr: true } },
      images: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const fcmService = require('./fcmService');

const updateProductStatus = async (adminId, productId, status, rejectionReason = null, revisionReason = null) => {
  const updateData = {
    status,
    rejectionReason: status === 'REJECTED' ? rejectionReason : null,
    revisionReason: status === 'NEEDS_REVISION' ? revisionReason : null
  };
  if (status === 'SUSPENDED') {
    updateData.isFeatured = false;
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: updateData
  });

  let action = 'APPROVE_PRODUCT';
  if (status === 'REJECTED') action = 'REJECT_PRODUCT';
  if (status === 'SUSPENDED') action = 'SUSPEND_PRODUCT';
  if (status === 'NEEDS_REVISION') action = 'REQUEST_PRODUCT_REVISION';

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetId: productId,
      details: { rejectionReason, revisionReason }
    }
  });

  // Notify seller (Database + FCM Push)
  const business = await prisma.business.findUnique({ where: { id: product.businessId } });
  if (business) {
    if (status === 'APPROVED') {
      const title = 'تم قبول منتجك 🎉';
      const body = `تمت الموافقة على "${product.title}" وهو الآن متاح للعملاء في التطبيق.`;
      await notificationService.createNotification(business.userId, title, body, 'PRODUCT_APPROVED');
      await fcmService.sendToUser(business.userId, title, body, { type: 'PRODUCT_APPROVED', productId });

      // Notify all followers of this store
      try {
        const followers = await prisma.storeFollower.findMany({
          where: { businessId: business.id },
          select: { userId: true }
        });

        if (followers.length > 0) {
          const followerTitle = `منتج جديد من ${business.businessName} 🛍️`;
          const followerBody = `أضاف متجر "${business.businessName}" الذي تتابعه منتجاً جديداً: "${product.title}". تصفحه الآن!`;

          const followerUserIds = followers.map((f) => f.userId);

          // Batch insert in-app notifications
          await prisma.notification.createMany({
            data: followerUserIds.map((userId) => ({
              userId,
              title: followerTitle,
              body: followerBody,
              type: 'NEW_PRODUCT_RELEASE'
            }))
          });

          // Dispatch FCM push notifications to followers
          for (const followerId of followerUserIds) {
            fcmService.sendToUser(followerId, followerTitle, followerBody, {
              type: 'NEW_PRODUCT_RELEASE',
              productId: product.id,
              businessId: business.id
            }).catch((err) => console.error(`Error sending follower FCM to ${followerId}:`, err));
          }
        }
      } catch (err) {
        console.error('Error notifying store followers on product approval:', err);
      }
    } else if (status === 'REJECTED') {
      const title = 'تم رفض منتجك ⚠️';
      const body = `تم رفض "${product.title}" — السبب: ${rejectionReason}`;
      await notificationService.createNotification(business.userId, title, body, 'PRODUCT_REJECTED');
      await fcmService.sendToUser(business.userId, title, body, { type: 'PRODUCT_REJECTED', productId, rejectionReason });
    } else if (status === 'SUSPENDED') {
      const title = 'تم توقيف المنتج ⚠️';
      const body = `تم توقيف منتجك "${product.title}" من قبل إدارة المنصة. يرجى التواصل مع الدعم لمزيد من المعلومات.`;
      await notificationService.createNotification(business.userId, title, body, 'PRODUCT_SUSPENDED');
      await fcmService.sendToUser(business.userId, title, body, { type: 'PRODUCT_SUSPENDED', productId });
    } else if (status === 'NEEDS_REVISION') {
      const title = 'طلب تعديل على منتجك 📝';
      const body = `طلب الأدمن إجراء تعديلات على منتجك "${product.title}" — الملاحظات: ${revisionReason}`;
      await notificationService.createNotification(business.userId, title, body, 'PRODUCT_NEEDS_REVISION');
      await fcmService.sendToUser(business.userId, title, body, { type: 'PRODUCT_NEEDS_REVISION', productId, revisionReason });
    }
  }

  return product;
};

const deleteProductByAdmin = async (adminId, productId) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      _count: { select: { reviews: true } }
    }
  });

  if (!product) {
    const error = new Error('المنتج غير موجود');
    error.statusCode = 404;
    throw error;
  }

  // Check if product is referenced in reviews or reports
  const reportsCount = await prisma.report.count({
    where: { targetType: 'PRODUCT', targetId: productId }
  });

  if (product._count.reviews > 0 || reportsCount > 0) {
    // Soft delete / suspend product to preserve review & audit history
    await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'SUSPENDED',
        isAvailable: false,
        deletedAt: new Date()
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'SOFT_DELETE_PRODUCT',
        targetId: productId,
        details: { title: product.title, reason: 'تمت أرشفته وتوقيفه لوجود تقييمات/بلاغات سابقة' }
      }
    });

    return { ...product, isSoftDeleted: true };
  }

  // Pure product without history can be safely hard deleted
  const deletedProduct = await prisma.product.delete({ where: { id: productId } });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'DELETE_PRODUCT',
      targetId: productId,
      details: { title: product.title }
    }
  });

  return deletedProduct;
};

const getAllUsers = async () => {
  return await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      business: {
        include: { city: { include: { governorate: true } } }
      },
      _count: { select: { reviews: true, reports: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const updateUserRole = async (adminId, userId, role) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'UPDATE_USER_ROLE',
      targetId: userId,
      details: { newRole: role }
    }
  });

  return user;
};

const deleteUser = async (adminId, userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { business: true }
  });

  if (!user) {
    const error = new Error('المستخدم غير موجود');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'ADMIN') {
    const error = new Error('لا يمكن حذف حساب مشرف/أدمن النظام الرئيسية.');
    error.statusCode = 400;
    throw error;
  }

  // Soft delete user and attached business
  if (user.business) {
    await prisma.business.update({
      where: { id: user.business.id },
      data: { isActive: false, deletedAt: new Date() }
    });

    await prisma.product.updateMany({
      where: { businessId: user.business.id },
      data: { status: 'SUSPENDED', isAvailable: false, deletedAt: new Date() }
    });
  }

  // Remove push tokens
  await prisma.deviceToken.deleteMany({ where: { userId } });

  const anonymizedPhone = `DELETED_${user.id.slice(0, 8)}_${Date.now()}`;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isVerified: false,
      phoneNumber: anonymizedPhone,
      deletedAt: new Date()
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'SOFT_DELETE_USER',
      targetId: userId,
      details: { originalPhone: user.phoneNumber }
    }
  });

  return updatedUser;
};

const getAllBusinesses = async () => {
  return await prisma.business.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { id: true, phoneNumber: true, role: true, createdAt: true } },
      city: { include: { governorate: true } },
      _count: { select: { products: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const toggleBusinessStatus = async (adminId, businessId, isActive) => {
  const business = await prisma.business.update({
    where: { id: businessId },
    data: { isActive }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: isActive ? 'ENABLE_BUSINESS' : 'DISABLE_BUSINESS',
      targetId: businessId,
      details: { businessName: business.businessName }
    }
  });

  return business;
};

const getAllReviews = async () => {
  return await prisma.productReview.findMany({
    include: {
      user: { select: { id: true, phoneNumber: true } },
      product: {
        include: {
          images: true,
          category: { select: { id: true, nameAr: true } },
          business: { select: { id: true, businessName: true, contactPhone: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const deleteReview = async (adminId, reviewId) => {
  const review = await prisma.productReview.delete({ where: { id: reviewId } });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'DELETE_REVIEW',
      targetId: reviewId,
      details: { comment: review.comment }
    }
  });

  return review;
};

const getReports = async () => {
  const reports = await prisma.report.findMany({
    include: { reporter: { select: { phoneNumber: true } } },
    orderBy: { createdAt: 'desc' }
  });

  // Attach message data for MESSAGE reports
  for (const report of reports) {
    if (report.targetType === 'MESSAGE') {
      const message = await prisma.message.findUnique({
        where: { id: report.targetId },
        select: { conversationId: true, text: true, sender: { select: { phoneNumber: true } } }
      });
      if (message) {
        report.messageData = message;
      }
    }
  }

  return reports;
};

const getAuditLogs = async () => {
  return await prisma.adminAuditLog.findMany({
    include: { admin: { select: { id: true, phoneNumber: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
};

const getConversationMessages = async (adminId, conversationId) => {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, phoneNumber: true } },
      reference: true,
      replyTo: { select: { text: true, sender: { select: { phoneNumber: true } } } }
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'VIEW_CONVERSATION_LOGS',
      targetId: conversationId,
      details: { messagesCount: messages.length }
    }
  });

  return messages;
};

const resolveReport = async (adminId, reportId) => {
  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status: 'RESOLVED' }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'RESOLVE_REPORT',
      targetId: reportId,
      details: { targetType: report.targetType, targetId: report.targetId }
    }
  });

  return report;
};

const broadcastPushNotification = async (adminId, { targetType, targetUserId, title, body, notificationType = 'SYSTEM_ALERT' }) => {
  let result;
  if (targetType === 'USER' && targetUserId) {
    result = await fcmService.sendToUser(targetUserId, title, body, { type: notificationType });
    await notificationService.createNotification(targetUserId, title, body, notificationType);
  } else {
    result = await fcmService.sendToAllOrRole(targetType, title, body, { type: notificationType });
    // Also save in-app notification for all matching users
    let whereUser = {};
    if (targetType === 'SELLERS') whereUser = { business: { isNot: null } };
    const targetUsers = await prisma.user.findMany({ where: whereUser, select: { id: true } });
    if (targetUsers.length > 0) {
      await prisma.notification.createMany({
        data: targetUsers.map((u) => ({
          userId: u.id,
          title,
          body,
          type: notificationType
        }))
      });
    }
  }

  // Audit log
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'BROADCAST_NOTIFICATION',
      targetId: targetUserId || 'GLOBAL',
      details: { title, body, targetType, notificationType, delivered: result.delivered || 0 }
    }
  });

  return result;
};

const getBroadcastHistory = async () => {
  return await prisma.adminAuditLog.findMany({
    where: { action: 'BROADCAST_NOTIFICATION' },
    include: { admin: { select: { phoneNumber: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
};

/**
 * Helper to get setting value by key with fallback
 */
const getSettingValue = async (key, defaultValue = '10') => {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting ? setting.value : defaultValue;
};

/**
 * Get all system settings as key-value map
 */
const getSystemSettings = async () => {
  const settings = await prisma.systemSetting.findMany();
  const map = {
    maxFeaturedProducts: 10,
    maxFeaturedBusinesses: 10,
    autoApproveProducts: false,
    maintenanceMode: false,
    availabilityCooldownMinutes: 60,
    supportPhone: '+967772546343',
    supportEmail: 'alshowaiterelias@gmail.com',
    developerPhone: '+967772546343',
    developerEmail: 'alshowaiterelias@gmail.com'
  };
  for (const s of settings) {
    if (s.key === 'MAX_FEATURED_PRODUCTS') map.maxFeaturedProducts = parseInt(s.value, 10) || 10;
    if (s.key === 'MAX_FEATURED_BUSINESSES') map.maxFeaturedBusinesses = parseInt(s.value, 10) || 10;
    if (s.key === 'AUTO_APPROVE_PRODUCTS') map.autoApproveProducts = s.value === 'true';
    if (s.key === 'MAINTENANCE_MODE') map.maintenanceMode = s.value === 'true';
    if (s.key === 'AVAILABILITY_COOLDOWN_MINUTES') map.availabilityCooldownMinutes = parseInt(s.value, 10) ?? 60;
    if (s.key === 'SUPPORT_PHONE') map.supportPhone = s.value;
    if (s.key === 'SUPPORT_EMAIL') map.supportEmail = s.value;
    if (s.key === 'DEV_PHONE') map.developerPhone = s.value;
    if (s.key === 'DEV_EMAIL') map.developerEmail = s.value;
  }
  return map;
};

/**
 * Update system settings
 */
const updateSystemSettings = async (adminId, data) => {
  const updates = [];
  if (data.maxFeaturedProducts !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'MAX_FEATURED_PRODUCTS' },
      update: { value: String(data.maxFeaturedProducts) },
      create: { key: 'MAX_FEATURED_PRODUCTS', value: String(data.maxFeaturedProducts) }
    }));
  }
  if (data.maxFeaturedBusinesses !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'MAX_FEATURED_BUSINESSES' },
      update: { value: String(data.maxFeaturedBusinesses) },
      create: { key: 'MAX_FEATURED_BUSINESSES', value: String(data.maxFeaturedBusinesses) }
    }));
  }
  if (data.autoApproveProducts !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'AUTO_APPROVE_PRODUCTS' },
      update: { value: String(data.autoApproveProducts) },
      create: { key: 'AUTO_APPROVE_PRODUCTS', value: String(data.autoApproveProducts) }
    }));
  }
  if (data.maintenanceMode !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'MAINTENANCE_MODE' },
      update: { value: String(data.maintenanceMode) },
      create: { key: 'MAINTENANCE_MODE', value: String(data.maintenanceMode) }
    }));
  }
  if (data.availabilityCooldownMinutes !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'AVAILABILITY_COOLDOWN_MINUTES' },
      update: { value: String(data.availabilityCooldownMinutes) },
      create: { key: 'AVAILABILITY_COOLDOWN_MINUTES', value: String(data.availabilityCooldownMinutes) }
    }));
  }
  if (data.supportPhone !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'SUPPORT_PHONE' },
      update: { value: String(data.supportPhone) },
      create: { key: 'SUPPORT_PHONE', value: String(data.supportPhone) }
    }));
  }
  if (data.supportEmail !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'SUPPORT_EMAIL' },
      update: { value: String(data.supportEmail) },
      create: { key: 'SUPPORT_EMAIL', value: String(data.supportEmail) }
    }));
  }
  if (data.developerPhone !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'DEV_PHONE' },
      update: { value: String(data.developerPhone) },
      create: { key: 'DEV_PHONE', value: String(data.developerPhone) }
    }));
  }
  if (data.developerEmail !== undefined) {
    updates.push(prisma.systemSetting.upsert({
      where: { key: 'DEV_EMAIL' },
      update: { value: String(data.developerEmail) },
      create: { key: 'DEV_EMAIL', value: String(data.developerEmail) }
    }));
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);

    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'UPDATE_SYSTEM_SETTINGS',
        targetId: 'SYSTEM',
        details: data
      }
    });
  }

  return await getSystemSettings();
};

/**
 * Toggle product featured status with limit check
 */
const toggleProductFeatured = async (adminId, productId, isFeatured) => {
  if (isFeatured) {
    const maxLimitStr = await getSettingValue('MAX_FEATURED_PRODUCTS', '10');
    const maxLimit = parseInt(maxLimitStr, 10) || 10;

    const currentCount = await prisma.product.count({
      where: { isFeatured: true, status: 'APPROVED' }
    });

    if (currentCount >= maxLimit) {
      throw new Error(`لقد وصلت إلى الحد الأقصى للمنتجات المميزة (${maxLimit} منتجات). يمكنك زيادة الحد من صفحة الإعدادات أو إلغاء تمييز منتج آخر.`);
    }
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: { isFeatured: Boolean(isFeatured) }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: isFeatured ? 'FEATURE_PRODUCT' : 'UNFEATURE_PRODUCT',
      targetId: productId,
      details: { title: product.title }
    }
  });

  return product;
};

/**
 * Toggle business featured status with limit check
 */
const toggleBusinessFeatured = async (adminId, businessId, isFeatured) => {
  if (isFeatured) {
    const maxLimitStr = await getSettingValue('MAX_FEATURED_BUSINESSES', '10');
    const maxLimit = parseInt(maxLimitStr, 10) || 10;

    const currentCount = await prisma.business.count({
      where: { isFeatured: true, isActive: true }
    });

    if (currentCount >= maxLimit) {
      throw new Error(`لقد وصلت إلى الحد الأقصى للمتاجر المميزة (${maxLimit} متاجر). يمكنك زيادة الحد من صفحة الإعدادات أو إلغاء تمييز متجر آخر.`);
    }
  }

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { isFeatured: Boolean(isFeatured) }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: isFeatured ? 'FEATURE_BUSINESS' : 'UNFEATURE_BUSINESS',
      targetId: businessId,
      details: { businessName: business.businessName }
    }
  });

  return business;
};

module.exports = {
  getDashboardStats,
  getPendingProducts,
  getAllProducts,
  updateProductStatus,
  deleteProductByAdmin,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllBusinesses,
  toggleBusinessStatus,
  getAllReviews,
  deleteReview,
  getReports,
  resolveReport,
  getAuditLogs,
  broadcastPushNotification,
  getBroadcastHistory,
  getSystemSettings,
  updateSystemSettings,
  toggleProductFeatured,
  toggleBusinessFeatured,
  getSettingValue,
  getConversationMessages
};
