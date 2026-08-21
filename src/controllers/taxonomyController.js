const taxonomyService = require('../services/taxonomyService');

const getLocations = async (req, res, next) => {
  try {
    const locations = await taxonomyService.getGovernoratesAndCities();
    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await taxonomyService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { nameAr, parentId, sortOrder, iconUrl } = req.body;
    if (!nameAr) {
      return res.status(400).json({ success: false, message: 'اسم التصنيف مطلوب' });
    }
    const category = await taxonomyService.createCategory({ nameAr, parentId, sortOrder, iconUrl });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    await taxonomyService.deleteCategory(req.params.id);
    res.json({ success: true, message: 'تم حذف التصنيف بنجاح' });
  } catch (error) {
    next(error);
  }
};

const createGovernorate = async (req, res, next) => {
  try {
    const { nameAr } = req.body;
    if (!nameAr) {
      return res.status(400).json({ success: false, message: 'اسم المحافظة مطلوب' });
    }
    const gov = await taxonomyService.createGovernorate(nameAr);
    res.status(201).json({ success: true, data: gov });
  } catch (error) {
    next(error);
  }
};

const deleteGovernorate = async (req, res, next) => {
  try {
    await taxonomyService.deleteGovernorate(req.params.id);
    res.json({ success: true, message: 'تم حذف المحافظة بنجاح' });
  } catch (error) {
    next(error);
  }
};

const createCity = async (req, res, next) => {
  try {
    const { governorateId, nameAr } = req.body;
    if (!governorateId || !nameAr) {
      return res.status(400).json({ success: false, message: 'المحافظة واسم المدينة مطلوبان' });
    }
    const city = await taxonomyService.createCity(governorateId, nameAr);
    res.status(201).json({ success: true, data: city });
  } catch (error) {
    next(error);
  }
};

const deleteCity = async (req, res, next) => {
  try {
    await taxonomyService.deleteCity(req.params.id);
    res.json({ success: true, message: 'تم حذف المدينة بنجاح' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLocations,
  getCategories,
  createCategory,
  deleteCategory,
  createGovernorate,
  deleteGovernorate,
  createCity,
  deleteCity
};
