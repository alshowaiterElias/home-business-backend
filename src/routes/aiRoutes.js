const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');

// Route requires user to be logged in
router.post('/generate-ad', protect, aiController.generateProductAd);

module.exports = router;
