const prisma = require('../config/db');
const { uploadToFirebase, deleteFromFirebase } = require('./storageService');

const createOrUpdateBusiness = async (userId, data, file) => {
  const existing = await prisma.business.findUnique({ where: { userId } });
  
  let logoUrl = existing?.logoUrl;
  if (file) {
    // Delete old logo if updating
    if (existing?.logoUrl) {
      await deleteFromFirebase(existing.logoUrl);
    }
    logoUrl = await uploadToFirebase(file.buffer, file.originalname, file.mimetype, 'businesses');
  }

  if (existing) {
    return await prisma.business.update({
      where: { id: existing.id },
      data: {
        businessName: data.businessName || existing.businessName,
        description: data.description || existing.description,
        contactPhone: data.contactPhone || existing.contactPhone,
        cityId: data.cityId || existing.cityId,
        addressDetails: data.addressDetails || existing.addressDetails,
        logoUrl
      }
    });
  }

  return await prisma.business.create({
    data: {
      userId,
      businessName: data.businessName,
      description: data.description,
      contactPhone: data.contactPhone,
      cityId: data.cityId,
      addressDetails: data.addressDetails,
      logoUrl
    }
  });
};

const getBusinessById = async (id, currentUserId = null) => {
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      city: { include: { governorate: true } },
      products: {
        where: { status: 'APPROVED', isAvailable: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { images: true }
      },
      _count: {
        select: { followers: true }
      }
    }
  });
  if (!business || !business.isActive) throw new Error('Business not found or suspended');

  let isFollowed = false;
  if (currentUserId) {
    const followerRecord = await prisma.storeFollower.findUnique({
      where: {
        userId_businessId: {
          userId: currentUserId,
          businessId: id
        }
      }
    });
    isFollowed = Boolean(followerRecord);
  }

  return {
    ...business,
    followersCount: business._count?.followers || 0,
    isFollowed
  };
};

const getBusinessByUserId = async (userId) => {
  const business = await prisma.business.findUnique({
    where: { userId },
    include: {
      city: { include: { governorate: true } },
      products: {
        include: { images: true }
      },
      _count: {
        select: { followers: true }
      }
    }
  });
  if (!business) throw new Error('Business not found');
  return {
    ...business,
    followersCount: business._count?.followers || 0
  };
};

const toggleFollowStore = async (userId, businessId) => {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || !business.isActive) {
    throw new Error('المتجر غير موجود أو غير مفعل');
  }

  const existingFollower = await prisma.storeFollower.findUnique({
    where: {
      userId_businessId: {
        userId,
        businessId
      }
    }
  });

  let isFollowed = false;
  if (existingFollower) {
    // Unfollow
    await prisma.storeFollower.delete({
      where: { id: existingFollower.id }
    });
    isFollowed = false;
  } else {
    // Follow
    await prisma.storeFollower.create({
      data: {
        userId,
        businessId
      }
    });
    isFollowed = true;
  }

  const followersCount = await prisma.storeFollower.count({
    where: { businessId }
  });

  return {
    isFollowed,
    followersCount
  };
};

const getFollowedStores = async (userId) => {
  const followers = await prisma.storeFollower.findMany({
    where: { userId },
    include: {
      business: {
        include: {
          city: { include: { governorate: true } },
          products: {
            where: { status: 'APPROVED', isAvailable: true },
            select: { id: true, averageRating: true, reviewsCount: true }
          },
          _count: {
            select: { followers: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return followers
    .filter((f) => f.business && f.business.isActive)
    .map((f) => ({
      ...f.business,
      followersCount: f.business._count?.followers || 0,
      isFollowed: true
    }));
};

const getAllBusinesses = async (filters) => {
  const { governorateId, search, featured, limit = 50, page = 1 } = filters || {};
  let whereClause = { isActive: true };

  if (featured === 'true' || featured === true) {
    whereClause.isFeatured = true;
  }

  if (governorateId) {
    whereClause.city = { governorateId: governorateId };
  }

  if (search) {
    whereClause.businessName = { contains: search };
  }

  const take = parseInt(limit, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  let businesses = await prisma.business.findMany({
    where: whereClause,
    take: take,
    skip: skip,
    include: {
      city: { include: { governorate: true } },
      products: {
        where: { status: 'APPROVED', isAvailable: true },
        select: { id: true, averageRating: true, reviewsCount: true }
      },
      _count: {
        select: { followers: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fallback: If featured filter was requested but no featured businesses exist in DB, fallback to top active businesses
  if ((featured === 'true' || featured === true) && businesses.length === 0) {
    delete whereClause.isFeatured;
    businesses = await prisma.business.findMany({
      where: whereClause,
      take: take,
      skip: skip,
      include: {
        city: { include: { governorate: true } },
        products: {
          where: { status: 'APPROVED', isAvailable: true },
          select: { id: true, averageRating: true, reviewsCount: true }
        },
        _count: {
          select: { followers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  return businesses.map((b) => ({
    ...b,
    followersCount: b._count?.followers || 0
  }));
};

module.exports = {
  createOrUpdateBusiness,
  getBusinessById,
  getBusinessByUserId,
  toggleFollowStore,
  getFollowedStores,
  getAllBusinesses
};
