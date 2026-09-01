const { getBucket } = require('../config/firebase');
const crypto = require('crypto');
const sharp = require('sharp');

/**
 * Uploads a file buffer directly to Firebase Cloud Storage with automated Sharp WebP compression
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type (e.g. image/jpeg, image/png)
 * @param {string} folder - Target folder in bucket (e.g. 'products', 'businesses', 'users')
 * @returns {Promise<string>} Public HTTPS URL of the uploaded optimized image
 */
const path = require('path');
const fs = require('fs');

async function uploadToFirebase(buffer, originalName, mimeType, folder = 'uploads') {
  const bucket = getBucket();
  let finalBuffer = buffer;
  let finalMimeType = mimeType;
  let ext = (originalName && originalName.includes('.')) ? originalName.split('.').pop().toLowerCase() : 'jpg';

  // Perform server-side image compression & WebP conversion for all images
  if (mimeType && mimeType.startsWith('image/')) {
    try {
      finalBuffer = await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      finalMimeType = 'image/webp';
      ext = 'webp';
    } catch (sharpErr) {
      console.warn(`⚠️ Sharp image compression failed, falling back to original buffer: ${sharpErr.message}`);
    }
  }

  const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;

  if (!bucket) {
    // Local storage fallback
    const targetDir = path.join(__dirname, '../../uploads', folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const localFilePath = path.join(targetDir, `${crypto.randomUUID()}.${ext}`);
    fs.writeFileSync(localFilePath, finalBuffer);
    const relativeUrl = `/uploads/${folder}/${path.basename(localFilePath)}`;
    console.log(`📁 Uploaded file locally: ${relativeUrl}`);
    return relativeUrl;
  }

  const file = bucket.file(fileName);
  const downloadToken = crypto.randomUUID();

  await file.save(finalBuffer, {
    metadata: {
      contentType: finalMimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    public: true, // Make file publicly accessible
    resumable: false,
  });

  // Public Firebase Storage URL format
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${downloadToken}`;
  return publicUrl;
}

/**
 * Deletes a file from Firebase Cloud Storage by URL
 * @param {string} fileUrl - Public URL or storage path of the file
 */
async function deleteFromFirebase(fileUrl) {
  if (!fileUrl || !fileUrl.includes('firebasestorage.googleapis.com')) {
    return; // Ignore non-firebase or empty URLs
  }

  const bucket = getBucket();
  if (!bucket) return;

  try {
    // Extract file path from URL (e.g. products/uuid.jpg)
    const urlParts = fileUrl.split('/o/');
    if (urlParts.length > 1) {
      const encodedPath = urlParts[1].split('?')[0];
      const filePath = decodeURIComponent(encodedPath);
      const file = bucket.file(filePath);
      await file.delete({ ignoreNotFound: true });
      console.log(`🗑️ Deleted file from Firebase Storage: ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to delete file from Firebase Storage: ${error.message}`);
  }
}

module.exports = {
  uploadToFirebase,
  deleteFromFirebase,
};
