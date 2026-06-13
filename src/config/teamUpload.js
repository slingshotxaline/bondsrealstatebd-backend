const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('./cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:          'bonds/team',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:  [{ width: 400, height: 500, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
    public_id:       `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }),
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  if (allowed.test(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files allowed'));
};

const teamUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = teamUpload;