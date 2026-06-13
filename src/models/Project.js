const mongoose = require("mongoose");

// ── Dynamic custom fields schema ──────────────────────────────────────────────
// This powers the "add any field" feature from the dashboard
const customFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true }, // field name e.g. "Swimming Pool"
    value: { type: String, required: true, trim: true }, // field value e.g. "Yes"
    icon: { type: String, default: null }, // optional emoji/icon string
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    // ── Core info ────────────────────────────────────────────────────────────────
    title: { type: String, required: [true, "Title is required"], trim: true },
    type: {
      type: String,
      required: [true, "Project type is required"],
      trim: true,
    },
    description: { type: String, required: [true, "Description is required"] },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },

    // ── Status & tags ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["Ready", "Ongoing", "Upcoming"],
      default: "Ongoing",
    },
    tag: {
      type: String,
      enum: ["Featured", "New", "Premium", "Exclusive", "None"],
      default: "New",
    },
    filter: {
      type: String,
      default: "Apartments",
      trim: true,
    },

    // ── Fixed spec fields (matching your template) ────────────────────────────────
    area: { type: String, default: "" }, // sqft
    rooms: { type: String, default: "" }, // bedrooms
    baths: { type: String, default: "" },
    floors: { type: String, default: "" },
    parking: { type: String, default: "Yes" },
    year: { type: String, default: "" }, // completion year
    accentColor: {
      type: String,
      default: "from-emerald-900/80 to-emerald-700/40",
    },

    // ── Media ────────────────────────────────────────────────────────────────────
    mainImage: {
      url: { type: String, required: [true, "Main image is required"] },
      publicId: { type: String, required: true },
    },
    gallery: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    // ── Dynamic custom fields (the "add field" feature) ───────────────────────────
    // Admin can add any extra field e.g. { key: "Swimming Pool", value: "Yes" }
    customFields: {
      type: [customFieldSchema],
      default: [],
    },

    // ── Visibility ────────────────────────────────────────────────────────────────
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 }, // for manual ordering
  },
  { timestamps: true }
);

projectSchema.index({ isPublished: 1, order: 1 });
projectSchema.index({ filter: 1 });

module.exports = mongoose.model("Project", projectSchema);
