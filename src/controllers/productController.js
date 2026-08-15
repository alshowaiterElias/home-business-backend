const productService = require('../services/productService');

const getPublicProducts = async (req, res, next) => {
  try {
    const products = await productService.getPublicProducts(req.query);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const createProduct = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one product image is required' });
    }
    const product = await productService.createProduct(req.user.id, req.body, req.files);
    res.status(201).json({ success: true, data: product, message: 'Product submitted for review successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicProducts,
  getProductById,
  createProduct
};
