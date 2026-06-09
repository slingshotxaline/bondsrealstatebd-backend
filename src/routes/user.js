const express = require('express');
const router = express.Router();

const { getNotifications, markAllRead, markRead } = require('../controllers/notificationController');
const { getMyInquiries } = require('../controllers/inquiryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllRead);
router.patch('/notifications/:id/read', markRead);

router.get('/inquiries', getMyInquiries);

module.exports = router;
