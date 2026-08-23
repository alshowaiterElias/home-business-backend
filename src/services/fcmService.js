const { getMessaging } = require('../config/firebase');
const prisma = require('../config/db');

/**
 * Sends FCM Push Notifications to a specific user's registered device tokens.
 */
const sendToUser = async (userId, title, body, data = {}) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      console.warn('⚠️ FCM Messaging not initialized (Firebase Admin key missing).');
      return { success: false, message: 'FCM not initialized' };
    }

    const deviceTokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { id: true, fcmToken: true }
    });

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log(`ℹ️ No device tokens registered for userId: ${userId}`);
      return { success: true, delivered: 0 };
    }

    const tokens = deviceTokens.map((t) => t.fcmToken);

    // Convert data object values to strings (FCM data payload requirement)
    const stringifiedData = {};
    for (const [key, val] of Object.entries(data)) {
      stringifiedData[key] = String(val);
    }

    const message = {
      notification: {
        title,
        body
      },
      data: stringifiedData,
      tokens
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`📡 FCM Multicast sent to user ${userId}: ${response.successCount} succeeded, ${response.failureCount} failed.`);

    // Clean up stale / unregistered tokens
    if (response.failureCount > 0) {
      const failedTokensToDelete = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            failedTokensToDelete.push(tokens[idx]);
          }
        }
      });

      if (failedTokensToDelete.length > 0) {
        await prisma.deviceToken.deleteMany({
          where: { fcmToken: { in: failedTokensToDelete } }
        });
        console.log(`🧹 Cleaned up ${failedTokensToDelete.length} invalid FCM tokens.`);
      }
    }

    return { success: true, delivered: response.successCount };
  } catch (error) {
    console.error('❌ Error sending FCM notification to user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends FCM Push Notifications to all active registered devices or filtered by role.
 */
const sendToAllOrRole = async (targetRole, title, body, data = {}) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return { success: false, message: 'FCM not initialized' };
    }

    let whereClause = {};
    if (targetRole === 'SELLERS') {
      whereClause = { user: { business: { isNot: null } } };
    } else if (targetRole === 'BUYERS') {
      whereClause = { user: { business: null } };
    }

    const deviceTokens = await prisma.deviceToken.findMany({
      where: whereClause,
      select: { id: true, fcmToken: true }
    });

    if (!deviceTokens || deviceTokens.length === 0) {
      return { success: true, delivered: 0 };
    }

    const tokens = deviceTokens.map((t) => t.fcmToken);

    // Process in batches of 500 (FCM limit per multicast)
    const batchSize = 500;
    let totalSuccess = 0;

    const stringifiedData = {};
    for (const [key, val] of Object.entries(data)) {
      stringifiedData[key] = String(val);
    }

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);
      const message = {
        notification: { title, body },
        data: stringifiedData,
        tokens: batchTokens
      };

      const response = await messaging.sendEachForMulticast(message);
      totalSuccess += response.successCount;
    }

    return { success: true, delivered: totalSuccess, totalTokens: tokens.length };
  } catch (error) {
    console.error('❌ Error sending broadcast FCM notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendToUser,
  sendToAllOrRole
};
