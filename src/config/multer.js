const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // built-in — no install needed

// Absolute paths — works on Windows and Linux regardless of cwd
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const THUMB_DIR   = path.join(UPLOAD_ROOT, 'thumbnails');
const PHOTOS_DIR  = path.join(UPLOAD_ROOT, 'photos');

// Auto-create folders at startup if they don't exist
[THUMB_DIR, PHOTOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'thumbnail' ? THUMB_DIR : PHOTOS_DIR;
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

// File filter — only images
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext  = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_UPLOAD) || 5 * 1024 * 1024 },
});

module.exports = upload;
module.exports.THUMB_DIR  = THUMB_DIR;
module.exports.PHOTOS_DIR = PHOTOS_DIR;