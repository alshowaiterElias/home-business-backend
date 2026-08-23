const adminService = require('../services/adminService');

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

const getPendingProducts = async (req, res, next) => {
  try {
    const products = await adminService.getPendingProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const products = await adminService.getAllProducts(req.query);
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

const deleteProduct = async (req, res, next) => {
  try {
    await adminService.deleteProductByAdmin(req.user.id, req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Valid role (USER or ADMIN) is required' });
    }

    const user = await adminService.updateUserRole(req.user.id, req.params.id, role);
    res.json({ success: true, data: user, message: 'User role updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(req.user.id, req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllBusinesses = async (req, res, next) => {
  try {
    const businesses = await adminService.getAllBusinesses();
    res.json({ success: true, data: businesses });
  } catch (error) {
    next(error);
  }
};

const toggleBusinessStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const business = await adminService.toggleBusinessStatus(req.user.id, req.params.id, Boolean(isActive));
    res.json({ success: true, data: business, message: 'Business status updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await adminService.getAllReviews();
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    await adminService.deleteReview(req.user.id, req.params.id);
    res.json({ success: true, message: 'Review deleted successfully' });
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

const sendBroadcastNotification = async (req, res, next) => {
  try {
    const { targetType, targetUserId, title, body, notificationType } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'العنوان ومحتوى الإشعار مطلوبان' });
    }

    const result = await adminService.broadcastPushNotification(req.user.id, {
      targetType: targetType || 'ALL',
      targetUserId,
      title,
      body,
      notificationType: notificationType || 'SYSTEM_ALERT'
    });

    res.json({ success: true, message: 'تم إرسال الإشعار بنجاح', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getBroadcastHistory = async (req, res, next) => {
  try {
    const history = await adminService.getBroadcastHistory();
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getPendingProducts,
  getAllProducts,
  approveProduct,
  rejectProduct,
  deleteProduct,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllBusinesses,
  toggleBusinessStatus,
  getAllReviews,
  deleteReview,
  getReports,
  resolveReport,
  getAuditLogs,
  sendBroadcastNotification,
  getBroadcastHistory
};
