const router = require('express').Router();
const { body } = require('express-validator');
const { auth, adminAuth, strictAdminAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
} = require('../controllers/employeeController');

router.get('/', auth, adminAuth, getAllEmployees);
router.get('/departments', auth, getDepartments);
router.get('/:id', auth, adminAuth, getEmployee);

router.post(
  '/',
  auth,
  strictAdminAuth,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('full_name').trim().notEmpty().withMessage('Full name required'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'employee'])
      .withMessage('Invalid role'),
  ],
  validate,
  createEmployee
);

router.put('/:id', auth, adminAuth, updateEmployee);
router.delete('/:id', auth, strictAdminAuth, deleteEmployee);

module.exports = router;
