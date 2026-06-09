const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, sendSuccess, getPagination, paginatedResponse } = require('../utils/response');

// @route  GET /api/admin/users
exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { role: 'user' };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { email: new RegExp(req.query.search, 'i') },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Users fetched', paginatedResponse(users, total, page, limit));
});

// @route  GET /api/admin/users/:id
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new AppError('User not found', 404);
  sendSuccess(res, 200, 'User fetched', { user });
});

// @route  PATCH /api/admin/users/:id/status
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    throw new AppError('Status must be active or suspended', 400);
  }

  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) throw new AppError('User not found', 404);

  sendSuccess(res, 200, `User ${status}`, { user });
});

// @route  DELETE /api/admin/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'superadmin') throw new AppError('Cannot delete superadmin', 403);
  await user.deleteOne();
  sendSuccess(res, 200, 'User deleted');
});

// ─── Admin management (superadmin only) ──────────────────────────────────────

// @route  GET /api/admin/admins
exports.getAdmins = asyncHandler(async (req, res) => {
  const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).lean();
  sendSuccess(res, 200, 'Admins fetched', { admins });
});

// @route  POST /api/admin/admins
exports.createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already in use', 400);

  const admin = await User.create({ name, email, password, phone, role: 'admin' });
  sendSuccess(res, 201, 'Admin created', {
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
});

// @route  DELETE /api/admin/admins/:id
exports.deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findById(req.params.id);
  if (!admin) throw new AppError('Admin not found', 404);
  if (admin.role === 'superadmin') throw new AppError('Cannot delete superadmin', 403);
  await admin.deleteOne();
  sendSuccess(res, 200, 'Admin removed');
});
