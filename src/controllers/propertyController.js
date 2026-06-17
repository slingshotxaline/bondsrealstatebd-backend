const Property = require("../models/Property");
const asyncHandler = require("../utils/asyncHandler");
const {
  AppError,
  sendSuccess,
  getPagination,
  paginatedResponse,
} = require("../utils/response");
const { createNotification } = require("../utils/notification");
const { sendEmail, emailTemplates } = require("../utils/email");
const { deleteFile, deleteFiles } = require("../config/cloudinary");

const notifyAdmins = async ({
  type,
  title,
  message,
  relatedProperty = null,
  relatedInquiry = null,
}) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "superadmin"] } })
      .select("_id")
      .lean();
    await Promise.all(
      admins.map((admin) =>
        createNotification({
          recipient: admin._id,
          type,
          title,
          message,
          relatedProperty,
          relatedInquiry,
        })
      )
    );
  } catch (err) {
    console.error("Admin notification failed:", err.message);
  }
};

const generateSlug = async (title, id = null) => {
  // "Spacious 3BHK Apartment in Gulshan" → "spacious-3bhk-apartment-in-gulshan"
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special chars
    .replace(/[\s_]+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .slice(0, 80); // max 80 chars

  // Check for collision, append short id suffix if needed
  const exists = await Property.findOne({
    slug: base,
    ...(id && { _id: { $ne: id } }),
  });
  if (!exists) return base;

  // Collision → append 6-char id suffix
  return `${base}-${Date.now().toString(36)}`;
};

// ── Query builders ────────────────────────────────────────────────────────────
const buildFilter = (query, extraFilters = {}) => {
  const filter = { ...extraFilters };
  if (query.listingType) filter.listingType = query.listingType;
  if (query.propertyType) filter.propertyType = query.propertyType;
  if (query.propertyCategory) filter.propertyCategory = query.propertyCategory;
  if (query.city) filter.city = new RegExp(query.city, "i");
  if (query.area) filter.area = new RegExp(query.area, "i");
  if (query.status) filter.status = query.status;
  if (query.isFeatured !== undefined)
    filter.isFeatured = query.isFeatured === "true";
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.amenities) {
    const list = Array.isArray(query.amenities)
      ? query.amenities
      : [query.amenities];
    filter.amenities = { $all: list };
  }
  if (query.search) filter.$text = { $search: query.search };
  return filter;
};

const buildSort = (query) => {
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    views: { views: -1 },
  };
  return sortMap[query.sort] || { createdAt: -1 };
};

// ── Helper: extract Cloudinary result from multer file ────────────────────────
// multer-storage-cloudinary attaches .path (url) and .filename (public_id)
const toMediaObject = (file) => ({
  url: file.path,
  publicId: file.filename,
});

// ─── Public ───────────────────────────────────────────────────────────────────

// @route  GET /api/properties
exports.getProperties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query, { status: "Approved", isActive: true });
  const sort = buildSort(req.query);

  const [properties, total] = await Promise.all([
    Property.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Property.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    "Properties fetched",
    paginatedResponse(properties, total, page, limit)
  );
});

// @route  GET /api/properties/:id
// Public: only Approved properties
// Owner: can see their own any-status property
// Admin: can see any property regardless of status
exports.getProperty = asyncHandler(async (req, res) => {
  const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
  const isOwner = req.user?._id;

  let property;

  if (isAdmin) {
    // Admin sees everything — no status filter
    property = await Property.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    )
      .populate("submittedBy", "name email phone")
      .lean();
  } else if (isOwner) {
    // Logged-in user sees their own property at any status
    // but only Approved ones from others
    property = await Property.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { status: "Approved", isActive: true },
          { submittedBy: req.user._id },
        ],
      },
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    ).lean();
  } else {
    // Guest — approved only
    property = await Property.findOneAndUpdate(
      { _id: req.params.id, status: "Approved", isActive: true },
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    ).lean();
  }

  if (!property) throw new AppError("Property not found", 404);
  sendSuccess(res, 200, "Property fetched", { property });
});

