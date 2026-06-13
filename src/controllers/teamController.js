const TeamMember = require("../models/TeamMember");
const asyncHandler = require("../utils/asyncHandler");
const { AppError, sendSuccess } = require("../utils/response");
const { deleteFile } = require("../config/cloudinary");

const toPhoto = (file) => ({ url: file.path, publicId: file.filename });

// ── Public ────────────────────────────────────────────────────────────────────

// GET /api/team
exports.getTeam = asyncHandler(async (req, res) => {
  const members = await TeamMember.find({ isVisible: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  sendSuccess(res, 200, "Team fetched", { members });
});

// GET /api/team/:id
exports.getMember = asyncHandler(async (req, res) => {
  const member = await TeamMember.findOne({
    _id: req.params.id,
    isVisible: true,
  }).lean();
  if (!member) throw new AppError("Team member not found", 404);
  sendSuccess(res, 200, "Member fetched", { member });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/admin/team
exports.adminGetTeam = asyncHandler(async (req, res) => {
  const members = await TeamMember.find()
    .sort({ order: 1, createdAt: 1 })
    .lean();
  sendSuccess(res, 200, "Team fetched", { members });
});

// POST /api/admin/team
exports.createMember = asyncHandler(async (req, res) => {
  const { name, designation, quote, gender, paletteId, order, isVisible } =
    req.body;
  if (!name?.trim()) throw new AppError("Name is required", 400);

  // Parse tags JSON string
  let tags = ["Leadership", "Strategy", "Impact", "Enterprise"];
  if (req.body.tags) {
    try {
      tags = JSON.parse(req.body.tags);
    } catch {
      tags = [req.body.tags];
    }
  }

  const photo = req.file ? toPhoto(req.file) : { url: null, publicId: null };

  const member = await TeamMember.create({
    name,
    designation,
    quote,
    gender,
    paletteId: Number(paletteId) || 1,
    order: Number(order) || 0,
    isVisible: isVisible !== "false",
    tags,
    photo,
  });

  sendSuccess(res, 201, "Team member created", { member });
});

// PUT /api/admin/team/:id
exports.updateMember = asyncHandler(async (req, res) => {
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw new AppError("Team member not found", 404);

  const updates = {
    name: req.body.name,
    designation: req.body.designation,
    quote: req.body.quote,
    gender: req.body.gender,
    paletteId: Number(req.body.paletteId) || member.paletteId,
    order: Number(req.body.order) ?? member.order,
    isVisible: req.body.isVisible !== "false",
  };

  if (req.body.tags) {
    try {
      updates.tags = JSON.parse(req.body.tags);
    } catch {}
  }

  // New photo uploaded — delete old one from Cloudinary
  if (req.file) {
    await deleteFile(member.photo?.publicId);
    updates.photo = toPhoto(req.file);
  }

  // Remove photo if requested
  if (req.body.removePhoto === "true") {
    await deleteFile(member.photo?.publicId);
    updates.photo = { url: null, publicId: null };
  }

  const updated = await TeamMember.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  });
  sendSuccess(res, 200, "Team member updated", { member: updated });
});

// DELETE /api/admin/team/:id
exports.deleteMember = asyncHandler(async (req, res) => {
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw new AppError("Team member not found", 404);
  await deleteFile(member.photo?.publicId);
  await member.deleteOne();
  sendSuccess(res, 200, "Team member deleted");
});

// PATCH /api/admin/team/:id/toggle-visibility
exports.toggleVisibility = asyncHandler(async (req, res) => {
  const member = await TeamMember.findById(req.params.id);
  if (!member) throw new AppError("Team member not found", 404);
  member.isVisible = !member.isVisible;
  await member.save();
  sendSuccess(res, 200, `Member ${member.isVisible ? "shown" : "hidden"}`, {
    member,
  });
});

// PATCH /api/admin/team/reorder
exports.reorderTeam = asyncHandler(async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) throw new AppError("order must be an array", 400);
  await Promise.all(
    order.map(({ id, order: o }) =>
      TeamMember.findByIdAndUpdate(id, { order: o })
    )
  );
  sendSuccess(res, 200, "Order saved");
});
