const express = require('express');
const router = express.Router();

const {
  getProperties, getProperty,
  createProperty, getMyProperties,
  updateProperty, deleteProperty,
} = require('../controllers/propertyController');
const { submitInquiry } = require('../controllers/inquiryController');

const { protect, optionalProtect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const validate = require('../middleware/validate');
const { propertyValidator, inquiryValidator, propertyQueryValidator } = require('../validators');

const uploadFields = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'photos', maxCount: 10 },
]);

// Public
router.get('/', propertyQueryValidator, validate, getProperties);
router.get('/my', protect, getMyProperties);
router.get('/:id', optionalProtect, getProperty);

// Inquiry (optional auth)
router.post('/:id/inquiries', optionalProtect, inquiryValidator, validate, submitInquiry);

// Auth required
router.post('/', protect, uploadFields, propertyValidator, validate, createProperty);
router.put('/:id', protect, uploadFields, updateProperty);
router.delete('/:id', protect, deleteProperty);

module.exports = router;
