const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { scanFiles } = require('../middlewares/fileScanner');
const cacheControl = require('../middlewares/cacheMiddleware');

// Protected routes MUST come before /:id to avoid "me" or "followed" being matched as an ID
router.get('/me/dashboard', protect, businessController.getMyDashboard);
router.get('/followed', protect, businessController.getFollowedStores);
router.post('/:id/follow', protect, businessController.toggleFollowStore);

router.post('/', protect, upload.single('logo'), scanFiles, businessController.createOrUpdateBusiness);
router.put('/', protect, upload.single('logo'), scanFiles, businessController.createOrUpdateBusiness);

// Public / optional authenticated routes
router.get('/', cacheControl(60), businessController.getAllBusinesses);
router.get('/:id', optionalProtect, businessController.getBusinessById);

module.exports = router;
