const router = require('express').Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  updateAttendance,
  getAttendanceSummary,
} = require('../controllers/attendanceController');

router.post('/checkin', auth, checkIn);
router.post('/checkout', auth, checkOut);
router.get('/today', auth, getTodayAttendance);
router.get('/my', auth, getMyAttendance);
router.get('/summary', auth, adminAuth, getAttendanceSummary);
router.get('/', auth, adminAuth, getAllAttendance);
router.put('/:id', auth, adminAuth, updateAttendance);

module.exports = router;
