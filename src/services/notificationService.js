const prisma = require('../config/db');

const getUserNotifications = async (userId, limit = 50, page = 1) => {
  const take = parseInt(limit, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  return await prisma.notification.findMany({
    where: { userId },
    take: take,
    skip: skip,
    orderBy: { createdAt: 'desc' }
  });
};

const createNotification = async (userId, title, body, type) => {
  return await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type
    }
  });
};

const markAsRead = async (id, userId) => {
  const notification = await prisma.notification.findUnique({ where: { id } });
  
  if (!notification) throw new Error('Notification not found');
  if (notification.userId !== userId) throw new Error('Unauthorized');
  
  return await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
};

const markAllAsRead = async (userId) => {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
};

module.exports = {
  getUserNotifications,
  createNotification,
  markAsRead,
  markAllAsRead
};
