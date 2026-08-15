const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { scanFiles } = require('../middlewares/fileScanner');
const cacheControl = require('../middlewares/cacheMiddleware');

// Protected routes MUST come before /:id to avoid "me" being matched as an ID
router.get('/me/dashboard', protect, businessController.getMyDashboard);
router.post('/', protect, upload.single('logo'), scanFiles, businessController.createOrUpdateBusiness);
router.put('/', protect, upload.single('logo'), scanFiles, businessController.createOrUpdateBusiness);

// Public routes
router.get('/', cacheControl(60), businessController.getAllBusinesses);
router.get('/:id', cacheControl(60), businessController.getBusinessById);

module.exports = router;
