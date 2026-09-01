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
    const currentUserId = req.user?.id || null;
    const business = await businessService.getBusinessById(req.params.id, currentUserId);
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

const toggleFollowStore = async (req, res, next) => {
  try {
    const result = await businessService.toggleFollowStore(req.user.id, req.params.id);
    res.json({
      success: true,
      data: result,
      message: result.isFollowed ? 'تمت متابعة المتجر بنجاح' : 'تم إلغاء متابعة المتجر'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getFollowedStores = async (req, res, next) => {
  try {
    const stores = await businessService.getFollowedStores(req.user.id);
    res.json({ success: true, data: stores });
  } catch (error) {
    next(error);
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
  toggleFollowStore,
  getFollowedStores,
  getAllBusinesses
};
