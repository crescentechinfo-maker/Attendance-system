const { query } = require('../config/database');
const { sendEmail, emailTemplates } = require('../config/email');

const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const applyLeave = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { leave_type, start_date, end_date, reason } = req.body;

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return res.status(400).json({ error: 'Cannot apply leave for past dates.' });
    }
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date cannot be before start date.' });
    }

    const overlapping = await query(
      `SELECT id FROM leaves
       WHERE user_id = $1
         AND status IN ('pending', 'approved')
         AND NOT (end_date < $2 OR start_date > $3)`,
      [userId, start_date, end_date]
    );

    if (overlapping.rows.length > 0) {
      return res.status(400).json({ error: 'Leave overlaps with an existing request.' });
    }

    const totalDays = calculateWorkingDays(start_date, end_date);

    const balanceResult = await query(
      `SELECT * FROM leave_balances
       WHERE user_id = $1 AND year = EXTRACT(YEAR FROM $2::date)`,
      [userId, start_date]
    );

    if (balanceResult.rows.length > 0) {
      const balance = balanceResult.rows[0];
      const leaveTypeKey = leave_type.toLowerCase().replace(' ', '_');

      const balanceMap = {
        'annual_leave': { total: balance.annual_leave, used: balance.used_annual },
        'sick_leave': { total: balance.sick_leave, used: balance.used_sick },
        'emergency_leave': { total: balance.emergency_leave, used: balance.used_emergency },
      };

      if (balanceMap[leaveTypeKey]) {
        const available = balanceMap[leaveTypeKey].total - balanceMap[leaveTypeKey].used;
        if (totalDays > available) {
          return res.status(400).json({
            error: `Insufficient ${leave_type} balance. Available: ${available} days, Requested: ${totalDays} days.`,
          });
        }
      }
    }

    const result = await query(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, total_days, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [userId, leave_type, start_date, end_date, totalDays, reason]
    );

    const leave = result.rows[0];

    const adminResult = await query(
      `SELECT email, full_name FROM users WHERE role IN ('admin', 'manager') AND is_active = true LIMIT 5`
    );

    const userResult = await query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const employeeName = userResult.rows[0]?.full_name;

    for (const admin of adminResult.rows) {
      const template = emailTemplates.leaveApplication(
        admin.full_name,
        employeeName,
        leave_type,
        start_date,
        end_date,
        reason
      );
      await sendEmail({ to: admin.email, ...template });
    }

    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'info')`,
      [userId, 'Leave Request Submitted', `Your ${leave_type} request from ${start_date} to ${end_date} has been submitted.`]
    );

    res.status(201).json({
      message: 'Leave application submitted successfully',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

const getMyLeaves = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, year, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ['l.user_id = $1'];
    let params = [userId];
    let paramCount = 2;

    if (status) {
      conditions.push(`l.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM l.start_date) = $${paramCount}`);
      params.push(year);
      paramCount++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(`SELECT COUNT(*) FROM leaves l ${where}`, params);

    const result = await query(
      `SELECT l.*, u.full_name AS approved_by_name
       FROM leaves l
       LEFT JOIN users u ON l.approved_by = u.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      leaves: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAllLeaves = async (req, res, next) => {
  try {
    const { status, user_id, leave_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`l.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    if (user_id) {
      conditions.push(`l.user_id = $${paramCount}`);
      params.push(user_id);
      paramCount++;
    }
    if (leave_type) {
      conditions.push(`l.leave_type = $${paramCount}`);
      params.push(leave_type);
      paramCount++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM leaves l ${where}`, params);

    const result = await query(
      `SELECT l.*, u.full_name, u.employee_id, u.department,
              a.full_name AS approved_by_name
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       LEFT JOIN users a ON l.approved_by = a.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      leaves: result.rows,
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

const approveLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;
    const approvedBy = req.user.id;

    const leaveResult = await query(
      `SELECT l.*, u.full_name, u.email FROM leaves l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (leaveResult.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    const leave = leaveResult.rows[0];

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Leave already ${leave.status}.` });
    }

    const result = await query(
      `UPDATE leaves
       SET status = 'approved', approved_by = $1, approval_notes = $2, approved_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [approvedBy, approval_notes, id]
    );

    const leaveTypeKey = leave.leave_type.toLowerCase().replace(' ', '_');
    const updateMap = {
      'annual_leave': 'used_annual',
      'sick_leave': 'used_sick',
      'emergency_leave': 'used_emergency',
    };

    if (updateMap[leaveTypeKey]) {
      await query(
        `UPDATE leave_balances
         SET ${updateMap[leaveTypeKey]} = ${updateMap[leaveTypeKey]} + $1
         WHERE user_id = $2 AND year = EXTRACT(YEAR FROM $3::date)`,
        [leave.total_days, leave.user_id, leave.start_date]
      );
    }

    await query(
      `UPDATE attendance
       SET status = 'on_leave'
       WHERE user_id = $1 AND date BETWEEN $2 AND $3`,
      [leave.user_id, leave.start_date, leave.end_date]
    );

    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
       VALUES ($1, $2, $3, 'success', $4, 'leave')`,
      [leave.user_id, 'Leave Approved', `Your ${leave.leave_type} request has been approved.`, id]
    );

    const template = emailTemplates.leaveApproved(
      leave.full_name,
      leave.leave_type,
      leave.start_date,
      leave.end_date
    );
    await sendEmail({ to: leave.email, ...template });

    res.json({ message: 'Leave approved successfully', leave: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const rejectLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;
    const rejectedBy = req.user.id;

    const leaveResult = await query(
      `SELECT l.*, u.full_name, u.email FROM leaves l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (leaveResult.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    const leave = leaveResult.rows[0];

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Leave already ${leave.status}.` });
    }

    const result = await query(
      `UPDATE leaves
       SET status = 'rejected', approved_by = $1, approval_notes = $2, approved_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rejectedBy, approval_notes, id]
    );

    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
       VALUES ($1, $2, $3, 'error', $4, 'leave')`,
      [leave.user_id, 'Leave Rejected', `Your ${leave.leave_type} request has been rejected.`, id]
    );

    const template = emailTemplates.leaveRejected(
      leave.full_name,
      leave.leave_type,
      leave.start_date,
      leave.end_date,
      approval_notes
    );
    await sendEmail({ to: leave.email, ...template });

    res.json({ message: 'Leave rejected', leave: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const cancelLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const leaveResult = await query(
      'SELECT * FROM leaves WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (leaveResult.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    const leave = leaveResult.rows[0];

    if (!['pending', 'approved'].includes(leave.status)) {
      return res.status(400).json({ error: 'Cannot cancel this leave request.' });
    }

    await query(
      `UPDATE leaves SET status = 'cancelled' WHERE id = $1`,
      [id]
    );

    if (leave.status === 'approved') {
      const leaveTypeKey = leave.leave_type.toLowerCase().replace(' ', '_');
      const updateMap = {
        'annual_leave': 'used_annual',
        'sick_leave': 'used_sick',
        'emergency_leave': 'used_emergency',
      };

      if (updateMap[leaveTypeKey]) {
        await query(
          `UPDATE leave_balances
           SET ${updateMap[leaveTypeKey]} = GREATEST(0, ${updateMap[leaveTypeKey]} - $1)
           WHERE user_id = $2 AND year = EXTRACT(YEAR FROM $3::date)`,
          [leave.total_days, userId, leave.start_date]
        );
      }
    }

    res.json({ message: 'Leave cancelled successfully.' });
  } catch (error) {
    next(error);
  }
};

const getLeaveBalance = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;
    const year = req.query.year || new Date().getFullYear();

    let result = await query(
      'SELECT * FROM leave_balances WHERE user_id = $1 AND year = $2',
      [userId, year]
    );

    if (result.rows.length === 0) {
      await query(
        'INSERT INTO leave_balances (user_id, year) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, year]
      );
      result = await query(
        'SELECT * FROM leave_balances WHERE user_id = $1 AND year = $2',
        [userId, year]
      );
    }

    const balance = result.rows[0];
    const computed = {
      ...balance,
      available_annual: balance.annual_leave - balance.used_annual,
      available_sick: balance.sick_leave - balance.used_sick,
      available_emergency: balance.emergency_leave - balance.used_emergency,
    };

    res.json({ balance: computed });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveBalance,
};
