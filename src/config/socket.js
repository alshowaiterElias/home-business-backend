const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./db');

let io;

/**
 * Initialize Socket.IO on the HTTP server.
 * Auth is handled via JWT in `socket.handshake.auth.token`.
 */
function initSocket(httpServer) {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: configuredOrigins.length > 0 ? configuredOrigins : true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth middleware ────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, phoneNumber: true, role: true },
      });
      if (!user) return next(new Error('User not found'));

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: user ${socket.userId}`);

    // Join personal room for targeted events (e.g. new conversation created)
    socket.join(`user:${socket.userId}`);

    // ── Typing indicators ──────────────────────────────────────
    const isConversationParticipant = async (conversationId) => {
      if (!conversationId || typeof conversationId !== 'string') return false;
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: socket.userId,
          },
        },
        select: { id: true },
      });
      return Boolean(participant);
    };

    const denyConversationEvent = (event, conversationId) => {
      socket.emit('chat:error', {
        event,
        conversationId,
        message: 'Not authorized for this conversation',
      });
    };

    socket.on('typing:start', async ({ conversationId } = {}) => {
      if (!(await isConversationParticipant(conversationId))) {
        denyConversationEvent('typing:start', conversationId);
        return;
      }
      socket.to(`conv:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('typing:stop', async ({ conversationId } = {}) => {
      if (!(await isConversationParticipant(conversationId))) {
        denyConversationEvent('typing:stop', conversationId);
        return;
      }
      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: socket.userId,
      });
    });

    // ── Room management ────────────────────────────────────────
    socket.on('conversation:join', async ({ conversationId } = {}) => {
      if (!(await isConversationParticipant(conversationId))) {
        denyConversationEvent('conversation:join', conversationId);
        return;
      }
      socket.join(`conv:${conversationId}`);
    });

    socket.on('conversation:leave', async ({ conversationId } = {}) => {
      if (!(await isConversationParticipant(conversationId))) {
        denyConversationEvent('conversation:leave', conversationId);
        return;
      }
      socket.leave(`conv:${conversationId}`);
    });

    // ── Read receipts ──────────────────────────────────────────
    socket.on('message:read', async ({ conversationId, messageId } = {}) => {
      try {
        if (!(await isConversationParticipant(conversationId))) {
          denyConversationEvent('message:read', conversationId);
          return;
        }

        const message = await prisma.message.findFirst({
          where: { id: messageId, conversationId, deletedForAll: false },
          select: { id: true },
        });
        if (!message) {
          socket.emit('chat:error', {
            event: 'message:read',
            conversationId,
            message: 'Message not found in this conversation',
          });
          return;
        }

        await prisma.conversationParticipant.updateMany({
          where: { conversationId, userId: socket.userId },
          data: { lastReadMessageId: messageId },
        });
        socket.to(`conv:${conversationId}`).emit('message:read', {
          conversationId,
          userId: socket.userId,
          messageId,
        });
      } catch (err) {
        console.error('Error updating read receipt:', err.message);
      }
    });

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: user ${socket.userId} (${reason})`);
    });
  });

  return io;
}

/**
 * Get the initialized Socket.IO instance.
 * Throws if called before `initSocket`.
 */
function getIO() {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket first');
  return io;
}

module.exports = { initSocket, getIO };
