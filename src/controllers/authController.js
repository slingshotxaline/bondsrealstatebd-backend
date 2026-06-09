const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, sendSuccess } = require('../utils/response');
const { sendEmail, emailTemplates } = require('../utils/email');

// Helper: send tokens
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedToken();
  const refreshToken = user.getRefreshToken();
  sendSuccess(res, statusCode, message, {
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
};

// @route   POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already registered', 400);

  const user = await User.create({ name, email, password, phone });

  // Welcome email (non-blocking)
  const tmpl = emailTemplates.welcomeUser(name);
  sendEmail({ to: email, ...tmpl }).catch(() => {});

  sendTokenResponse(user, 201, res, 'Registration successful');
});

// @route   POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (user.status === 'suspended') throw new AppError('Account suspended. Contact support.', 403);

  sendTokenResponse(user, 200, res, 'Login successful');
});

// @route   GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'Profile fetched', { user: req.user });
});

// @route   PUT /api/auth/me
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  );
  sendSuccess(res, 200, 'Profile updated', { user: updated });
});

// @route   PUT /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  await user.save();
  sendSuccess(res, 200, 'Password changed successfully');
});

// @route   POST /api/auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User not found', 401);

  sendTokenResponse(user, 200, res, 'Token refreshed');
});
