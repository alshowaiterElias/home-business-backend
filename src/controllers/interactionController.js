const interactionService = require('../services/interactionService');

const toggleFavorite = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID is required' });
    
    const result = await interactionService.toggleFavorite(req.user.id, productId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getUserFavorites = async (req, res, next) => {
  try {
    const favorites = await interactionService.getUserFavorites(req.user.id);
    res.json({ success: true, data: favorites });
  } catch (error) {
    next(error);
  }
};

const addReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    if (!productId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Product ID and valid rating (1-5) are required' });
    }

    const review = await interactionService.addReview(req.user.id, productId, rating, comment);
    res.json({ success: true, data: review, message: 'Review added successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const submitReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ success: false, message: 'targetType, targetId, and reason are required' });
    }

    const report = await interactionService.submitReport(req.user.id, targetType, targetId, reason);
    res.status(201).json({ success: true, data: report, message: 'Report submitted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { toggleFavorite, getUserFavorites, addReview, submitReport };
