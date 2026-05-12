const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const getAllEmployees = async (req, res, next) => {
  try {
    const { search, department, role, is_active, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`(full_name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR employee_id ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }
    if (department) {
      conditions.push(`department = $${paramCount}`);
      params.push(department);
      paramCount++;
    }
    if (role) {
      conditions.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }
    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(is_active === 'true');
      paramCount++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${where}`,
      params
    );

    const result = await query(
      `SELECT id, email, full_name, role, department, position, phone,
              employee_id, avatar_url, join_date, is_active, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      employees: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, email, full_name, role, department, position, phone,
              employee_id, avatar_url, join_date, is_active, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const balanceResult = await query(
      `SELECT * FROM leave_balances
       WHERE user_id = $1 AND year = EXTRACT(YEAR FROM NOW())`,
      [id]
    );

    res.json({
      employee: result.rows[0],
      leave_balance: balanceResult.rows[0] || null,
    });
  } catch (error) {
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const { email, password, full_name, role, department, position, phone, join_date } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password || 'Welcome@123', salt);

    const countResult = await query('SELECT COUNT(*) FROM users');
    const count = parseInt(countResult.rows[0].count) + 1;
    const employee_id = `EMP${String(count).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, department, position, phone, employee_id, join_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, full_name, role, department, position, phone, employee_id, join_date, is_active, created_at`,
      [
        email.toLowerCase().trim(),
        password_hash,
        full_name,
        role || 'employee',
        department,
        position,
        phone,
        employee_id,
        join_date || new Date().toISOString().split('T')[0],
      ]
    );

    res.status(201).json({
      message: 'Employee created successfully',
      employee: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, role, department, position, phone, is_active, join_date } = req.body;

    const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const result = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           role = COALESCE($2, role),
           department = COALESCE($3, department),
           position = COALESCE($4, position),
           phone = COALESCE($5, phone),
           is_active = COALESCE($6, is_active),
           join_date = COALESCE($7, join_date)
       WHERE id = $8
       RETURNING id, email, full_name, role, department, position, phone, employee_id, join_date, is_active`,
      [full_name, role, department, position, phone, is_active, join_date, id]
    );

    res.json({ message: 'Employee updated', employee: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    const result = await query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id, full_name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    res.json({ message: 'Employee deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

const getDepartments = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT department FROM users
       WHERE department IS NOT NULL AND is_active = true
       ORDER BY department`
    );

    res.json({ departments: result.rows.map(r => r.department) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
};
