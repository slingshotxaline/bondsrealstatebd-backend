const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Files go memory → Cloudinary directly. Nothing saved to disk.
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isThumb = file.fieldname === 'thumbnail';
    return {
      folder:          isThumb ? 'bonds/thumbnails' : 'bonds/photos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation:  isThumb
        ? [{ width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' }]
        : [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      public_id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext  = allowed.test(file.originalname.split('.').pop().toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_UPLOAD) || 10 * 1024 * 1024 },
});

const deleteFile = async (publicId) => {
  if (!publicId) return;
  try { await cloudinary.uploader.destroy(publicId); }
  catch (err) { console.error('Cloudinary delete error:', err.message); }
};

const deleteFiles = async (publicIds = []) => {
  await Promise.allSettled(publicIds.map(deleteFile));
};

module.exports = { upload, cloudinary, deleteFile, deleteFiles };