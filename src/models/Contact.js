const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name:    { type: String, required: [true, 'Name is required'],    trim: true },
    email:   { type: String, required: [true, 'Email is required'],   trim: true, lowercase: true },
    phone:   { type: String, trim: true, default: null },
    service: {
      type: String,
      enum: ['buy', 'sell', 'rent', 'invest', ''],
      default: '',
    },
    message: { type: String, required: [true, 'Message is required'] },

    // Admin management
    status: {
      type: String,
      enum: ['Unread', 'Read', 'Replied', 'Archived'],
      default: 'Unread',
    },
    adminNotes: { type: String, default: null },
  },
  { timestamps: true }
);

contactSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);