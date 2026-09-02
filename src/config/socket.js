const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./db');

let io;

/**
 * Initialize Socket.IO on the HTTP server.
 * Auth is handled via JWT in `socket.handshake.auth.token`.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' },
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
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: socket.userId,
      });
    });

    // ── Room management ────────────────────────────────────────
    socket.on('conversation:join', ({ conversationId }) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('conversation:leave', ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Read receipts ──────────────────────────────────────────
    socket.on('message:read', async ({ conversationId, messageId }) => {
      try {
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
