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
  const where = {};
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

const updateProductStatus = async (adminId, productId, status, rejectionReason = null) => {
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      status,
      rejectionReason: status === 'REJECTED' ? rejectionReason : null
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: status === 'APPROVED' ? 'APPROVE_PRODUCT' : 'REJECT_PRODUCT',
      targetId: productId,
      details: { rejectionReason }
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
    } else if (status === 'REJECTED') {
      const title = 'تم رفض منتجك ⚠️';
      const body = `تم رفض "${product.title}" — السبب: ${rejectionReason}`;
      await notificationService.createNotification(business.userId, title, body, 'PRODUCT_REJECTED');
      await fcmService.sendToUser(business.userId, title, body, { type: 'PRODUCT_REJECTED', productId, rejectionReason });
    }
  }

  return product;
};

const deleteProductByAdmin = async (adminId, productId) => {
  const product = await prisma.product.delete({ where: { id: productId } });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'DELETE_PRODUCT',
      targetId: productId,
      details: { title: product.title }
    }
  });

  return product;
};

const getAllUsers = async () => {
  return await prisma.user.findMany({
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
  const user = await prisma.user.delete({ where: { id: userId } });

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'DELETE_USER',
      targetId: userId,
      details: { phoneNumber: user.phoneNumber }
    }
  });

  return user;
};

const getAllBusinesses = async () => {
  return await prisma.business.findMany({
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
      product: { select: { id: true, title: true } }
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
  return await prisma.report.findMany({
    include: { reporter: { select: { phoneNumber: true } } },
    orderBy: { createdAt: 'desc' }
  });
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
  getBroadcastHistory
};
