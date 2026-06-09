const Notification = require('../models/Notification');

const createNotification = async ({ recipient, type, title, message, relatedProperty = null, relatedInquiry = null }) => {
  try {
    await Notification.create({ recipient, type, title, message, relatedProperty, relatedInquiry });
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
};

module.exports = { createNotification };
