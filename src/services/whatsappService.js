const prisma = require('../config/db');

const getTemplateByType = async (type) => {
  return await prisma.whatsAppTemplate.findUnique({
    where: { type }
  });
};

const getAllTemplates = async () => {
  return await prisma.whatsAppTemplate.findMany();
};

const upsertTemplate = async (type, content) => {
  return await prisma.whatsAppTemplate.upsert({
    where: { type },
    update: { content },
    create: { type, content }
  });
};

module.exports = {
  getTemplateByType,
  getAllTemplates,
  upsertTemplate
};
