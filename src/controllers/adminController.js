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

const suspendProduct = async (req, res, next) => {
  try {
    const product = await adminService.updateProductStatus(req.user.id, req.params.id, 'SUSPENDED');
    res.json({ success: true, data: product, message: 'Product suspended successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const requestProductRevision = async (req, res, next) => {
  try {
    const { revisionReason } = req.body;
    if (!revisionReason) return res.status(400).json({ success: false, message: 'ملاحظات التعديل مطلوبة' });

    const product = await adminService.updateProductStatus(req.user.id, req.params.id, 'NEEDS_REVISION', null, revisionReason);
    res.json({ success: true, data: product, message: 'تم إرسال طلب التعديل إلى التاجر بنجاح' });
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

const getConversationMessages = async (req, res, next) => {
  try {
    const messages = await adminService.getConversationMessages(req.user.id, req.params.id);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
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

const evolutionService = require('../services/evolutionService');

const getWhatsAppStatus = async (req, res, next) => {
  try {
    const status = await evolutionService.getInstanceStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getWhatsAppQR = async (req, res, next) => {
  try {
    const qrData = await evolutionService.getQRCode();
    res.json({ success: true, data: qrData });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getWhatsAppPairingCode = async (req, res, next) => {
  try {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }
    const data = await evolutionService.getPairingCode(phoneNumber);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createWhatsAppInstance = async (req, res, next) => {
  try {
    const { qrcode } = req.body;
    const data = await evolutionService.createInstance(qrcode !== false);
    res.json({ success: true, message: 'تم إنشاء الجلسة بنجاح', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteWhatsAppInstance = async (req, res, next) => {
  try {
    const data = await evolutionService.deleteInstance();
    res.json({ success: true, message: 'تم حذف الجلسة وإعادة الضبط بنجاح', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const sendWhatsAppTestMessage = async (req, res, next) => {
  try {
    const { phoneNumber, text } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'رقم المستلم مطلوب' });
    }
    const data = await evolutionService.sendTestMessage(phoneNumber, text);
    res.json({ success: true, message: 'تم إرسال الرسالة التجريبية بنجاح عبر الواتساب! ✅', data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getSettings = async (req, res, next) => {
  try {
    const settings = await adminService.getSystemSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const settings = await adminService.updateSystemSettings(req.user.id, req.body);
    res.json({ success: true, data: settings, message: 'تم تحديث إعدادات النظام بنجاح ✨' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleProductFeatured = async (req, res, next) => {
  try {
    const { isFeatured } = req.body;
    const product = await adminService.toggleProductFeatured(req.user.id, req.params.id, Boolean(isFeatured));
    res.json({
      success: true,
      data: product,
      message: isFeatured ? 'تم تمييز المنتج بنجاح في الصفحة الرئيسية ⭐' : 'تم إلغاء تمييز المنتج'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const toggleBusinessFeatured = async (req, res, next) => {
  try {
    const { isFeatured } = req.body;
    const business = await adminService.toggleBusinessFeatured(req.user.id, req.params.id, Boolean(isFeatured));
    res.json({
      success: true,
      data: business,
      message: isFeatured ? 'تم تمييز المتجر بنجاح في الصفحة الرئيسية ⭐' : 'تم إلغاء تمييز المتجر'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getPendingProducts,
  getAllProducts,
  approveProduct,
  rejectProduct,
  suspendProduct,
  requestProductRevision,
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
  getBroadcastHistory,
  getWhatsAppStatus,
  getWhatsAppQR,
  getWhatsAppPairingCode,
  createWhatsAppInstance,
  deleteWhatsAppInstance,
  sendWhatsAppTestMessage,
  getSettings,
  updateSettings,
  toggleProductFeatured,
  toggleBusinessFeatured,
  getConversationMessages
};
