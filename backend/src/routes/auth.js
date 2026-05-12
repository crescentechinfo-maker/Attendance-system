const router = require('express').Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  login,
  register,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and number'),
    body('full_name').trim().notEmpty().withMessage('Full name required'),
  ],
  validate,
  register
);

router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put(
  '/password',
  auth,
  [
    body('current_password').notEmpty().withMessage('Current password required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validate,
  changePassword
);

module.exports = router;
