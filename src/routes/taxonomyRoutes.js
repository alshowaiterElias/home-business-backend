const express = require('express');
const router = express.Router();
const taxonomyController = require('../controllers/taxonomyController');
const cacheControl = require('../middlewares/cacheMiddleware');
const { protect, admin } = require('../middlewares/authMiddleware');

// Public GET routes
router.get('/locations', cacheControl(300), taxonomyController.getLocations);
router.get('/categories', cacheControl(300), taxonomyController.getCategories);
router.get('/units', cacheControl(300), taxonomyController.getUnits);

// Category Management
router.post('/categories', protect, admin, taxonomyController.createCategory);
router.delete('/categories/:id', protect, admin, taxonomyController.deleteCategory);

// Unit of Sale Management
router.post('/units', protect, admin, taxonomyController.createUnit);
router.delete('/units/:id', protect, admin, taxonomyController.deleteUnit);

// Governorate Management
router.post('/governorates', protect, admin, taxonomyController.createGovernorate);
router.delete('/governorates/:id', protect, admin, taxonomyController.deleteGovernorate);

// City Management
router.post('/cities', protect, admin, taxonomyController.createCity);
router.delete('/cities/:id', protect, admin, taxonomyController.deleteCity);

module.exports = router;