// ─── User ─────────────────────────────────────────────────────────────────────

// @route  POST /api/properties
exports.createProperty = asyncHandler(async (req, res) => {
  if (!req.files?.thumbnail?.[0])
    throw new AppError("Thumbnail image is required", 400);

  // Cloudinary URLs + public_ids come directly from multer-storage-cloudinary
  const thumbnail = toMediaObject(req.files.thumbnail[0]);
  const photos = (req.files.photos || []).map(toMediaObject);

  let amenities = req.body.amenities || [];
  if (typeof amenities === "string") {
    try {
      amenities = JSON.parse(amenities);
    } catch {
      amenities = [amenities];
    }
  }

  const isAdmin = ["admin", "superadmin"].includes(req.user.role);

  const slug = await generateSlug(req.body.title);

  const property = await Property.create({
    ...req.body,
    amenities,
    thumbnail,
    photos,
    slug,
    submittedBy: req.user._id,
    status: isAdmin ? "Approved" : "Pending",
    approvedBy: isAdmin ? req.user._id : undefined,
  });

  if (!isAdmin) {
    await notifyAdmins({
      type: "PROPERTY_SUBMITTED",
      title: "New Property Submitted",
      message: `${req.user.name} submitted "${property.title}" for review.`,
      relatedProperty: property._id,
    });
  }

  sendSuccess(
    res,
    201,
    isAdmin ? "Property created" : "Property submitted for review",
    { property }
  );
});

// @route  GET /api/properties/my
exports.getMyProperties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { submittedBy: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    "Your properties fetched",
    paginatedResponse(properties, total, page, limit)
  );
});

// @route  PUT /api/properties/:id
exports.updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw new AppError("Property not found", 404);

  const isOwner = property.submittedBy?.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superadmin"].includes(req.user.role);

  if (!isOwner && !isAdmin)
    throw new AppError("Not authorized to update this property", 403);
  if (isOwner && !isAdmin && property.status === "Approved") {
    throw new AppError("Cannot edit an approved property. Contact admin.", 403);
  }

  const updates = { ...req.body };

  if (req.body.title && req.body.title !== property.title) {
    updates.slug = await generateSlug(req.body.title, property._id);
  }

  // ── New thumbnail uploaded → delete old from Cloudinary, use new ──────────
  if (req.files?.thumbnail?.[0]) {
    await deleteFile(property.thumbnail?.publicId);
    updates.thumbnail = toMediaObject(req.files.thumbnail[0]);
  }

  // ── New photos uploaded ───────────────────────────────────────────────────
  if (req.files?.photos?.length) {
    // keepPhotos: JSON array of publicIds the frontend says to keep
    let keepIds = [];
    try {
      keepIds = JSON.parse(req.body.keepPhotos || "[]");
    } catch {
      keepIds = [];
    }

    // Delete photos that were removed by the user
    const toDelete = property.photos.filter(
      (p) => !keepIds.includes(p.publicId)
    );
    await deleteFiles(toDelete.map((p) => p.publicId));

    // Kept existing photos + new ones
    const kept = property.photos.filter((p) => keepIds.includes(p.publicId));
    const newOnes = req.files.photos.map(toMediaObject);
    updates.photos = [...kept, ...newOnes];
  }

  if (isOwner && !isAdmin) updates.status = "Pending";

  const updated = await Property.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, 200, "Property updated", { property: updated });
});

// @route  DELETE /api/properties/:id
exports.deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw new AppError("Property not found", 404);

  const isOwner = property.submittedBy?.toString() === req.user._id.toString();
  const isAdmin = ["admin", "superadmin"].includes(req.user.role);
  if (!isOwner && !isAdmin) throw new AppError("Not authorized", 403);

  // Delete all media from Cloudinary
  await deleteFile(property.thumbnail?.publicId);
  await deleteFiles(property.photos.map((p) => p.publicId));

  await property.deleteOne();
  sendSuccess(res, 200, "Property deleted");
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// @route  GET /api/admin/properties
exports.adminGetProperties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);
  const sort = buildSort(req.query);

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .populate("submittedBy", "name email")
      .populate("approvedBy", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    "Properties fetched",
    paginatedResponse(properties, total, page, limit)
  );
});

