const fs = require('fs');
const FileType = require('file-type');

const scanFiles = async (req, res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files && Array.isArray(req.files)) files.push(...req.files);

  if (files.length === 0) return next();

  for (const file of files) {
    try {
      // Validate magic bytes directly from buffer to prevent MIME spoofing
      const type = await FileType.fromBuffer(file.buffer);
      
      if (!type || !type.mime.startsWith('image/')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid file type detected. Only actual images are allowed.' 
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error scanning file for malware' });
    }
  }

  next();
};

module.exports = { scanFiles };
