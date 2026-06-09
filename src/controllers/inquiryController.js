const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, sendSuccess, getPagination, paginatedResponse } = require('../utils/response');
const { createNotification } = require('../utils/notification');

// @route  POST /api/properties/:id/inquiries
exports.submitInquiry = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) throw new AppError('Property not found', 404);

  const inquiry = await Inquiry.create({
    property: property._id,
    user: req.user?._id || null,
    ...req.body,
  });

  // Notify admin (property owner / approver) - simplified: notify property submitter
  if (property.submittedBy) {
    await createNotification({
      recipient: property.submittedBy,
      type: 'INQUIRY_RECEIVED',
      title: 'New Inquiry',
      message: `New ${inquiry.inquiryType} inquiry on "${property.title}" from ${inquiry.name}`,
      relatedProperty: property._id,
      relatedInquiry: inquiry._id,
    });
  }

  sendSuccess(res, 201, 'Inquiry submitted', { inquiry });
});

// @route  GET /api/user/inquiries  (user — their inquiries)
exports.getMyInquiries = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { user: req.user._id };

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter)
      .populate('property', 'title thumbnail city listingType price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Inquiry.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Inquiries fetched', paginatedResponse(inquiries, total, page, limit));
});

// @route  GET /api/admin/inquiries
exports.adminGetInquiries = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.propertyId) filter.property = req.query.propertyId;
  if (req.query.inquiryType) filter.inquiryType = req.query.inquiryType;

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter)
      .populate('property', 'title city')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Inquiry.countDocuments(filter),
  ]);

  sendSuccess(res, 200, 'Inquiries fetched', paginatedResponse(inquiries, total, page, limit));
});

// @route  PATCH /api/admin/inquiries/:id
exports.updateInquiry = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const inquiry = await Inquiry.findByIdAndUpdate(
    req.params.id,
    { status, adminNotes },
    { new: true, runValidators: true }
  );
  if (!inquiry) throw new AppError('Inquiry not found', 404);
  sendSuccess(res, 200, 'Inquiry updated', { inquiry });
});
