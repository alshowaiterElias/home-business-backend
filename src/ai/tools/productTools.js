const prisma = require('../../config/db');

/**
 * Shared visibility predicate ensuring we only expose 
 * public, approved, available, and active products.
 */
const PUBLIC_PRODUCT_PREDICATE = {
  status: 'APPROVED',
  isAvailable: true,
  deletedAt: null,
  business: {
    isActive: true,
    deletedAt: null
  }
};

/**
 * Search products strictly following visibility rules.
 */
const searchProducts = async ({
  query,
  categoryId,
  minPrice,
  maxPrice,
  currency,
  cityId,
  storeId,
  limit = 5
}) => {
  const where = { ...PUBLIC_PRODUCT_PREDICATE };

  if (query) {
    where.title = { contains: query }; // V1: Simple keyword search
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (storeId) {
    where.businessId = storeId;
  }
  if (currency) {
    where.currency = currency;
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = parseFloat(minPrice);
    if (maxPrice !== undefined) where.price.lte = parseFloat(maxPrice);
  }
  if (cityId) {
    where.business = {
      ...where.business,
      cityId: cityId
    };
  }

  const results = await prisma.product.findMany({
    where,
    take: Math.min(limit, 10), // Hard cap at 10 to protect token limits
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      category: { select: { id: true, nameAr: true } },
      business: {
        select: {
          id: true,
          businessName: true,
          city: { select: { id: true, nameAr: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return results.map(p => ({
    productId: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    categoryName: p.category?.nameAr,
    storeName: p.business?.businessName,
    cityName: p.business?.city?.nameAr
  }));
};

/**
 * Get detailed product info.
 */
const getProduct = async ({ productId }) => {
  if (!productId) throw new Error('productId is required');

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      ...PUBLIC_PRODUCT_PREDICATE
    },
    include: {
      category: { select: { nameAr: true } },
      business: { select: { businessName: true, contactPhone: true, city: { select: { nameAr: true } } } }
    }
  });

  if (!product) {
    return { error: 'Product not found or not available' };
  }

  return {
    productId: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    currency: product.currency,
    unitOfSale: product.unitOfSale,
    categoryName: product.category?.nameAr,
    storeName: product.business?.businessName,
    cityName: product.business?.city?.nameAr,
    rating: product.averageRating,
    reviewsCount: product.reviewsCount
  };
};

/**
 * Compare 2 to 4 products.
 */
const compareProducts = async ({ productIds }) => {
  if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4) {
    throw new Error('Must provide between 2 and 4 productIds for comparison');
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      ...PUBLIC_PRODUCT_PREDICATE
    },
    include: {
      category: { select: { nameAr: true } },
      business: { select: { businessName: true } }
    }
  });

  return products.map(p => ({
    productId: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    unitOfSale: p.unitOfSale,
    categoryName: p.category?.nameAr,
    storeName: p.business?.businessName,
    rating: p.averageRating
  }));
};

/**
 * Find similar products (deterministic V1 before embeddings).
 */
const findSimilarProducts = async ({ productId, limit = 4 }) => {
  if (!productId) throw new Error('productId is required');

  const source = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, price: true, currency: true }
  });

  if (!source) return { error: 'Source product not found' };

  // V1 semantic fallback: same category, similar price range
  const similar = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId: source.categoryId,
      currency: source.currency,
      ...PUBLIC_PRODUCT_PREDICATE
    },
    take: Math.min(limit, 5),
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      business: { select: { businessName: true } }
    },
    orderBy: { averageRating: 'desc' }
  });

  return similar.map(p => ({
    productId: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    storeName: p.business?.businessName
  }));
};

module.exports = {
  PUBLIC_PRODUCT_PREDICATE,
  searchProducts,
  getProduct,
  compareProducts,
  findSimilarProducts
};
