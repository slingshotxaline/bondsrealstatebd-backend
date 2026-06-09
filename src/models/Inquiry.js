const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    inquiryType: {
      type: String,
      enum: ['General', 'Purchase', 'Visit'],
      default: 'General',
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    message: { type: String, required: true },
    preferredVisitDate: { type: Date, default: null },

    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    adminNotes: { type: String, default: null },
  },
  { timestamps: true }
);

inquirySchema.index({ property: 1, status: 1 });
inquirySchema.index({ user: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