// @route  PATCH /api/admin/properties/:id/approve
exports.approveProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate(
    "submittedBy",
    "name email"
  );
  if (!property) throw new AppError("Property not found", 404);
  if (property.status === "Approved")
    throw new AppError("Already approved", 400);

  property.status = "Approved";
  property.rejectionReason = null;
  property.approvedBy = req.user._id;
  await property.save();

  if (property.submittedBy) {
    await createNotification({
      recipient: property.submittedBy._id,
      type: "PROPERTY_APPROVED",
      title: "Property Approved",
      message: `Your property "${property.title}" has been approved.`,
      relatedProperty: property._id,
    });
    const tmpl = emailTemplates.propertyApproved(
      property.submittedBy.name,
      property.title
    );
    sendEmail({ to: property.submittedBy.email, ...tmpl }).catch(() => {});
  }

  sendSuccess(res, 200, "Property approved", { property });
});

// @route  PATCH /api/admin/properties/:id/reject
exports.rejectProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate(
    "submittedBy",
    "name email"
  );
  if (!property) throw new AppError("Property not found", 404);

  property.status = "Rejected";
  property.rejectionReason =
    req.body.reason || "Does not meet listing guidelines";
  await property.save();

  if (property.submittedBy) {
    await createNotification({
      recipient: property.submittedBy._id,
      type: "PROPERTY_REJECTED",
      title: "Property Rejected",
      message: `Your property "${property.title}" was rejected. Reason: ${property.rejectionReason}`,
      relatedProperty: property._id,
    });
    const tmpl = emailTemplates.propertyRejected(
      property.submittedBy.name,
      property.title,
      property.rejectionReason
    );
    sendEmail({ to: property.submittedBy.email, ...tmpl }).catch(() => {});
  }

  sendSuccess(res, 200, "Property rejected", { property });
});

// @route  PATCH /api/admin/properties/:id/toggle-featured
exports.toggleFeatured = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw new AppError("Property not found", 404);
  property.isFeatured = !property.isFeatured;
  await property.save();
  sendSuccess(
    res,
    200,
    `Property ${property.isFeatured ? "featured" : "unfeatured"}`,
    { property }
  );
});

// @route  GET /api/admin/properties/stats
exports.getStats = asyncHandler(async (req, res) => {
  const [statusStats, listingStats, total] = await Promise.all([
    Property.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Property.aggregate([
      { $group: { _id: "$listingType", count: { $sum: 1 } } },
    ]),
    Property.countDocuments(),
  ]);
  sendSuccess(res, 200, "Stats fetched", { total, statusStats, listingStats });
});

exports.getPropertyBySlug = asyncHandler(async (req, res) => {
  const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);

  const filter = { slug: req.params.slug };
  // Public only sees Approved; admin sees all
  if (!isAdmin) {
    filter.status = "Approved";
    filter.isActive = true;
  }

  const property = await Property.findOneAndUpdate(
    filter,
    { $inc: { views: 1 } },
    { returnDocument: "after" }
  ).lean();

  if (!property) throw new AppError("Property not found", 404);
  sendSuccess(res, 200, "Property fetched", { property });
});


// GET /api/properties/meta — distinct cities for filter dropdown
exports.getPropertyMeta = asyncHandler(async (req, res) => {
  const cities = await Property.distinct('city', { status: 'Approved', isActive: true });
  const areas  = await Property.distinct('area', { status: 'Approved', isActive: true });
  sendSuccess(res, 200, 'Meta fetched', { cities: cities.sort(), areas: areas.sort() });
});
