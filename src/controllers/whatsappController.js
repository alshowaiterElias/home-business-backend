const whatsappService = require('../services/whatsappService');

const getTemplates = async (req, res, next) => {
  try {
    const templates = await whatsappService.getAllTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

const getTemplateByType = async (req, res, next) => {
  try {
    const template = await whatsappService.getTemplateByType(req.params.type);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

const updateTemplate = async (req, res, next) => {
  try {
    const { content } = req.body;
    const { type } = req.params;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }
    const template = await whatsappService.upsertTemplate(type, content);
    res.json({ success: true, data: template, message: 'Template updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTemplates,
  getTemplateByType,
  updateTemplate
};
