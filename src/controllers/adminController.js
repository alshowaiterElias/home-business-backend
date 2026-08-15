const adminService = require('../services/adminService');

const getPendingProducts = async (req, res, next) => {
  try {
    const products = await adminService.getPendingProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const approveProduct = async (req, res, next) => {
  try {
    const product = await adminService.updateProductStatus(req.user.id, req.params.id, 'APPROVED');
    res.json({ success: true, data: product, message: 'Product approved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const rejectProduct = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const product = await adminService.updateProductStatus(req.user.id, req.params.id, 'REJECTED', rejectionReason);
    res.json({ success: true, data: product, message: 'Product rejected successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getReports = async (req, res, next) => {
  try {
    const reports = await adminService.getReports();
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    const report = await adminService.resolveReport(req.user.id, req.params.id);
    res.json({ success: true, data: report, message: 'Report resolved successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await adminService.getAuditLogs();
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingProducts,
  approveProduct,
  rejectProduct,
  getReports,
  resolveReport,
  getAuditLogs
};
