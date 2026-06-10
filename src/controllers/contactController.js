const Contact = require('../models/Contact');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, sendSuccess, getPagination, paginatedResponse } = require('../utils/response');
const Notification = require('../models/Notification');
const User         = require('../models/User');

// ── Public ────────────────────────────────────────────────────────────────────

// @route  POST /api/contact
exports.submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name?.trim())    throw new AppError('Name is required', 400);
  if (!email?.trim())   throw new AppError('Email is required', 400);
  if (!message?.trim()) throw new AppError('Message is required', 400);

  const contact = await Contact.create({ name, email, phone, service, message });

  // ── Notify all admins about new contact message ───────────────────────
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('_id').lean();
    await Promise.all(admins.map(admin =>
      Notification.create({
        recipient: admin._id,
        type:      'SYSTEM_ALERT',
        title:     'New Contact Message',
        message:   `${name} (${email}) sent a message${service ? ` about ${service}` : ''}: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`,
      })
    ));
  } catch (err) {
    console.error('Contact notification failed:', err.message);
  }

  sendSuccess(res, 201, 'Message sent successfully! We will get back to you soon.', { contact });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// @route  GET /api/admin/contacts
exports.getContacts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { name:    new RegExp(req.query.search, 'i') },
      { email:   new RegExp(req.query.search, 'i') },
      { message: new RegExp(req.query.search, 'i') },
    ];
  }

  const [contacts, total, unreadCount] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Contact.countDocuments(filter),
    Contact.countDocuments({ status: 'Unread' }),
  ]);

  sendSuccess(res, 200, 'Contacts fetched', {
    ...paginatedResponse(contacts, total, page, limit),
    unreadCount,
  });
});

// @route  GET /api/admin/contacts/:id
exports.getContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) throw new AppError('Contact not found', 404);

  // Auto-mark as Read when opened
  if (contact.status === 'Unread') {
    contact.status = 'Read';
    await contact.save();
  }

  sendSuccess(res, 200, 'Contact fetched', { contact });
});

// @route  PATCH /api/admin/contacts/:id
exports.updateContact = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { ...(status     && { status }),
      ...(adminNotes !== undefined && { adminNotes }) },
    { new: true, runValidators: true }
  );
  if (!contact) throw new AppError('Contact not found', 404);
  sendSuccess(res, 200, 'Contact updated', { contact });
});

// @route  DELETE /api/admin/contacts/:id
exports.deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) throw new AppError('Contact not found', 404);
  await contact.deleteOne();
  sendSuccess(res, 200, 'Contact deleted');
});

// @route  GET /api/admin/contacts/stats
exports.getContactStats = asyncHandler(async (req, res) => {
  const stats = await Contact.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const total = await Contact.countDocuments();
  sendSuccess(res, 200, 'Stats fetched', { total, stats });
});