const { getBucket } = require('../config/firebase');
const crypto = require('crypto');

/**
 * Uploads a file buffer directly to Firebase Cloud Storage
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalName - Original filename to extract extension
 * @param {string} mimeType - File MIME type (e.g. image/jpeg)
 * @param {string} folder - Target folder in bucket (e.g. 'products', 'businesses', 'users')
 * @returns {Promise<string>} Public HTTPS URL of the uploaded image
 */
async function uploadToFirebase(buffer, originalName, mimeType, folder = 'uploads') {
  const bucket = getBucket();
  if (!bucket) {
    throw new Error('Firebase Storage is not initialized. Check your Firebase service account key.');
  }

  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
  const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
  const file = bucket.file(fileName);

  const downloadToken = crypto.randomUUID();

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
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
