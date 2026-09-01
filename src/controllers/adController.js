const adService = require('../services/adService');

const getPublicAds = async (req, res, next) => {
  try {
    const ads = await adService.getActiveAds();
    res.json({ success: true, data: ads });
  } catch (error) {
    next(error);
  }
};

const getAdminAds = async (req, res, next) => {
  try {
    const ads = await adService.getAllAdsForAdmin();
    res.json({ success: true, data: ads });
  } catch (error) {
    next(error);
  }
};

const createAd = async (req, res, next) => {
  try {
    const ad = await adService.createAd(req.body, req.file);
    res.status(201).json({
      success: true,
      message: 'Advertisement created successfully',
      data: ad,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleAdStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const ad = await adService.toggleAdStatus(req.params.id, isActive);
    res.json({
      success: true,
      message: 'Advertisement status updated',
      data: ad,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteAd = async (req, res, next) => {
  try {
    await adService.deleteAd(req.params.id);
    res.json({
      success: true,
      message: 'Advertisement deleted successfully',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicAds,
  getAdminAds,
  createAd,
  toggleAdStatus,
  deleteAd,
};
