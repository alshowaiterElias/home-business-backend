const chatService = require('../services/chatService');

// ─── List Conversations ──────────────────────────────────────────
const getConversations = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const result = await chatService.getConversations(req.user.id, {
      cursor,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get or Create Conversation ──────────────────────────────────
const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const conversation = await chatService.getOrCreateConversation(req.user.id, userId);
    res.json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    const status = error.message.includes('Cannot') ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── Get Messages ────────────────────────────────────────────────
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { cursor, limit } = req.query;
    const result = await chatService.getMessages(id, req.user.id, {
      cursor,
      limit: limit ? parseInt(limit) : 30,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting messages:', error);
    const status = error.message.includes('Not a participant') ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── Send Message ────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, text, tempId, replyToId, reference } = req.body;

    if (!text && !reference) {
      return res.status(400).json({ success: false, message: 'Message text or reference is required' });
    }

    const message = await chatService.sendMessage(id, req.user.id, {
      type,
      text,
      tempId,
      replyToId,
      reference,
    });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error sending message:', error);
    const status = error.message.includes('Cannot') || error.message.includes('Not a participant') ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── Mark as Read ────────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { messageId } = req.body;
    if (!messageId) {
      return res.status(400).json({ success: false, message: 'messageId is required' });
    }
    await chatService.markAsRead(id, req.user.id, messageId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Mute Conversation ──────────────────────────────────────────
const muteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { muted } = req.body;
    await chatService.updateConversationFlags(id, req.user.id, { isMuted: !!muted });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Archive Conversation ────────────────────────────────────────
const archiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;
    await chatService.updateConversationFlags(id, req.user.id, { isArchived: !!archived });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete (Hide) Conversation ──────────────────────────────────
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    await chatService.updateConversationFlags(id, req.user.id, { isDeleted: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete Message ──────────────────────────────────────────────
const deleteMessageHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { forAll } = req.body;
    await chatService.deleteMessage(id, req.user.id, !!forAll);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    const status = error.message.includes('Only the sender') ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// ─── Block User ──────────────────────────────────────────────────
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await chatService.blockUser(req.user.id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Unblock User ────────────────────────────────────────────────
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await chatService.unblockUser(req.user.id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Unread Count ────────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const count = await chatService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
  muteConversation,
  archiveConversation,
  deleteConversation,
  deleteMessage: deleteMessageHandler,
  blockUser,
  unblockUser,
  getUnreadCount,
};
