const prisma = require('../config/db');
const aiService = require('../services/aiService');

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

module.exports = {
  generateProductAd
};
