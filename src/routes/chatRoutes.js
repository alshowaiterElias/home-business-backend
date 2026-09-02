const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const chatController = require('../controllers/chatController');

// All chat routes require authentication
router.use(protect);

// ─── Conversations ───────────────────────────────────────────────
router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.getOrCreateConversation);

// ─── Messages ────────────────────────────────────────────────────
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);

// ─── Conversation Actions ────────────────────────────────────────
router.patch('/conversations/:id/read', chatController.markAsRead);
router.patch('/conversations/:id/mute', chatController.muteConversation);
router.patch('/conversations/:id/archive', chatController.archiveConversation);
router.delete('/conversations/:id', chatController.deleteConversation);

// ─── Message Actions ─────────────────────────────────────────────
router.delete('/messages/:id', chatController.deleteMessage);

// ─── User Blocking ───────────────────────────────────────────────
router.post('/block/:userId', chatController.blockUser);
router.delete('/block/:userId', chatController.unblockUser);

// ─── Unread Count ────────────────────────────────────────────────
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;
