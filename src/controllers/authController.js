const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, sendSuccess } = require('../utils/response');
const { sendEmail, emailTemplates } = require('../utils/email');
const crypto = require('crypto');

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


// ── Forgot Password ───────────────────────────────────────────────────────────
// @route  POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400);

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return success to prevent email enumeration
  if (!user || user.authProvider === 'google') {
    return sendSuccess(res, 200, 'If that email exists, a reset link has been sent.');
  }

  // Generate 6-digit OTP (simpler than token for mobile UX)
  const otp     = Math.floor(100000 + Math.random() * 900000).toString();
  const hashed  = crypto.createHash('sha256').update(otp).digest('hex');

  user.resetPasswordToken  = hashed;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save();

  // Send email
  const { sendEmail } = require('../utils/email');
  try {
    await sendEmail({
      to:      user.email,
      subject: 'Password Reset OTP – BONDS Real Estate',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:12px">
          <h2 style="color:#004835;margin-bottom:8px">Reset Your Password</h2>
          <p style="color:#555">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#555">Use the OTP below to reset your password. It expires in <strong>15 minutes</strong>.</p>
          <div style="margin:24px 0;text-align:center">
            <div style="display:inline-block;background:#004835;color:#fff;font-size:32px;font-weight:bold;letter-spacing:12px;padding:16px 32px;border-radius:12px">
              ${otp}
            </div>
          </div>
          <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch {
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    throw new AppError('Email could not be sent. Please try again.', 500);
  }

  sendSuccess(res, 200, 'If that email exists, a reset link has been sent.');
});


// ── Verify OTP ────────────────────────────────────────────────────────────────
// @route  POST /api/auth/verify-otp
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new AppError('Email and OTP are required', 400);

  const hashed = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.findOne({
    email:               email.toLowerCase(),
    resetPasswordToken:  hashed,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Invalid or expired OTP', 400);

  // Return a short-lived reset token (not the OTP itself) to use in step 3
  const resetToken = jwt.sign(
    { id: user._id, purpose: 'reset' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  sendSuccess(res, 200, 'OTP verified', { resetToken });
});


// ── Reset Password ────────────────────────────────────────────────────────────
// @route  POST /api/auth/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) throw new AppError('Token and new password are required', 400);
  if (newPassword.length < 6)       throw new AppError('Password must be at least 6 characters', 400);

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Reset session expired. Please request a new OTP.', 400);
  }

  if (decoded.purpose !== 'reset') throw new AppError('Invalid token', 400);

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User not found', 404);

  user.password            = newPassword;
  user.resetPasswordToken  = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendSuccess(res, 200, 'Password reset successfully. You can now sign in.');
});


// ── Google OAuth callback ─────────────────────────────────────────────────────
// @route  GET /api/auth/google/callback  (called by passport after Google auth)
exports.googleCallback = asyncHandler(async (req, res) => {
  const user = req.user; // set by passport
  if (!user) {
    return res.redirect(`${process.env.CLIENT_URL}/auth/error`);
  }

  const token        = user.getSignedToken();
  const refreshToken = user.getRefreshToken();

  // Redirect to frontend with tokens in query params
  // Frontend will pick them up and store in localStorage
  const params = new URLSearchParams({
    token,
    refreshToken,
    name:  user.name,
    email: user.email,
    role:  user.role,
    id:    user._id.toString(),
  });

  res.redirect(`${process.env.CLIENT_URL}/auth/callback?${params}`);
});