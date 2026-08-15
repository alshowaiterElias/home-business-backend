const prisma = require('../config/db');
const notificationService = require('./notificationService');

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

  // Notify the seller
  const business = await prisma.business.findUnique({ where: { id: product.businessId } });
  if (business) {
    if (status === 'APPROVED') {
      await notificationService.createNotification(
        business.userId,
        'تم قبول منتجك',
        `تمت الموافقة على "${product.title}" وهو الآن متاح للعملاء.`,
        'PRODUCT_APPROVED'
      );
    } else if (status === 'REJECTED') {
      await notificationService.createNotification(
        business.userId,
        'تم رفض منتجك',
        `تم رفض "${product.title}" — السبب: ${rejectionReason}`,
        'PRODUCT_REJECTED'
      );
    }
  }

  return product;
};

const getReports = async () => {
  return await prisma.report.findMany({
    where: { status: 'PENDING' },
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

const getAuditLogs = async () => {
  return await prisma.adminAuditLog.findMany({
    take: 100, // Limit payload to recent 100 logs
    include: { admin: { select: { phoneNumber: true } } },
    orderBy: { createdAt: 'desc' }
  });
};

module.exports = {
  getPendingProducts,
  updateProductStatus,
  getReports,
  resolveReport,
  getAuditLogs
};
