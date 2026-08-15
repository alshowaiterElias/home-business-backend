require('dotenv').config();

// Fail fast if critical env vars are missing
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'super_secret_jwt_key_here') {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET is not set or is using the default value. Aborting.');
    process.exit(1);
  } else {
    console.warn('⚠️  WARNING: JWT_SECRET is using the default dev value. Do NOT use this in production.');
  }
}

const app = require('./app');
const prisma = require('./config/db');

const PORT = process.env.PORT || 5000;

const { cleanupOrphanedImages } = require('./utils/cleanup');

const server = app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`=================================`);

  // Run cleanup every 24 hours (24 * 60 * 60 * 1000)
  setInterval(cleanupOrphanedImages, 86400000);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Database disconnected. Process exiting.');
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
