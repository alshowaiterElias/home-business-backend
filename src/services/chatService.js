const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const fcmService = require('./fcmService');

// ─── Helper: Check if user is blocked ────────────────────────────
const isBlocked = async (userId1, userId2) => {
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    },
  });
  return !!block;
};

// ─── Get or Create 1:1 Conversation ──────────────────────────────
const getOrCreateConversation = async (userId1, userId2) => {
  if (userId1 === userId2) {
    throw new Error('Cannot create conversation with yourself');
  }

  // Check block
  const blocked = await isBlocked(userId1, userId2);
  if (blocked) throw new Error('Cannot message this user');

  // Find existing 1:1 conversation between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: userId1 } } },
        { participants: { some: { userId: userId2 } } },
      ],
      // Ensure it's strictly a 1:1 (not a group in the future)
      participants: { every: { userId: { in: [userId1, userId2] } } },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              business: {
                select: {
                  id: true,
                  businessName: true,
                  logoUrl: true,
                  contactPhone: true,
                },
              },
            },
          },
        },
      },
      lastMessage: {
        include: { sender: { select: { id: true, phoneNumber: true } }, reference: true },
      },
    },
  });

  if (existing) {
    // Un-delete if participant had soft-deleted
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: existing.id, userId: userId1, isDeleted: true },
      data: { isDeleted: false },
    });
    return existing;
  }

  // Create new conversation
  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: userId1 }, { userId: userId2 }],
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              business: {
                select: {
                  id: true,
                  businessName: true,
                  logoUrl: true,
                  contactPhone: true,
                },
              },
            },
          },
        },
      },
      lastMessage: true,
    },
  });

  return conversation;
};

// ─── Get Conversations List (paginated) ──────────────────────────
const getConversations = async (userId, { cursor, limit = 20 }) => {
  const where = {
    participants: {
      some: {
        userId,
        isDeleted: false,
      },
    },
  };

  const conversations = await prisma.conversation.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { updatedAt: 'desc' },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              business: {
                select: {
                  id: true,
                  businessName: true,
                  logoUrl: true,
                  contactPhone: true,
                },
              },
            },
          },
        },
      },
      lastMessage: {
        include: {
          sender: { select: { id: true, phoneNumber: true } },
          reference: true,
        },
      },
    },
  });

  const hasMore = conversations.length > limit;
  const items = hasMore ? conversations.slice(0, limit) : conversations;

  // Add unread count for each conversation
  const enriched = await Promise.all(
    items.map(async (conv) => {
      const participant = conv.participants.find((p) => p.userId === userId);
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          deletedForAll: false,
          ...(participant?.lastReadMessageId
            ? {
                createdAt: {
                  gt: (
                    await prisma.message.findUnique({
                      where: { id: participant.lastReadMessageId },
                      select: { createdAt: true },
                    })
                  )?.createdAt ?? new Date(0),
                },
              }
            : {}),
        },
      });

      return {
        ...conv,
        unreadCount,
        isMuted: participant?.isMuted ?? false,
        isArchived: participant?.isArchived ?? false,
      };
    })
  );

  return {
    conversations: enriched,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
};

