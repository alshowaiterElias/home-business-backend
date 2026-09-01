const prisma = require('../config/db');
const notificationService = require('./notificationService');
const fcmService = require('./fcmService');

const toggleFavorite = async (userId, productId) => {
  const existing = await prisma.favoriteProduct.findUnique({
    where: {
      userId_productId: { userId, productId }
    }
  });

  if (existing) {
    await prisma.favoriteProduct.delete({
      where: { userId_productId: { userId, productId } }
    });
    return { favorited: false, message: 'Removed from favorites' };
  } else {
    await prisma.favoriteProduct.create({
      data: { userId, productId }
    });
    return { favorited: true, message: 'Added to favorites' };
  }
};

const getUserFavorites = async (userId) => {
  return await prisma.favoriteProduct.findMany({
    where: {
      userId,
      product: {
        status: 'APPROVED',
        isAvailable: true
      }
    },
    include: {
      product: {
        include: { images: true, business: { select: { businessName: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const addReview = async (userId, productId, rating, comment) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  // Upsert review (allows creating or updating an existing review)
  const review = await prisma.productReview.upsert({
    where: {
      productId_userId: { productId, userId }
    },
    update: { rating: parseInt(rating), comment },
    create: { productId, userId, rating: parseInt(rating), comment }
  });

  // Calculate new average rating
  const aggregates = await prisma.productReview.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { id: true }
  });

  // Update product statistics
  await prisma.product.update({
    where: { id: productId },
    data: {
      averageRating: aggregates._avg.rating || 0,
      reviewsCount: aggregates._count.id || 0
    }
  });

  // Notify the business owner if it's a new review (not an update) and not self-review
  const business = await prisma.business.findUnique({ where: { id: product.businessId } });
  if (business && business.userId !== userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.phoneNumber || 'مستخدم';
    const title = 'تقييم جديد ⭐';
    const body = `قام ${userName} بتقييم منتج "${product.title}" بـ ${rating} نجوم.`;
    await notificationService.createNotification(business.userId, title, body, 'NEW_REVIEW');
    await fcmService.sendToUser(business.userId, title, body, { type: 'NEW_REVIEW', productId });
  }

  return review;
};

const submitReport = async (reporterId, targetType, targetId, reason) => {
  return await prisma.report.create({
    data: {
      reporterId,
      targetType, // Expected: 'PRODUCT', 'REVIEW', 'BUSINESS'
      targetId,
      reason
    }
  });
};

module.exports = { toggleFavorite, getUserFavorites, addReview, submitReport };
