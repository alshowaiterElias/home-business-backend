const express = require('express');
const router = express.Router();
const taxonomyController = require('../controllers/taxonomyController');
const cacheControl = require('../middlewares/cacheMiddleware');

// Cache taxonomy data for 5 minutes since they rarely change
router.get('/locations', cacheControl(300), taxonomyController.getLocations);
router.get('/categories', cacheControl(300), taxonomyController.getCategories);

module.exports = router;
