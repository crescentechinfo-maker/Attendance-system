const router = require('express').Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getAttendanceReport,
  getLeaveReport,
  getDashboardStats,
  getNotifications,
  markNotificationsRead,
} = require('../controllers/reportController');

router.get('/dashboard', auth, adminAuth, getDashboardStats);
router.get('/attendance', auth, adminAuth, getAttendanceReport);
router.get('/leaves', auth, adminAuth, getLeaveReport);
router.get('/notifications', auth, getNotifications);
router.put('/notifications/read', auth, markNotificationsRead);

module.exports = router;