// ─── Get Messages (cursor-paginated) ─────────────────────────────
const getMessages = async (conversationId, userId, { cursor, limit = 30 }) => {
  // Verify user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw new Error('Not a participant of this conversation');

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedForAll: false,
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          phoneNumber: true,
          business: { select: { id: true, businessName: true, logoUrl: true } },
        },
      },
      reference: true,
      replyTo: {
        include: {
          sender: { select: { id: true, phoneNumber: true } },
          reference: true,
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
};

// ─── Send Message ────────────────────────────────────────────────
const sendMessage = async (conversationId, senderId, { type = 'TEXT', text, tempId, replyToId, reference }) => {
  // Verify sender is a participant
  const senderParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!senderParticipant) throw new Error('Not a participant of this conversation');

  // Get the other participant(s) and check blocks
  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
    select: { userId: true, isMuted: true },
  });

  for (const other of otherParticipants) {
    const blocked = await isBlocked(senderId, other.userId);
    if (blocked) throw new Error('Cannot message this user');
  }

  // Duplicate prevention: check for recent tempId
  if (tempId) {
    const existing = await prisma.message.findFirst({
      where: { conversationId, senderId, tempId },
    });
    if (existing) {
      return existing;
    }
  }

  // Build the message data
  const messageData = {
    conversationId,
    senderId,
    type,
    text,
    tempId,
    replyToId: replyToId || null,
  };

  // Create message + reference in a transaction
  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: messageData,
      include: {
        sender: {
          select: {
            id: true,
            phoneNumber: true,
            business: { select: { id: true, businessName: true, logoUrl: true } },
          },
        },
        replyTo: {
          include: {
            sender: { select: { id: true, phoneNumber: true } },
          },
        },
      },
    });

    // Create reference snapshot if applicable
    if (reference && (type === 'PRODUCT_REFERENCE' || type === 'STORE_REFERENCE')) {
      const ref = await tx.messageReference.create({
        data: {
          messageId: msg.id,
          referenceType: reference.referenceType,
          referenceId: reference.referenceId,
          snapshotTitle: reference.snapshotTitle,
          snapshotPrice: reference.snapshotPrice,
          snapshotImage: reference.snapshotImage,
          snapshotMeta: reference.snapshotMeta || null,
        },
      });
      msg.reference = ref;
    }

    // Update conversation's lastMessage
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageId: msg.id },
    });

    // Mark sender's own message as read
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: senderId } },
      data: { lastReadMessageId: msg.id },
    });

    return msg;
  });

  // ── Real-time: emit via Socket.IO ──────────────────────────────
  try {
    const io = getIO();

    // Emit to the conversation room
    io.to(`conv:${conversationId}`).emit('message:new', {
      conversationId,
      message,
    });

    // Also emit to user-level rooms for participants not in the conv room
    // (so their conversation list updates)
    for (const other of otherParticipants) {
      io.to(`user:${other.userId}`).emit('conversation:updated', {
        conversationId,
        lastMessage: message,
      });
    }
  } catch (err) {
    // Socket.IO not initialized — not fatal, message is saved
    console.warn('Socket.IO emit failed:', err.message);
  }

  // ── FCM Push Notification for offline participants ─────────────
  const senderBusiness = message.sender?.business;
  const senderName = senderBusiness?.businessName || message.sender.phoneNumber;

  let pushBody = text || '';
  if (type === 'PRODUCT_REFERENCE') pushBody = '📦 أرسل لك منتجاً';
  else if (type === 'STORE_REFERENCE') pushBody = '🏪 أرسل لك متجراً';

  for (const other of otherParticipants) {
    if (!other.isMuted) {
      fcmService.sendToUser(other.userId, senderName, pushBody, {
        type: 'NEW_CHAT_MESSAGE',
        conversationId,
        messageId: message.id,
      }).catch((err) => console.error('FCM chat push error:', err.message));
    }
  }

  return message;
};

// ─── Mark as Read ────────────────────────────────────────────────
const markAsRead = async (conversationId, userId, messageId) => {
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadMessageId: messageId },
  });

  // Emit read receipt via socket
  try {
    const io = getIO();
    io.to(`conv:${conversationId}`).emit('message:read', {
      conversationId,
      userId,
      messageId,
    });
  } catch (_) {}
};

// ─── Delete Message ──────────────────────────────────────────────
const deleteMessage = async (messageId, userId, forAll = false) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true, conversationId: true },
  });
  if (!message) throw new Error('Message not found');

  if (forAll) {
    // Only the sender can delete for everyone
    if (message.senderId !== userId) throw new Error('Only the sender can delete for everyone');
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedForAll: true, deletedAt: new Date() },
    });

    // Emit deletion to conversation
    try {
      const io = getIO();
      io.to(`conv:${message.conversationId}`).emit('message:deleted', {
        conversationId: message.conversationId,
        messageId,
        deletedForAll: true,
      });
    } catch (_) {}
  } else {
    // Soft delete for current user only — mark as deletedAt (visible marker)
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }
};

// ─── Mute / Archive / Delete Conversation ────────────────────────
const updateConversationFlags = async (conversationId, userId, flags) => {
  return prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: flags,
  });
};

// ─── Block / Unblock User ────────────────────────────────────────
const blockUser = async (blockerId, blockedId) => {
  return prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });
};

const unblockUser = async (blockerId, blockedId) => {
  return prisma.userBlock.deleteMany({
    where: { blockerId, blockedId },
  });
};

// ─── Get Total Unread Count ──────────────────────────────────────
const getUnreadCount = async (userId) => {
  // Get all active conversations for this user
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId, isDeleted: false },
    select: { conversationId: true, lastReadMessageId: true },
  });

  let total = 0;
  for (const p of participants) {
    let lastReadDate = new Date(0);
    if (p.lastReadMessageId) {
      const lastRead = await prisma.message.findUnique({
        where: { id: p.lastReadMessageId },
        select: { createdAt: true },
      });
      if (lastRead) lastReadDate = lastRead.createdAt;
    }

    const count = await prisma.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: userId },
        deletedForAll: false,
        createdAt: { gt: lastReadDate },
      },
    });
    total += count;
  }

  return total;
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  updateConversationFlags,
  blockUser,
  unblockUser,
  getUnreadCount,
  isBlocked,
};
