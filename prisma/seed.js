const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // 1. Clean up existing tables in correct order to avoid FK constraint errors
  console.log('🧹 Cleaning up old data...');
  await prisma.adminAuditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.report.deleteMany();
  await prisma.favoriteProduct.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.business.deleteMany();
  await prisma.city.deleteMany();
  await prisma.governorate.deleteMany();
  await prisma.whatsAppTemplate.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleanup completed.');

  // 2. Seed Governorates and Cities (Yemen Region Taxonomy)
  console.log('📍 Seeding Governorates & Cities...');
  const sanaa = await prisma.governorate.create({
    data: {
      nameAr: 'صنعاء',
      cities: {
        create: [
          { nameAr: 'معين' },
          { nameAr: 'السبعين' },
          { nameAr: 'الوحدة' },
          { nameAr: 'الصافية' },
          { nameAr: 'الثورة' }
        ]
      }
    },
    include: { cities: true }
  });

  const aden = await prisma.governorate.create({
    data: {
      nameAr: 'عدن',
      cities: {
        create: [
          { nameAr: 'المنصورة' },
          { nameAr: 'كريتر' },
          { nameAr: 'الشيخ عثمان' },
          { nameAr: 'خور مكسر' }
        ]
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

  const hadramout = await prisma.governorate.create({
    data: {
      nameAr: 'حضرموت',
      cities: {
        create: [{ nameAr: 'المكلا' }, { nameAr: 'سيئون' }]
      }
    },
    include: { cities: true }
  });

  const ibb = await prisma.governorate.create({
    data: {
      nameAr: 'إب',
      cities: {
        create: [{ nameAr: 'الظهار' }, { nameAr: 'المشنة' }]
      }
    },
    include: { cities: true }
  });

  console.log('✅ Governorates & Cities seeded.');

  // 3. Seed Categories & Subcategories
  console.log('🏷️ Seeding Categories...');
  const foodCategory = await prisma.category.create({
    data: {
      nameAr: 'مأكولات ومشروبات منزلية',
      iconUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500',
      sortOrder: 1,
      children: {
        create: [
          { nameAr: 'حلويات ومعجنات', sortOrder: 1 },
          { nameAr: 'وجبات يمنية شعبية', sortOrder: 2 },
          { nameAr: 'مشروبات وعصائر', sortOrder: 3 },
          { nameAr: 'بهارات ومكسرات', sortOrder: 4 }
        ]
      }
    },
    include: { children: true }
  });

  const fashionCategory = await prisma.category.create({
    data: {
      nameAr: 'أزياء وخياطة',
      iconUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=500',
      sortOrder: 2,
      children: {
        create: [
          { nameAr: 'فساتين وجلابيات', sortOrder: 1 },
          { nameAr: 'ملابس أطفال', sortOrder: 2 },
          { nameAr: 'عبايات وشالات', sortOrder: 3 }
        ]
      }
    },
    include: { children: true }
  });

  const perfumesCategory = await prisma.category.create({
    data: {
      nameAr: 'عطور وبخور يمني',
      iconUrl: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=500',
      sortOrder: 3,
      children: {
        create: [
          { nameAr: 'بخور وعود فاخر', sortOrder: 1 },
          { nameAr: 'عطور وخمريات', sortOrder: 2 }
        ]
      }
    },
    include: { children: true }
  });

  const craftsCategory = await prisma.category.create({
    data: {
      nameAr: 'حرف وهدايا يمنية',
      iconUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500',
      sortOrder: 4,
      children: {
        create: [
          { nameAr: 'مشغولات يدوية', sortOrder: 1 },
          { nameAr: 'توزيعات وهدايا مناسبات', sortOrder: 2 }
        ]
      }
    },
    include: { children: true }
  });

  console.log('✅ Categories seeded.');

  // Extract subcategory references
  const catSweets = foodCategory.children.find((c) => c.nameAr === 'حلويات ومعجنات');
  const catYemeniMeals = foodCategory.children.find((c) => c.nameAr === 'وجبات يمنية شعبية');
  const catSpices = foodCategory.children.find((c) => c.nameAr === 'بهارات ومكسرات');
  const catDresses = fashionCategory.children.find((c) => c.nameAr === 'فساتين وجلابيات');
  const catKids = fashionCategory.children.find((c) => c.nameAr === 'ملابس أطفال');
  const catBakhour = perfumesCategory.children.find((c) => c.nameAr === 'بخور وعود فاخر');
  const catPerfumes = perfumesCategory.children.find((c) => c.nameAr === 'عطور وخمريات');
  const catCrafts = craftsCategory.children.find((c) => c.nameAr === 'مشغولات يدوية');

  // 4. Seed Users (Admins, Sellers, Buyers)
  console.log('👥 Seeding Users & Home Businesses...');

  // Admins
  const admin1 = await prisma.user.create({
    data: {
      phoneNumber: '+967772546343',
      isVerified: true,
      role: 'ADMIN'
    }
  });

  const admin2 = await prisma.user.create({
    data: {
      phoneNumber: '+967770000999',
      isVerified: true,
      role: 'ADMIN'
    }
  });

  // Seller 1: Kitchen Um Ahmed (Sana'a)
  const seller1 = await prisma.user.create({
    data: {
      phoneNumber: '+967770000000', // Test phone number
      isVerified: true,
      role: 'USER',
      business: {
        create: {
          businessName: 'مطبخ أم أحمد للمأكولات والحلويات',
          description: 'نقدم لكم أشهى الأطباق اليمنية الاصيلة والحلويات المنزلية الطازجة يومياً بأعلى معايير النظافة والجودة.',
          contactPhone: '+967770000000',
          cityId: sanaa.cities[0].id, // معين
          addressDetails: 'صنعاء - حي معين - بجانب مركز السعيد',
          logoUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500'
        }
      }
    },
    include: { business: true }
  });

  // Seller 2: Yemen Perfumes & Bakhour (Aden)
  const seller2 = await prisma.user.create({
    data: {
      phoneNumber: '+967771234567',
      isVerified: true,
      role: 'USER',
      business: {
        create: {
          businessName: 'بخور وعطور بنت اليمن',
          description: 'صناعة منزلية عريقة لأرقى أنواع البخور العدني والخمريات والعطور الشرقية ذات الثبات العالي.',
          contactPhone: '+967771234567',
          cityId: aden.cities[0].id, // المنصورة
          addressDetails: 'عدن - المنصورة - قرب كورنيش كود النمر',
          logoUrl: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=500'
        }
      }
    },
    include: { business: true }
  });

  // Seller 3: Fashion House (Taiz)
  const seller3 = await prisma.user.create({
    data: {
      phoneNumber: '+967772345678',
      isVerified: true,
      role: 'USER',
      business: {
        create: {
          businessName: 'لمسة خياطة وأناقة',
          description: 'تصميم وتفصيل أحدث موديلات الفساتين والجلابيات التراثية والعصرية بلمسات يدوية دقيقة.',
          contactPhone: '+967772345678',
          cityId: taiz.cities[0].id, // المظفر
          addressDetails: 'تعز - شارع جمال - حي المظفر',
          logoUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500'
        }
      }
    },
    include: { business: true }
  });

  // Seller 4: Spices & Coffee (Hadramout)
  const seller4 = await prisma.user.create({
    data: {
      phoneNumber: '+967773456790',
      isVerified: true,
      role: 'USER',
      business: {
        create: {
          businessName: 'متجر خيرات السعيدة للبهارات والقهوة',
          description: 'طحن وتجهيز البهارات اليمنية المشكلة والقهوة اليافعية والحضرمية الأصلية بخلطات منزلية خاصة.',
          contactPhone: '+967773456790',
          cityId: hadramout.cities[0].id, // المكلا
          addressDetails: 'المكلا - حي الشرج',
          logoUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500'
        }
      }
    },
    include: { business: true }
  });

  // Buyer Users
  const buyer1 = await prisma.user.create({ data: { phoneNumber: '+967779998881', isVerified: true, role: 'USER' } });
  const buyer2 = await prisma.user.create({ data: { phoneNumber: '+967779998882', isVerified: true, role: 'USER' } });
  const buyer3 = await prisma.user.create({ data: { phoneNumber: '+967779998883', isVerified: true, role: 'USER' } });
  const buyer4 = await prisma.user.create({ data: { phoneNumber: '+967779998884', isVerified: true, role: 'USER' } });

  console.log('✅ Users & Businesses seeded.');

  // 5. Seed Products with Images, Reviews, and Ratings
  console.log('📦 Seeding Products...');

  // Product 1: Bint Al-Sahn (Approved)
  const prod1 = await prisma.product.create({
    data: {
      businessId: seller1.business.id,
      categoryId: catYemeniMeals.id,
      title: 'بنت صحن يمنية بلدي بالسمن والعسل',
      description: 'طبقات هشة ولذيذة معجونة بالسمن البلدي الصافي ومسقية بالعسل الجالي الأصيل. تُحضر طازجة فور الطلب.',
      price: 4500,
      currency: 'YER',
      unitOfSale: 'طبق',
      status: 'APPROVED',
      averageRating: 4.9,
      reviewsCount: 4,
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=600', isCover: true, sortOrder: 1 },
          { imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600', isCover: false, sortOrder: 2 }
        ]
      }
    }
  });

  // Product 2: Chocolate Cake (Approved)
  const prod2 = await prisma.product.create({
    data: {
      businessId: seller1.business.id,
      categoryId: catSweets.id,
      title: 'كيكة الشوكولاتة الفاخرة بالفراولة',
      description: 'كيكة شوكولاتة منزلية هشة محشوة بصلصة الشوكولاتة الغنية ومزينة بقطع الفراولة الطازجة.',
      price: 7000,
      currency: 'YER',
      unitOfSale: 'قالب',
      status: 'APPROVED',
      averageRating: 4.8,
      reviewsCount: 3,
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // Product 3: Adeni Bakhour (Approved)
  const prod3 = await prisma.product.create({
    data: {
      businessId: seller2.business.id,
      categoryId: catBakhour.id,
      title: 'بخور عدني ملكي عرايس',
      description: 'بخور عدني فاخر مصنوع من أجود أنواع العود والعنبر والمواظير والعطور الشرقية ذات الثبات العالي يدوم في المنزل لأيام.',
      price: 12000,
      currency: 'YER',
      unitOfSale: 'قرص',
      status: 'APPROVED',
      averageRating: 5.0,
      reviewsCount: 5,
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // Product 4: Khamriya Oil (Approved)
  const prod4 = await prisma.product.create({
    data: {
      businessId: seller2.business.id,
      categoryId: catPerfumes.id,
      title: 'خمريات زعفران وعود للشعر والجسم',
      description: 'مزيج عطري فريد من دهن العود والزعفران الخالص والمسك الأبيض لملمس ناعم ورائحة عطرية فواحة.',
      price: 3500,
      currency: 'YER',
      unitOfSale: 'علبة 50 مل',
      status: 'APPROVED',
      averageRating: 4.7,
      reviewsCount: 2,
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // Product 5: Traditional Yemeni Dress (Approved)
  const prod5 = await prisma.product.create({
    data: {
      businessId: seller3.business.id,
      categoryId: catDresses.id,
      title: 'جلابية تعزية مطرزة يدوياً',
      description: 'ثوب تعزي تراثي فاخر مطرز بخيوط الحرير الملونة والخرز اليدوي متوفر بمقاسات مختلفة.',
      price: 18000,
      currency: 'YER',
      unitOfSale: 'قطعة',
      status: 'APPROVED',
      averageRating: 4.6,
      reviewsCount: 3,
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // Product 6: Kids Eid Clothes (Approved)
  const prod6 = await prisma.product.create({
    data: {
      businessId: seller3.business.id,
      categoryId: catKids.id,
      title: 'طقم بناتي للعيد مطرز',
      description: 'طقم بناتي مكون من فستان وربطة شعر بتصميم مبهج وقماش قطني مريح للأطفال.',
      price: 9500,
      currency: 'YER',
      unitOfSale: 'طقم',
      status: 'APPROVED',
      averageRating: 4.5,
      reviewsCount: 2,
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // Product 7: Mixed Yemeni Spices (Approved)
  const prod7 = await prisma.product.create({
    data: {
      businessId: seller4.business.id,
      categoryId: catSpices.id,
      title: 'حوايج بهارات يمنية مشكلة للكبسة والسلتة',
      description: 'خلطة بهارات يمنية منزلية طازجة ومحمصة ومطحونة بحب تعطيك طعماً أصيلاً للشوربة والكبسة واللحم.',
      price: 2500,
      currency: 'YER',
      unitOfSale: 'نصف كيلو',
      status: 'APPROVED',
      averageRating: 4.9,
      reviewsCount: 4,
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // Product 8: Pending Moderation Product (Pending)
  const prod8 = await prisma.product.create({
    data: {
      businessId: seller1.business.id,
      categoryId: catYemeniMeals.id,
      title: 'مطبق يمني بالبيض واللحم المفروم',
      description: 'عجينة مطبق منزلية هشة مقرمشة محشوة باللحم المفروم والبيض والكراث والمقادير الطازجة.',
      price: 2000,
      currency: 'YER',
      unitOfSale: 'حبة',
      status: 'PENDING',
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  // Product 9: Rejected Moderation Product (Rejected)
  const prod9 = await prisma.product.create({
    data: {
      businessId: seller2.business.id,
      categoryId: catPerfumes.id,
      title: 'عطر مجهول التفاصيل',
      description: 'عطر بدون وصف واضح أو صورة دقيقة.',
      price: 1000,
      currency: 'YER',
      unitOfSale: 'علبة',
      status: 'REJECTED',
      rejectionReason: 'يرجى تقديم وصف تفصيلي للمنتج وصورة واضحة وعالية الجودة.',
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600', isCover: true, sortOrder: 1 }
        ]
      }
    }
  });

  console.log('✅ Products seeded.');

  // 6. Seed Product Reviews
  console.log('⭐ Seeding Product Reviews...');
  await prisma.productReview.createMany({
    data: [
      { productId: prod1.id, userId: buyer1.id, rating: 5, comment: 'ما شاء الله الطعم رائع جداً والسمن بلدي أصيل، التوصيل في الوقت المحدد.' },
      { productId: prod1.id, userId: buyer2.id, rating: 5, comment: 'أفضل بنت صحن جربتها في صنعاء، شغلتكم نظيفة ومرتبة.' },
      { productId: prod1.id, userId: buyer3.id, rating: 5, comment: 'ممتازة جداً والعسل جالي طازج.' },
      { productId: prod1.id, userId: buyer4.id, rating: 4, comment: 'جميلة جداً ونظام الدفع والتواصل ميسر.' },

      { productId: prod2.id, userId: buyer1.id, rating: 5, comment: 'الكيكة هشة ولذيذة جداً، كبار وصغار عجبتم.' },
      { productId: prod2.id, userId: buyer2.id, rating: 5, comment: 'الشوكولاتة غنية والتزيين راقي.' },
      { productId: prod2.id, userId: buyer3.id, rating: 4, comment: 'طعم ممتاز وتغليف جميل.' },

      { productId: prod3.id, userId: buyer1.id, rating: 5, comment: 'البخور العدني ريحته تجنن وتثبت بالبيت يومين ماشاء الله!' },
      { productId: prod3.id, userId: buyer2.id, rating: 5, comment: 'بخور عرايس صدق فخم يبيض الوجه أمام الضيوف.' },
      { productId: prod3.id, userId: buyer3.id, rating: 5, comment: 'أصلي ورائحته مميزة جداً.' },
      { productId: prod3.id, userId: buyer4.id, rating: 5, comment: 'تعامل راقي وبخور ثابت، شكراً لكم.' },

      { productId: prod5.id, userId: buyer1.id, rating: 5, comment: 'الجلابية روعة والتطريز اليدوي مذهل والدقة ممتازة.' },
      { productId: prod5.id, userId: buyer2.id, rating: 4, comment: 'خامة القماش ممتازة والمقاس مضبوط بالضبط.' },

      { productId: prod7.id, userId: buyer1.id, rating: 5, comment: 'البهارات ريحتها فواحة وتغير طعم الأكل 180 درجة أنصح فيها!' },
      { productId: prod7.id, userId: buyer3.id, rating: 5, comment: 'نظيفة ومطحونة طازج تسلم الأيادي.' }
    ]
  });

  console.log('✅ Reviews seeded.');

  // 7. Seed Favorite Products
  console.log('❤️ Seeding Favorites...');
  await prisma.favoriteProduct.createMany({
    data: [
      { userId: buyer1.id, productId: prod1.id },
      { userId: buyer1.id, productId: prod3.id },
      { userId: buyer2.id, productId: prod2.id },
      { userId: buyer2.id, productId: prod5.id },
      { userId: buyer3.id, productId: prod7.id }
    ]
  });

  console.log('✅ Favorites seeded.');

  // 8. Seed Reports (For Admin Moderation Dashboard)
  console.log('🚨 Seeding Reports...');
  await prisma.report.create({
    data: {
      reporterId: buyer1.id,
      targetType: 'PRODUCT',
      targetId: prod9.id,
      reason: 'المنتج مجهول الهوية ولا يحتوي على تفاصيل كافية.',
      status: 'PENDING'
    }
  });

  await prisma.report.create({
    data: {
      reporterId: buyer2.id,
      targetType: 'BUSINESS',
      targetId: seller2.business.id,
      reason: 'استفسار عن موقع المحل والتواصل عبر الواتساب.',
      status: 'RESOLVED'
    }
  });

  console.log('✅ Reports seeded.');

  // 9. Seed WhatsApp Templates
  console.log('💬 Seeding WhatsApp Templates...');
  await prisma.whatsAppTemplate.upsert({
    where: { type: 'PRODUCT_INQUIRY' },
    update: {
      content: 'السلام عليكم ورحمة الله، أنا مهتم بـ {{productTitle}} المعروض بسعر {{productPrice}} {{currency}} عبر تطبيق السوق المنزلي. هل المنتج متوفر حالياً؟'
    },
    create: {
      type: 'PRODUCT_INQUIRY',
      content: 'السلام عليكم ورحمة الله، أنا مهتم بـ {{productTitle}} المعروض بسعر {{productPrice}} {{currency}} عبر تطبيق السوق المنزلي. هل المنتج متوفر حالياً؟'
    }
  });

  await prisma.whatsAppTemplate.upsert({
    where: { type: 'STORE_INQUIRY' },
    update: {
      content: 'السلام عليكم ورحمة الله، أتواصل معكم عبر تطبيق السوق المنزلي للاستفسار عن منتجات متجركم {{businessName}}.'
    },
    create: {
      type: 'STORE_INQUIRY',
      content: 'السلام عليكم ورحمة الله، أتواصل معكم عبر تطبيق السوق المنزلي للاستفسار عن منتجات متجركم {{businessName}}.'
    }
  });

  console.log('✅ WhatsApp Templates seeded.');

  // 10. Seed Notifications
  console.log('🔔 Seeding Notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: seller1.id,
        title: 'تمت الموافقة على منتجك 🎉',
        body: 'تمت الموافقة على منتجك (بنت صحن يمنية بلدي) وهو الآن متاح لجميع المستخدمين في التطبيق.',
        type: 'PRODUCT_APPROVED',
        isRead: true
      },
      {
        userId: seller1.id,
        title: 'تقييم جديد ⭐',
        body: 'قام أحد العملاء بتقييم منتجك (كيكة الشوكولاتة) بـ 5 نجوم!',
        type: 'NEW_REVIEW',
        isRead: false
      },
      {
        userId: seller2.id,
        title: 'تحديث حالة المنتج ⚠️',
        body: 'تم رفض المنتج (عطر مجهول التفاصيل). يرجى الاطلاع على سبب الرفض وتعديله.',
        type: 'PRODUCT_REJECTED',
        isRead: false
      }
    ]
  });

  console.log('✅ Notifications seeded.');

  // 11. Seed Admin Audit Logs
  console.log('📋 Seeding Admin Audit Logs...');
  await prisma.adminAuditLog.createMany({
    data: [
      {
        adminId: admin1.id,
        action: 'APPROVE_PRODUCT',
        targetId: prod1.id,
        details: { title: prod1.title, note: 'Approved after verifying images' }
      },
      {
        adminId: admin1.id,
        action: 'REJECT_PRODUCT',
        targetId: prod9.id,
        details: { title: prod9.title, reason: prod9.rejectionReason }
      }
    ]
  });

  console.log('✅ Admin Audit Logs seeded.');

  console.log('\n🎉 Comprehensive database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
