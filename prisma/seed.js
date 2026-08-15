const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with comprehensive data...');

  // Clean up existing data to prevent unique constraint errors
  await prisma.adminAuditLog.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.favoriteProduct.deleteMany();
  await prisma.report.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.business.deleteMany();
  await prisma.city.deleteMany();
  await prisma.governorate.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Governorates and Cities
  console.log('Seeding Locations...');
  const sanaa = await prisma.governorate.create({
    data: {
      nameAr: 'صنعاء',
      cities: {
        create: [{ nameAr: 'معين' }, { nameAr: 'السبعين' }, { nameAr: 'الوحدة' }]
      }
    },
    include: { cities: true }
  });

  const aden = await prisma.governorate.create({
    data: {
      nameAr: 'عدن',
      cities: {
        create: [{ nameAr: 'كريتر' }, { nameAr: 'المنصورة' }, { nameAr: 'الشيخ عثمان' }]
      }
    },
    include: { cities: true }
  });

  const taiz = await prisma.governorate.create({
    data: {
      nameAr: 'تعز',
      cities: {
        create: [{ nameAr: 'المظفر' }, { nameAr: 'القاهرة' }, { nameAr: 'صالة' }]
      }
    },
    include: { cities: true }
  });

  // 2. Seed Categories
  console.log('Seeding Categories...');
  const foodCategory = await prisma.category.create({
    data: {
      nameAr: 'مأكولات',
      iconUrl: '/uploads/categories/food.png',
      sortOrder: 1,
      children: {
        create: [
          { nameAr: 'حلويات', sortOrder: 1 },
          { nameAr: 'معجنات', sortOrder: 2 },
          { nameAr: 'وجبات رئيسية', sortOrder: 3 }
        ]
      }
    },
    include: { children: true }
  });

  const clothesCategory = await prisma.category.create({
    data: {
      nameAr: 'ملابس',
      iconUrl: '/uploads/categories/clothes.png',
      sortOrder: 2,
      children: {
        create: [
          { nameAr: 'نسائي', sortOrder: 1 },
          { nameAr: 'أطفال', sortOrder: 2 }
        ]
      }
    },
    include: { children: true }
  });

  // 3. Seed Users & Businesses
  console.log('Seeding Users & Businesses...');
  const seller1 = await prisma.user.create({
    data: {
      phoneNumber: '+967770000001',
      isVerified: true,
      role: 'USER',
      business: {
        create: {
          businessName: 'مطبخ أم محمد',
          description: 'أشهى المأكولات والحلويات المنزلية بنكهة يمنية أصيلة',
          contactPhone: '+967770000001',
          cityId: sanaa.cities[0].id,
          addressDetails: 'شارع الستين، خلف سوبر ماركت الهدى',
          logoUrl: '/uploads/businesses/logo1.png'
        }
      }
    },
    include: { business: true }
  });

  const seller2 = await prisma.user.create({
    data: {
      phoneNumber: '+967770000002',
      isVerified: true,
      role: 'USER',
      business: {
        create: {
          businessName: 'أناقة عدن',
          description: 'تفصيل وخياطة الملابس النسائية وملابس الأطفال',
          contactPhone: '+967770000002',
          cityId: aden.cities[1].id, // المنصورة
          addressDetails: 'المنصورة، شارع السجن',
          logoUrl: '/uploads/businesses/logo2.png'
        }
      }
    },
    include: { business: true }
  });

  // 4. Seed Products
  console.log('Seeding Products...');
  const sweetsCategory = foodCategory.children.find(c => c.nameAr === 'حلويات');
  const womenClothes = clothesCategory.children.find(c => c.nameAr === 'نسائي');

  await prisma.product.create({
    data: {
      businessId: seller1.business.id,
      categoryId: sweetsCategory.id,
      title: 'كيكة الشوكولاتة الفاخرة',
      description: 'كيكة شوكولاتة غنية مع صلصة الشوكولاتة الخاصة، تكفي لـ 8 أشخاص',
      price: 6000,
      currency: 'YER',
      unitOfSale: 'حبة',
      status: 'APPROVED',
      averageRating: 4.8,
      reviewsCount: 12,
      images: {
        create: [
          { imageUrl: '/uploads/products/cake1.jpg', isCover: true, sortOrder: 1 },
          { imageUrl: '/uploads/products/cake2.jpg', isCover: false, sortOrder: 2 }
        ]
      }
    }
  });

  await prisma.product.create({
    data: {
      businessId: seller2.business.id,
      categoryId: womenClothes.id,
      title: 'فستان قطني مشجر',
      description: 'فستان من القطن الناعم مريح للبيت متوفر بعدة ألوان',
      price: 8000,
      currency: 'YER',
      unitOfSale: 'قطعة',
      status: 'APPROVED',
      averageRating: 4.5,
      reviewsCount: 5,
      images: {
        create: [
          { imageUrl: '/uploads/products/dress1.jpg', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // 5. Seed normal user (buyer)
  await prisma.user.create({
    data: {
      phoneNumber: '+967770000003',
      isVerified: true,
      role: 'USER'
    }
  });

  // 6. Seed Admin user
  await prisma.user.create({
    data: {
      phoneNumber: '+967770000999',
      isVerified: true,
      role: 'ADMIN'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
