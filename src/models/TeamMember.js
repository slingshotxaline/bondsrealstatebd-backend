const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    // ── Core info ────────────────────────────────────────────────────────────────
    name: { type: String, required: [true, "Name is required"], trim: true },
    designation: { type: String, trim: true, default: "" },
    quote: { type: String, trim: true, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },

    // ── Photo — Cloudinary object ────────────────────────────────────────────────
    photo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },

    // ── Tags shown in modal (e.g. Leadership, Strategy) ─────────────────────────
    tags: {
      type: [String],
      default: ["Leadership", "Strategy", "Impact", "Enterprise"],
    },

    // ── Palette id — controls the silhouette avatar colors in frontend ───────────
    // 1=dark-green, 2=purple, 3=blue, 4=pink, 5=light-green, etc.
    paletteId: { type: Number, default: 1 },

    // ── Visibility & ordering ────────────────────────────────────────────────────
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

teamMemberSchema.index({ isVisible: 1, order: 1 });

module.exports = mongoose.model("TeamMember", teamMemberSchema);
