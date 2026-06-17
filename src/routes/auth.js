const express = require("express");
const router = express.Router();
const passport = require('../config/passport');

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  googleCallback,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} = require("../validators");

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post("/refresh", refreshToken);

router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.put(
  "/change-password",
  protect,
  changePasswordValidator,
  validate,
  changePassword
);

// ── Forgot / Reset password (3-step OTP flow) ─────────────────────────────────
router.post("/forgot-password", forgotPassword); // step 1 — send OTP email
router.post("/verify-otp", verifyOtp); // step 2 — verify OTP → get resetToken
router.post("/reset-password", resetPassword); // step 3 — set new password

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/auth/error`,
  }),
  (req, res, next) => {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error`);
    }
    next();
  },
  googleCallback
);

module.exports = router;
