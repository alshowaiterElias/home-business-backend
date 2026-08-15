const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

const cleanupOrphanedImages = async () => {
  console.log('Starting orphaned images cleanup...');
  try {
    const uploadDir = path.join(__dirname, '../uploads/products');
    if (!fs.existsSync(uploadDir)) return;

    const files = fs.readdirSync(uploadDir);
    const dbImages = await prisma.productImage.findMany({ select: { imageUrl: true } });
    
    // Create a Set of all valid filenames from the DB
    const validFilenames = new Set(dbImages.map(img => path.basename(img.imageUrl)));
    
    let deletedCount = 0;
    for (const file of files) {
      if (!validFilenames.has(file)) {
        fs.unlinkSync(path.join(uploadDir, file));
        deletedCount++;
      }
    }
    
    console.log(`Cleanup complete. Deleted ${deletedCount} orphaned images.`);
  } catch (error) {
    console.error('Failed to cleanup orphaned images:', error);
  }
};

module.exports = { cleanupOrphanedImages };
