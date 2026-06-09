const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  adminGetProperties, approveProperty, rejectProperty, toggleFeatured, getStats,
  createProperty,getProperty
} = require('../controllers/propertyController');

const {
  getUsers, getUser, updateUserStatus, deleteUser,
  getAdmins, createAdmin, deleteAdmin,
} = require('../controllers/userController');

const { adminGetInquiries, updateInquiry } = require('../controllers/inquiryController');

const { upload } = require('../config/cloudinary');

const validate = require('../middleware/validate');
const { propertyValidator } = require('../validators');

const adminAuth = [protect, authorize('admin', 'superadmin')];
const superAuth = [protect, authorize('superadmin')];

const uploadFields = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'photos', maxCount: 10 },
]);

// ── Property management ──────────────────────────────────────────────────────
router.get('/properties/stats', ...adminAuth, getStats);
router.get('/properties', ...adminAuth, adminGetProperties);
router.get('/properties/:id', ...adminAuth, getProperty);
router.post('/properties', ...adminAuth, uploadFields, propertyValidator, validate, createProperty);
router.patch('/properties/:id/approve', ...adminAuth, approveProperty);
router.patch('/properties/:id/reject', ...adminAuth, rejectProperty);
router.patch('/properties/:id/toggle-featured', ...adminAuth, toggleFeatured);

// ── User management ──────────────────────────────────────────────────────────
router.get('/users', ...adminAuth, getUsers);
router.get('/users/:id', ...adminAuth, getUser);
router.patch('/users/:id/status', ...adminAuth, updateUserStatus);
router.delete('/users/:id', ...adminAuth, deleteUser);

// ── Admin management (superadmin only) ──────────────────────────────────────
router.get('/admins', ...superAuth, getAdmins);
router.post('/admins', ...superAuth, createAdmin);
router.delete('/admins/:id', ...superAuth, deleteAdmin);

// ── Inquiry management ───────────────────────────────────────────────────────
router.get('/inquiries', ...adminAuth, adminGetInquiries);
router.patch('/inquiries/:id', ...adminAuth, updateInquiry);

module.exports = router;
