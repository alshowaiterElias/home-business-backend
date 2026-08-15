const businessService = require('../services/businessService');

const createOrUpdateBusiness = async (req, res, next) => {
  try {
    const business = await businessService.createOrUpdateBusiness(req.user.id, req.body, req.file);
    res.json({ success: true, data: business, message: 'Business profile saved' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getBusinessById = async (req, res, next) => {
  try {
    const business = await businessService.getBusinessById(req.params.id);
    res.json({ success: true, data: business });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const getMyDashboard = async (req, res, next) => {
  try {
    const business = await businessService.getBusinessByUserId(req.user.id);
    res.json({ success: true, data: business });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const getAllBusinesses = async (req, res, next) => {
  try {
    const businesses = await businessService.getAllBusinesses(req.query);
    res.json({ success: true, data: businesses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateBusiness,
  getBusinessById,
  getMyDashboard,
  getAllBusinesses
};
