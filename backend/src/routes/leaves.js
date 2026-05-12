const router = require('express').Router();
const { body } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveBalance,
} = require('../controllers/leaveController');

router.post(
  '/apply',
  auth,
  [
    body('leave_type').notEmpty().withMessage('Leave type required'),
    body('start_date').isDate().withMessage('Valid start date required'),
    body('end_date').isDate().withMessage('Valid end date required'),
    body('reason').trim().notEmpty().withMessage('Reason required'),
  ],
  validate,
  applyLeave
);

router.get('/my', auth, getMyLeaves);
router.get('/balance', auth, getLeaveBalance);
router.get('/balance/:userId', auth, adminAuth, getLeaveBalance);
router.get('/', auth, adminAuth, getAllLeaves);
router.put('/:id/approve', auth, adminAuth, approveLeave);
router.put('/:id/reject', auth, adminAuth, rejectLeave);
router.put('/:id/cancel', auth, cancelLeave);

module.exports = router;
