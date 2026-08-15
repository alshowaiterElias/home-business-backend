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

module.exports = {
  getLocations,
  getCategories
};
