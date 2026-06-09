const express = require('express');
const router = express.Router();

const {
  register, login, getMe, updateProfile, changePassword, refreshToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerValidator, loginValidator, changePasswordValidator } = require('../validators');

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/refresh', refreshToken);

router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/change-password', protect, changePasswordValidator, validate, changePassword);

module.exports = router;
