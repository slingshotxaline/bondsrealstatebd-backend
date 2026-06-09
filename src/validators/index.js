const { body, query } = require('express-validator');
const { AMENITIES, PROPERTY_CATEGORIES } = require('../models/Property');

// ── Auth ──────────────────────────────────────────────────────────────────────
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// ── Property ──────────────────────────────────────────────────────────────────
// NOTE: This form is submitted as multipart/form-data so ALL values arrive as
// strings. We must parse/coerce before validating.
const propertyValidator = [
  body('listingType')
    .isIn(['Sale', 'Rent']).withMessage('Listing type must be Sale or Rent'),

  body('propertyType')
    .isIn(['Residential', 'Commercial']).withMessage('Invalid property type'),

  body('propertyCategory')
    .isIn(PROPERTY_CATEGORIES).withMessage('Invalid property category'),

  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('area').trim().notEmpty().withMessage('Area is required'),

  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title too long'),

  body('description').trim().notEmpty().withMessage('Description is required'),

  // price comes as a string from FormData — convert before validating
  body('price')
    .notEmpty().withMessage('Price is required')
    .customSanitizer(v => Number(v))
    .isNumeric().withMessage('Price must be a number')
    .custom(v => v >= 0).withMessage('Price cannot be negative'),

  body('priceLabel')
    .optional()
    .isIn(['Fixed', 'Negotiable', 'On Request', 'Per Month', 'Per Year'])
    .withMessage('Invalid price label'),

  // amenities arrives as a JSON string e.g. '["Gym","Parking"]'
  // parse it into an array, then validate each item
  body('amenities')
    .optional()
    .customSanitizer(v => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return []; }
      }
      return [];
    })
    .isArray().withMessage('Amenities must be an array'),

  body('amenities.*')
    .optional()
    .isIn(AMENITIES).withMessage('Invalid amenity value'),

  body('youtubeUrl')
    .optional({ checkFalsy: true })
    .isURL().withMessage('Invalid YouTube URL'),

  body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
  body('ownerEmail').isEmail().withMessage('Valid owner email required'),
  body('ownerPhone').trim().notEmpty().withMessage('Owner phone is required'),
];

// ── Inquiry ───────────────────────────────────────────────────────────────────
const inquiryValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('inquiryType').optional().isIn(['General', 'Purchase', 'Visit']),
  body('preferredVisitDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Invalid date'),
];

// ── Property list query ───────────────────────────────────────────────────────
const propertyQueryValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('listingType').optional().isIn(['Sale', 'Rent']),
  query('propertyType').optional().isIn(['Residential', 'Commercial']),
  query('minPrice').optional().isNumeric(),
  query('maxPrice').optional().isNumeric(),
  query('status').optional().isIn(['Pending', 'Approved', 'Rejected']),
];

module.exports = {
  registerValidator,
  loginValidator,
  changePasswordValidator,
  propertyValidator,
  inquiryValidator,
  propertyQueryValidator,
};