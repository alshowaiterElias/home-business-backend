const prisma = require('../config/db');

const getPublicProducts = async (filters = {}) => {
  const { categoryId, governorateId, search, minPrice, maxPrice, minRating, featured, limit = 50, page = 1 } = filters;
  
  let whereClause = {
    status: 'APPROVED',
    isAvailable: true,
    business: {
      isActive: true
    }
  };

  if (featured === 'true' || featured === true) {
    whereClause.isFeatured = true;
  }

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: true }
    });
    if (category && category.children && category.children.length > 0) {
      const ids = [categoryId, ...category.children.map(c => c.id)];
      whereClause.categoryId = { in: ids };
    } else {
      whereClause.categoryId = categoryId;
    }
  }

  if (governorateId) {
    whereClause.business = {
      isActive: true,
      city: { governorateId: governorateId }
    };
  }

  if (search) {
    whereClause.title = { contains: search };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    whereClause.price = {};
    if (minPrice !== undefined) whereClause.price.gte = parseFloat(minPrice);
    if (maxPrice !== undefined) whereClause.price.lte = parseFloat(maxPrice);
  }

  if (minRating !== undefined) {
    whereClause.averageRating = { gte: parseFloat(minRating) };
  }

  const take = parseInt(limit, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  let products = await prisma.product.findMany({
    where: whereClause,
    take: take,
    skip: skip,
    include: {
      business: {
        include: { city: true }
      },
      images: {
        orderBy: { sortOrder: 'asc' }
      },
      category: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fallback: If featured filter was requested but no featured products exist in DB, fallback to top products
  if ((featured === 'true' || featured === true) && products.length === 0) {
    delete whereClause.isFeatured;
    products = await prisma.product.findMany({
      where: whereClause,
      take: take,
      skip: skip,
      include: {
        business: {
          include: { city: true }
        },
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        category: true
      },
      orderBy: [
        { averageRating: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  return products;
};

const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id, status: 'APPROVED' },
    include: {
      business: {
        include: { city: { include: { governorate: true } } }
      },
      images: {
        orderBy: { sortOrder: 'asc' }
      },
      reviews: {
        include: { user: { select: { id: true, phoneNumber: true } } },
        orderBy: { createdAt: 'desc' }
      },
      category: true
    }
  });

  if (!product || !product.business || !product.business.isActive) {
    throw new Error('Product not found or business is suspended');
  }
  return product;
};

const { uploadToFirebase } = require('./storageService');

const createProduct = async (userId, data, imageFiles) => {
  // 1. Get user's business
  const business = await prisma.business.findUnique({ where: { userId } });
  if (!business) {
    throw new Error('You must create a business profile before uploading products');
  }

  if (!business.isActive) {
    throw new Error('حسابك معطل حالياً من قبل الإدارة. لا يمكنك إضافة منتجات جديدة.');
  }

  // 1.5 Validate category
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category || !category.isActive) {
    throw new Error('Invalid or inactive category selected');
  }

  // 2. Prepare images data (Upload to Firebase Cloud Storage)
  const images = await Promise.all(
    imageFiles.map(async (file, index) => {
      const publicUrl = await uploadToFirebase(file.buffer, file.originalname, file.mimetype, 'products');
      return {
        imageUrl: publicUrl,
        isCover: index === 0, // First image is cover by default
        sortOrder: index + 1
      };
    })
  );

  // 3. Create product (Status is PENDING by default)
  const product = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      price: parseFloat(data.price),
      currency: data.currency || 'YER',
      unitOfSale: data.unitOfSale,
      status: 'PENDING', 
      images: {
        create: images
      }
    },
    include: {
      images: true
    }
  });

  return product;
};

module.exports = {
  getPublicProducts,
  getProductById,
  createProduct
};
