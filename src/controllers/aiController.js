const prisma = require('../config/db');
const aiService = require('../services/aiService');
const { resolveAiContext } = require('../ai/context/resolveAiContext');
const { runMarketplaceAssistant } = require('../ai/aiOrchestrator');

/**
 * Generate AI Marketing Ad for a specific product
 */
const generateProductAd = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'معرف المنتج (productId) مطلوب' });
    }

    // Fetch product details from DB
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { nameAr: true } },
        business: { select: { businessName: true } }
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const productInfo = {
      title: product.title,
      price: product.price,
      currency: product.currency || 'YER',
      unit: product.unit || '',
      description: product.description || '',
      category: product.category?.nameAr || 'عام',
      businessName: product.business?.businessName || 'السوق المنزلي'
    };

    const result = await aiService.generateProductAds(productInfo);

    res.json({
      success: true,
      message: 'تم صياغة الإعلانات التسويقية بنجاح ✨',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const askAssistant = async (req, res, next) => {
  try {
    if (process.env.AI_ENABLED !== 'true') {
      return res.status(503).json({ success: false, message: 'المساعد غير متاح مؤقتاً' });
    }

    const { message, context, clientRequestId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // 1. Resolve & Secure Context
    const resolvedContext = await resolveAiContext(req.user.id, context);

    // 2. Run Orchestrator
    const result = await runMarketplaceAssistant(resolvedContext, message);

    res.json({
      success: true,
      data: {
        ...result,
        clientRequestId // Echo back if provided
      }
    });
  } catch (error) {
    // If it's a known validation error from resolveAiContext, return 422
    if (error.message.includes('not currently available') || error.message.includes('Invalid screen')) {
      return res.status(422).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  generateProductAd,
  askAssistant
};
