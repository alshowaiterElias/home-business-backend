const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/favorite', protect, interactionController.toggleFavorite);
router.get('/favorites', protect, interactionController.getUserFavorites);

router.post('/review', protect, interactionController.addReview);
router.post('/report', protect, interactionController.submitReport);

module.exports = router;
