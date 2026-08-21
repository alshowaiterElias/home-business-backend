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
  return await prisma.category.delete({ where: { id } });
};

const createGovernorate = async (nameAr) => {
  return await prisma.governorate.create({
    data: { nameAr }
  });
};

const deleteGovernorate = async (id) => {
  return await prisma.governorate.delete({ where: { id } });
};

const createCity = async (governorateId, nameAr) => {
  return await prisma.city.create({
    data: { governorateId, nameAr }
  });
};

const deleteCity = async (id) => {
  return await prisma.city.delete({ where: { id } });
};

module.exports = {
  getGovernoratesAndCities,
  getCategories,
  createCategory,
  deleteCategory,
  createGovernorate,
  deleteGovernorate,
  createCity,
  deleteCity
};
