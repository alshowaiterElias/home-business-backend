const prisma = require('../config/db');

const getGovernoratesAndCities = async () => {
  return await prisma.governorate.findMany({
    include: {
      cities: true
    },
    orderBy: { nameAr: 'asc' }
  });
};

const getCategories = async () => {
  return await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      }
    },
    orderBy: { sortOrder: 'asc' }
  });
};

const createCategory = async (data) => {
  return await prisma.category.create({
    data: {
      nameAr: data.nameAr,
      parentId: data.parentId || null,
      iconUrl: data.iconUrl || null,
      sortOrder: data.sortOrder || 0
    }
  });
};

const deleteCategory = async (id) => {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { children: true }
  });

  if (!cat) {
    const error = new Error('التصنيف غير موجود');
    error.statusCode = 404;
    throw error;
  }

  // Collect category ID and all subcategory IDs
  const childIds = cat.children.map((c) => c.id);
  const categoryIdsToCheck = [id, ...childIds];

  // Count products attached to this category or its subcategories
  const productsCount = await prisma.product.count({
    where: {
      categoryId: { in: categoryIdsToCheck }
    }
  });

  if (productsCount > 0) {
    const error = new Error(
      `لا يمكن حذف التصنيف "${cat.nameAr}" لأنه يحتوي على (${productsCount}) منتج مرتبط به حالياً في التطبيق. يجب نقل أو حذف المنتجات أولاً.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Delete subcategories first if any (only reached if zero products exist)
  if (childIds.length > 0) {
    await prisma.category.deleteMany({
      where: { parentId: id }
    });
  }

  return await prisma.category.delete({ where: { id } });
};

const createGovernorate = async (nameAr) => {
  return await prisma.governorate.create({
    data: { nameAr }
  });
};

const deleteGovernorate = async (id) => {
  const gov = await prisma.governorate.findUnique({
    where: { id },
    include: { cities: true }
  });

  if (!gov) {
    const error = new Error('المحافظة غير موجودة');
    error.statusCode = 404;
    throw error;
  }

  // Check if any business is registered in any city of this governorate
  const businessesCount = await prisma.business.count({
    where: {
      city: { governorateId: id }
    }
  });

  if (businessesCount > 0) {
    const error = new Error(
      `لا يمكن حذف محافظة "${gov.nameAr}" لأن هناك (${businessesCount}) متجر/أسرة منتجة مسجلة في مدن هذه المحافظة.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Delete cities under governorate first
  await prisma.city.deleteMany({
    where: { governorateId: id }
  });

  return await prisma.governorate.delete({ where: { id } });
};

const createCity = async (governorateId, nameAr) => {
  return await prisma.city.create({
    data: { governorateId, nameAr }
  });
};

const deleteCity = async (id) => {
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) {
    const error = new Error('المدينة غير موجودة');
    error.statusCode = 404;
    throw error;
  }

  const businessesCount = await prisma.business.count({
    where: { cityId: id }
  });

  if (businessesCount > 0) {
    const error = new Error(
      `لا يمكن حذف مدينة "${city.nameAr}" لأن هناك (${businessesCount}) متجر/أسرة منتجة مسجلة فيها.`
    );
    error.statusCode = 400;
    throw error;
  }

  return await prisma.city.delete({ where: { id } });
};

const getUnitsOfSale = async () => {
  return await prisma.unitOfSale.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }]
  });
};

const createUnitOfSale = async (nameAr, sortOrder = 0) => {
  return await prisma.unitOfSale.create({
    data: { nameAr, sortOrder }
  });
};

const deleteUnitOfSale = async (id) => {
  const unit = await prisma.unitOfSale.findUnique({ where: { id } });
  if (!unit) {
    const error = new Error('وحدة البيع غير موجودة');
    error.statusCode = 404;
    throw error;
  }

  // Count products using this unit of sale string
  const productsCount = await prisma.product.count({
    where: { unitOfSale: unit.nameAr, deletedAt: null }
  });

  if (productsCount > 0) {
    const error = new Error(
      `لا يمكن حذف وحدة البيع "${unit.nameAr}" لأن هناك (${productsCount}) منتج تباع بهذه الوحدة حالياً في التطبيق.`
    );
    error.statusCode = 400;
    throw error;
  }

  return await prisma.unitOfSale.delete({ where: { id } });
};

module.exports = {
  getGovernoratesAndCities,
  getCategories,
  createCategory,
  deleteCategory,
  createGovernorate,
  deleteGovernorate,
  createCity,
  deleteCity,
  getUnitsOfSale,
  createUnitOfSale,
  deleteUnitOfSale
};
