const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/response');

// Verify JWT and attach user to req
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw new AppError('Not authorized. Token missing.', 401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user) throw new AppError('User no longer exists.', 401);
  if (user.status === 'suspended') throw new AppError('Your account has been suspended.', 403);

  req.user = user;
  next();
});

// Optional auth — attaches user if token exists, but doesn't block if missing
const optionalProtect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (_) {}
  }
  next();
});

// Role-based access: authorize('admin', 'superadmin')
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    throw new AppError(`Role '${req.user?.role}' is not authorized for this action.`, 403);
  }
  next();
};

module.exports = { protect, optionalProtect, authorize };
