const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const fcmService = require('./fcmService');

const CHAT_MESSAGE_TYPES = new Set(['TEXT', 'PRODUCT_REFERENCE', 'STORE_REFERENCE', 'SYSTEM_MESSAGE']);

const createChatError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertConversationParticipant = async (conversationId, userId, client = prisma) => {
  const participant = await client.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

  if (!participant) {
    throw createChatError('Not a participant of this conversation', 403);
  }

  return participant;
};

const getReferenceSnapshot = async (client, type, reference) => {
  if (!reference || typeof reference !== 'object' || !reference.referenceId) {
    throw createChatError('A valid marketplace reference is required');
  }

  if (type === 'PRODUCT_REFERENCE') {
    if (reference.referenceType !== 'PRODUCT') {
      throw createChatError('Product references must use referenceType PRODUCT');
    }

    const product = await client.product.findUnique({
      where: { id: reference.referenceId },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, nameAr: true } },
        business: {
          include: { city: { include: { governorate: true } } },
        },
      },
    });

    if (!product || product.deletedAt || product.status !== 'APPROVED' || !product.isAvailable ||
        !product.business || !product.business.isActive || product.business.deletedAt) {
      throw createChatError('The referenced product is not currently available', 404);
    }

    return {
      referenceType: 'PRODUCT',
      referenceId: product.id,
      snapshotTitle: product.title,
      snapshotPrice: product.price.toString(),
      snapshotImage: product.images[0]?.imageUrl || null,
      snapshotMeta: {
        currency: product.currency,
        unitOfSale: product.unitOfSale,
        categoryId: product.category.id,
        categoryName: product.category.nameAr,
        businessId: product.business.id,
        businessName: product.business.businessName,
        cityId: product.business.city.id,
        cityName: product.business.city.nameAr,
        governorateId: product.business.city.governorate.id,
        governorateName: product.business.city.governorate.nameAr,
      },
    };
  }

  if (type === 'STORE_REFERENCE') {
    if (reference.referenceType !== 'STORE') {
      throw createChatError('Store references must use referenceType STORE');
    }

    const business = await client.business.findUnique({
      where: { id: reference.referenceId },
      include: { city: { include: { governorate: true } } },
    });

    if (!business || !business.isActive || business.deletedAt) {
      throw createChatError('The referenced store is not currently available', 404);
    }

    return {
      referenceType: 'STORE',
      referenceId: business.id,
      snapshotTitle: business.businessName,
      snapshotPrice: null,
      snapshotImage: business.logoUrl,
      snapshotMeta: {
        cityId: business.city.id,
        cityName: business.city.nameAr,
        governorateId: business.city.governorate.id,
        governorateName: business.city.governorate.nameAr,
        addressDetails: business.addressDetails,
      },
    };
  }

  throw createChatError('Unsupported marketplace reference type');
};

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
          visibility: { none: { userId } },
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

      const lastMessageHidden = conv.lastMessage
        ? await prisma.messageVisibility.findUnique({
            where: { messageId_userId: { messageId: conv.lastMessage.id, userId } },
            select: { id: true },
          })
        : null;

      return {
        ...conv,
        lastMessage: lastMessageHidden ? null : conv.lastMessage,
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
  await assertConversationParticipant(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedForAll: false,
      visibility: { none: { userId } },
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
  await assertConversationParticipant(conversationId, senderId);

  if (!CHAT_MESSAGE_TYPES.has(type) || type === 'SYSTEM_MESSAGE') {
    throw createChatError('Unsupported message type');
  }

  const normalizedText = typeof text === 'string' ? text.trim() : null;
  if (normalizedText && normalizedText.length > 4000) {
    throw createChatError('Message text is too long');
  }

  const isReferenceMessage = type === 'PRODUCT_REFERENCE' || type === 'STORE_REFERENCE';
  if (isReferenceMessage && !reference) {
    throw createChatError('A marketplace reference is required');
  }
  if (!isReferenceMessage && reference) {
    throw createChatError('Only marketplace reference messages may include a reference');
  }
  if (!isReferenceMessage && !normalizedText) {
    throw createChatError('Message text is required');
  }

  // Get the other participant(s) and check blocks
  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
    select: { userId: true, isMuted: true },
  });

  for (const other of otherParticipants) {
    const blocked = await isBlocked(senderId, other.userId);
    if (blocked) throw new Error('Cannot message this user');
  }

  if (replyToId) {
    const replyToMessage = await prisma.message.findFirst({
      where: { id: replyToId, conversationId, deletedForAll: false },
      select: { id: true },
    });
    if (!replyToMessage) {
      throw createChatError('Reply target was not found in this conversation', 404);
    }
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
    text: normalizedText,
    tempId,
    replyToId: replyToId || null,
  };

  // Create message + reference in a transaction
  const message = await prisma.$transaction(async (tx) => {
    const referenceSnapshot = isReferenceMessage
      ? await getReferenceSnapshot(tx, type, reference)
      : null;

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
    if (referenceSnapshot) {
      const ref = await tx.messageReference.create({
        data: {
          messageId: msg.id,
          referenceType: referenceSnapshot.referenceType,
          referenceId: referenceSnapshot.referenceId,
          snapshotTitle: referenceSnapshot.snapshotTitle,
          snapshotPrice: referenceSnapshot.snapshotPrice,
          snapshotImage: referenceSnapshot.snapshotImage,
          snapshotMeta: referenceSnapshot.snapshotMeta,
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
  await assertConversationParticipant(conversationId, userId);

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      conversationId,
      deletedForAll: false,
      visibility: { none: { userId } },
    },
    select: { id: true },
  });
  if (!message) {
    throw createChatError('Message not found in this conversation', 404);
  }

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
  if (!message) throw createChatError('Message not found', 404);

  await assertConversationParticipant(message.conversationId, userId);

  if (forAll) {
    // Only the sender can delete for everyone
    if (message.senderId !== userId) throw createChatError('Only the sender can delete for everyone', 403);
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
    // Hide only from this participant. The original message remains available to
    // the other participant and is not incorrectly removed from their history.
    await prisma.messageVisibility.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { deletedAt: new Date() },
    });
  }
};

// ─── Mute / Archive / Delete Conversation ────────────────────────
const updateConversationFlags = async (conversationId, userId, flags) => {
  await assertConversationParticipant(conversationId, userId);
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
        visibility: { none: { userId } },
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
  assertConversationParticipant,
};
