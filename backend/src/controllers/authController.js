const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, password_hash, full_name, role, department, position, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated. Contact HR.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    const { password_hash, ...userData } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userData,
    });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, full_name, department, position, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === 'admin123@gmail.com') {
      return res.status(403).json({ error: 'This email is reserved. Please use a different email.' });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const employeeIdResult = await query('SELECT COUNT(*) FROM users');
    const count = parseInt(employeeIdResult.rows[0].count) + 1;
    const employee_id = `EMP${String(count).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, department, position, phone, employee_id)
       VALUES ($1, $2, $3, 'employee', $4, $5, $6, $7)
       RETURNING id, email, full_name, role, department, position, phone, employee_id, join_date, created_at`,
      [normalizedEmail, password_hash, full_name, department, position, phone, employee_id]
    );

    res.status(201).json({
      message: 'Account created successfully. Please sign in.',
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, role, department, position, phone, employee_id,
              avatar_url, join_date, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, department, position } = req.body;

    const result = await query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           department = COALESCE($3, department),
           position = COALESCE($4, position)
       WHERE id = $5
       RETURNING id, email, full_name, role, department, position, phone, employee_id, avatar_url`,
      [full_name, phone, department, position, req.user.id]
    );

    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, getMe, updateProfile, changePassword };
