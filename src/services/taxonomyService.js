const prisma = require('../config/db');

const getGovernoratesAndCities = async () => {
  return await prisma.governorate.findMany({
    include: {
      cities: true
    }
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

module.exports = {
  getGovernoratesAndCities,
  getCategories
};
