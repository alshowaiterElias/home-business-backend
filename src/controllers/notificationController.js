const notificationService = require('../services/notificationService');

const getUserNotifications = async (req, res) => {
  try {
    const { limit, page } = req.query;
    const notifications = await notificationService.getUserNotifications(req.user.id, limit, page);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    await notificationService.deleteAllNotifications(req.user.id);
    res.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
};
