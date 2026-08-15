const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// Wait for the user to provide the service account key
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.join(__dirname, '../../firebase-adminsdk.json');

let adminApp = null;
let bucket = null;

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'yemen-family-project.firebasestorage.app',
      });
    } else {
      adminApp = getApps()[0];
    }
    bucket = getStorage(adminApp).bucket();
    console.log(`✅ Firebase Admin SDK initialized successfully (Bucket: ${bucket.name})`);
  } else {
    console.warn(`⚠️ WARNING: Firebase service account key not found at ${serviceAccountPath}. Firebase Auth & Storage will fail until provided.`);
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
}

module.exports = {
  getAuth: () => adminApp ? getAuth(adminApp) : null,
  getBucket: () => bucket,
};
