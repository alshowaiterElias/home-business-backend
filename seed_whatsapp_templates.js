const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultTemplates = [
  {
    type: 'PRODUCT_INQUIRY',
    content: "مرحباً متجر {{store_name}}،\n\nأنا مهتم بالمنتج التالي:\nاسم المنتج: {{product_name}}\nصورة المنتج: {{image_url}}\n\nهل يمكنك توفير المزيد من المعلومات؟"
  },
  {
    type: 'STORE_INQUIRY',
    content: "مرحباً متجر {{store_name}}،\n\nأود الاستفسار عن خدماتكم ومنتجاتكم. هل يمكنك تزويدي بمزيد من التفاصيل؟"
  }
];

async function main() {
  for (const template of defaultTemplates) {
    await prisma.whatsAppTemplate.upsert({
      where: { type: template.type },
      update: {},
      create: template,
    });
  }
  console.log('WhatsApp templates seeded successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
