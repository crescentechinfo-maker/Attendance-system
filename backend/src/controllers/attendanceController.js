const { query } = require('../config/database');

const LATE_THRESHOLD_HOUR = 9; // 9:00 AM

const checkIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const existing = await query(
      'SELECT id, check_in, check_out FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].check_in) {
        return res.status(400).json({ error: 'Already checked in today.' });
      }
    }

    const checkInHour = now.getHours();
    const status = checkInHour >= LATE_THRESHOLD_HOUR ? 'late' : 'present';

    const result = await query(
      `INSERT INTO attendance (user_id, date, check_in, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, date)
       DO UPDATE SET check_in = $3, status = $4
       RETURNING *`,
      [userId, today, now.toISOString(), status]
    );

    res.json({
      message: 'Checked in successfully',
      attendance: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const existing = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].check_in) {
      return res.status(400).json({ error: 'No check-in found for today.' });
    }

    if (existing.rows[0].check_out) {
      return res.status(400).json({ error: 'Already checked out today.' });
    }

    const checkInTime = new Date(existing.rows[0].check_in);
    const workingHours = ((now - checkInTime) / (1000 * 60 * 60)).toFixed(2);

    const result = await query(
      `UPDATE attendance
       SET check_out = $1, working_hours = $2
       WHERE user_id = $3 AND date = $4
       RETURNING *`,
      [now.toISOString(), workingHours, userId, today]
    );

    res.json({
      message: 'Checked out successfully',
      attendance: result.rows[0],
      working_hours: parseFloat(workingHours),
    });
  } catch (error) {
    next(error);
  }
};

const getTodayAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [userId, today]
    );

    res.json({
      attendance: result.rows[0] || null,
      date: today,
    });
  } catch (error) {
    next(error);
  }
};

const getMyAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year, page = 1, limit = 31 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const result = await query(
      `SELECT * FROM attendance
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       ORDER BY date DESC
       LIMIT $4 OFFSET $5`,
      [userId, targetMonth, targetYear, parseInt(limit), offset]
    );

    const statsResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present') AS present_days,
         COUNT(*) FILTER (WHERE status = 'late') AS late_days,
         COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
         COUNT(*) FILTER (WHERE status = 'on_leave') AS leave_days,
         ROUND(AVG(working_hours)::numeric, 2) AS avg_working_hours,
         SUM(working_hours) AS total_working_hours
       FROM attendance
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [userId, targetMonth, targetYear]
    );

    res.json({
      attendance: result.rows,
      stats: statsResult.rows[0],
      month: targetMonth,
      year: targetYear,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAttendance = async (req, res, next) => {
  try {
    const { date, user_id, month, year, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramCount = 1;

    if (date) {
      conditions.push(`a.date = $${paramCount}`);
      params.push(date);
      paramCount++;
    } else if (month && year) {
      conditions.push(`EXTRACT(MONTH FROM a.date) = $${paramCount}`);
      params.push(month);
      paramCount++;
      conditions.push(`EXTRACT(YEAR FROM a.date) = $${paramCount}`);
      params.push(year);
      paramCount++;
    } else if (year) {
      conditions.push(`EXTRACT(YEAR FROM a.date) = $${paramCount}`);
      params.push(year);
      paramCount++;
    }

    if (user_id) {
      conditions.push(`a.user_id = $${paramCount}`);
      params.push(user_id);
      paramCount++;
    }
    if (status) {
      conditions.push(`a.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM attendance a ${where}`,
      params
    );

    const result = await query(
      `SELECT a.*, u.full_name, u.employee_id, u.department
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.date DESC, u.full_name ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      attendance: result.rows,
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

const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status, notes } = req.body;

    let workingHours = null;
    if (check_in && check_out) {
      const checkInTime = new Date(check_in);
      const checkOutTime = new Date(check_out);
      workingHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);
    }

    const result = await query(
      `UPDATE attendance
       SET check_in = COALESCE($1, check_in),
           check_out = COALESCE($2, check_out),
           status = COALESCE($3, status),
           notes = COALESCE($4, notes),
           working_hours = COALESCE($5, working_hours)
       WHERE id = $6
       RETURNING *`,
      [check_in, check_out, status, notes, workingHours, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    res.json({ message: 'Attendance updated', attendance: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getAttendanceSummary = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT
         COUNT(DISTINCT u.id) AS total_employees,
         COUNT(DISTINCT a.user_id) FILTER (WHERE a.date = $1 AND a.check_in IS NOT NULL) AS present_today,
         COUNT(DISTINCT a.user_id) FILTER (WHERE a.date = $1 AND a.status = 'late') AS late_today,
         COUNT(DISTINCT a.user_id) FILTER (WHERE a.date = $1 AND a.status = 'on_leave') AS on_leave_today
       FROM users u
       LEFT JOIN attendance a ON u.id = a.user_id
       WHERE u.is_active = true AND u.role != 'admin'`,
      [today]
    );

    res.json({ summary: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  updateAttendance,
  getAttendanceSummary,
};
