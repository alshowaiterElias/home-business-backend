const userService = require('../services/userService');

const saveDeviceToken = async (req, res, next) => {
  try {
    const { fcmToken, devicePlatform } = req.body;
    
    if (!fcmToken || !devicePlatform) {
      return res.status(400).json({ success: false, message: 'fcmToken and devicePlatform are required' });
    }

    const tokenRecord = await userService.saveDeviceToken(req.user.id, fcmToken, devicePlatform);
    res.json({ success: true, data: tokenRecord, message: 'Device token registered successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await userService.requestAccountDeletion(req.user.id, reason);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { saveDeviceToken, getProfile, deleteAccount };
