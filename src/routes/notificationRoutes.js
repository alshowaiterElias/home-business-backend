const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, notificationController.getUserNotifications);
router.patch('/read-all', protect, notificationController.markAllAsRead);
router.patch('/:id/read', protect, notificationController.markAsRead);
router.delete('/delete-all', protect, notificationController.deleteAllNotifications);
router.delete('/', protect, notificationController.deleteAllNotifications);
router.delete('/:id', protect, notificationController.deleteNotification);

module.exports = router;
