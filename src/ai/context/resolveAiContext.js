const prisma = require('../../config/db');
const { assertConversationParticipant } = require('../../services/chatService');

/**
 * Validates and resolves the user-provided context for AI generation.
 * It ignores user-provided text descriptions of products/stores and verifies IDs against MySQL.
 * 
 * @param {string} userId - The authenticated user ID making the AI request.
 * @param {Object} rawContext - The client-provided context object.
 * @param {string} rawContext.screen - The current screen enum (e.g. 'home', 'search', 'product_details', 'store_details', 'conversation').
 * @param {string} [rawContext.productId] - Optional product ID to resolve.
 * @param {string} [rawContext.storeId] - Optional store ID to resolve.
 * @param {string} [rawContext.conversationId] - Optional conversation ID.
 * @param {string} [rawContext.searchQuery] - Optional active search query.
 * @returns {Promise<Object>} A resolved and verified context object to be sent to the orchestrator.
 */
const resolveAiContext = async (userId, rawContext) => {
  if (!rawContext || typeof rawContext !== 'object') {
    throw new Error('Context object is required');
  }

  const { screen, productId, storeId, conversationId, searchQuery } = rawContext;
  
  const allowedScreens = ['home', 'search', 'product_details', 'store_details', 'conversation'];
  if (!allowedScreens.includes(screen)) {
    throw new Error(`Invalid screen context: ${screen}`);
  }

  const resolved = { screen };
  if (searchQuery && typeof searchQuery === 'string') {
    resolved.searchQuery = searchQuery.trim().substring(0, 200); // Sanitize and limit
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        status: true,
        isAvailable: true,
        deletedAt: true,
        business: {
          select: { id: true, businessName: true, isActive: true, deletedAt: true }
        }
      }
    });

    if (!product || product.deletedAt || product.status !== 'APPROVED' || !product.isAvailable ||
        !product.business || !product.business.isActive || product.business.deletedAt) {
      throw new Error('Referenced product is not currently available or does not exist');
    }

    resolved.product = {
      id: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency,
      storeName: product.business.businessName
    };
  }

  if (storeId) {
    const store = await prisma.business.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        businessName: true,
        isActive: true,
        deletedAt: true
      }
    });

    if (!store || !store.isActive || store.deletedAt) {
      throw new Error('Referenced store is not currently available or does not exist');
    }

    resolved.store = {
      id: store.id,
      name: store.businessName
    };
  }

  if (conversationId) {
    // strict check: user must be an active participant
    await assertConversationParticipant(conversationId, userId);
    resolved.conversationId = conversationId;
  }

  return resolved;
};

module.exports = {
  resolveAiContext
};
