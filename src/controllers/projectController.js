const Project = require("../models/Project");
const asyncHandler = require("../utils/asyncHandler");
const {
  AppError,
  sendSuccess,
  getPagination,
  paginatedResponse,
} = require("../utils/response");
const { deleteFile, deleteFiles } = require("../config/cloudinary");

const toMedia = (file) => ({ url: file.path, publicId: file.filename });

// ── Public ────────────────────────────────────────────────────────────────────

// GET /api/projects
exports.getProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const filter = { isPublished: true };
  if (req.query.filter && req.query.filter !== "All")
    filter.filter = req.query.filter;
  if (req.query.status) filter.status = req.query.status;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  // Get distinct filter categories for frontend filter tabs
  const categories = await Project.distinct("filter", { isPublished: true });

  sendSuccess(res, 200, "Projects fetched", {
    ...paginatedResponse(projects, total, page, limit),
    categories,
  });
});

// GET /api/projects/:id
exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    isPublished: true,
  }).lean();
  if (!project) throw new AppError("Project not found", 404);
  sendSuccess(res, 200, "Project fetched", { project });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/admin/projects
exports.adminGetProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.isPublished)
    filter.isPublished = req.query.isPublished === "true";

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    200,
    "Projects fetched",
    paginatedResponse(projects, total, page, limit)
  );
});

// POST /api/admin/projects
exports.createProject = asyncHandler(async (req, res) => {
  if (!req.files?.mainImage?.[0])
    throw new AppError("Main image is required", 400);

  const mainImage = toMedia(req.files.mainImage[0]);
  const gallery = (req.files.gallery || []).map(toMedia);

  // Parse customFields JSON string from FormData
  let customFields = [];
  if (req.body.customFields) {
    try {
      customFields = JSON.parse(req.body.customFields);
    } catch {
      customFields = [];
    }
  }

  const project = await Project.create({
    ...req.body,
    mainImage,
    gallery,
    customFields,
    isPublished: req.body.isPublished !== "false",
    isFeatured: req.body.isFeatured === "true",
  });

  sendSuccess(res, 201, "Project created", { project });
});

// PUT /api/admin/projects/:id
exports.updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError("Project not found", 404);

  const updates = { ...req.body };

  // New main image
  if (req.files?.mainImage?.[0]) {
    await deleteFile(project.mainImage?.publicId);
    updates.mainImage = toMedia(req.files.mainImage[0]);
  }

  // New gallery images
  if (req.files?.gallery?.length) {
    // keep existing if specified
    let keepIds = [];
    try {
      keepIds = JSON.parse(req.body.keepGallery || "[]");
    } catch {}
    const toDelete = project.gallery.filter(
      (g) => !keepIds.includes(g.publicId)
    );
    await deleteFiles(toDelete.map((g) => g.publicId));
    const kept = project.gallery.filter((g) => keepIds.includes(g.publicId));
    updates.gallery = [...kept, ...req.files.gallery.map(toMedia)];
  }

  // Parse customFields
  if (req.body.customFields) {
    try {
      updates.customFields = JSON.parse(req.body.customFields);
    } catch {}
  }

  updates.isPublished = req.body.isPublished !== "false";
  updates.isFeatured = req.body.isFeatured === "true";

  const updated = await Project.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, 200, "Project updated", { project: updated });
});

// DELETE /api/admin/projects/:id
exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError("Project not found", 404);

  await deleteFile(project.mainImage?.publicId);
  await deleteFiles(project.gallery.map((g) => g.publicId));
  await project.deleteOne();

  sendSuccess(res, 200, "Project deleted");
});

// PATCH /api/admin/projects/:id/toggle-publish
exports.togglePublish = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError("Project not found", 404);
  project.isPublished = !project.isPublished;
  await project.save();
  sendSuccess(
    res,
    200,
    `Project ${project.isPublished ? "published" : "unpublished"}`,
    { project }
  );
});

// PATCH /api/admin/projects/reorder  — save display order
exports.reorderProjects = asyncHandler(async (req, res) => {
  // body: { order: [{ id, order }] }
  const { order } = req.body;
  if (!Array.isArray(order)) throw new AppError("order must be an array", 400);

  await Promise.all(
    order.map(({ id, order: o }) => Project.findByIdAndUpdate(id, { order: o }))
  );

  sendSuccess(res, 200, "Order saved");
});
