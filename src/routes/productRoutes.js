const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');
const { scanFiles } = require('../middlewares/fileScanner');
const cacheControl = require('../middlewares/cacheMiddleware');
const { validate, productSchemas } = require('../middlewares/validationMiddleware');

// Public routes (anyone can browse) - cached for 60 seconds
router.get('/', cacheControl(60), productController.getPublicProducts);
router.get('/:id', cacheControl(60), productController.getProductById);

// Protected routes (Requires login)
router.post('/', protect, upload.array('productImages', 5), scanFiles, validate(productSchemas.createProduct), productController.createProduct);

module.exports = router;
