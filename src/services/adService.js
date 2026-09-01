const prisma = require('../config/db');
const { uploadToFirebase, deleteFromFirebase } = require('./storageService');

/**
 * Get active advertisement banners for mobile app
 */
const getActiveAds = async () => {
  try {
    const ads = await prisma.advertisement.findMany({
      where: { isActive: true },
      include: {
        store: {
          select: {
            id: true,
            businessName: true,
            logoUrl: true,
            contactPhone: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    return ads;
  } catch (error) {
    console.error('Error in getActiveAds:', error);
    return [];
  }
};

/**
 * Get all advertisements (active and inactive) for admin
 */
const getAllAdsForAdmin = async () => {
  const ads = await prisma.advertisement.findMany({
    include: {
      store: {
        select: {
          id: true,
          businessName: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return ads;
};

/**
 * Create a new advertisement banner
 */
const createAd = async (data, imageFile) => {
  if (!imageFile) {
    throw new Error('Advertisement image is required');
  }

  const imageUrl = await uploadToFirebase(
    imageFile.buffer,
    imageFile.originalname,
    imageFile.mimetype,
    'ads'
  );

  const ad = await prisma.advertisement.create({
    data: {
      imageUrl,
      storeId: data.storeId || null,
      isActive: data.isActive === 'true' || data.isActive === true || data.isActive === undefined,
      sortOrder: data.sortOrder ? parseInt(data.sortOrder, 10) : 0,
    },
    include: {
      store: {
        select: {
          id: true,
          businessName: true,
          logoUrl: true,
        },
      },
    },
  });

  return ad;
};

/**
 * Toggle advertisement active status
 */
const toggleAdStatus = async (id, isActive) => {
  const ad = await prisma.advertisement.update({
    where: { id },
    data: { isActive: Boolean(isActive) },
  });
  return ad;
};

/**
 * Delete an advertisement
 */
const deleteAd = async (id) => {
  const ad = await prisma.advertisement.findUnique({ where: { id } });
  if (!ad) {
    throw new Error('Advertisement not found');
  }

  if (ad.imageUrl) {
    await deleteFromFirebase(ad.imageUrl);
  }

  await prisma.advertisement.delete({ where: { id } });
  return { success: true };
};

module.exports = {
  getActiveAds,
  getAllAdsForAdmin,
  createAd,
  toggleAdStatus,
  deleteAd,
};
