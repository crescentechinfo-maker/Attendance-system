const { query } = require('../config/database');

const getAttendanceReport = async (req, res, next) => {
  try {
    const { month, year, department } = req.query;

    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    let conditions = [
      `EXTRACT(MONTH FROM a.date) = $1`,
      `EXTRACT(YEAR FROM a.date) = $2`,
    ];
    let params = [targetMonth, targetYear];
    let paramCount = 3;

    if (department) {
      conditions.push(`u.department = $${paramCount}`);
      params.push(department);
      paramCount++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT
         u.id,
         u.full_name,
         u.employee_id,
         u.department,
         COUNT(*) FILTER (WHERE a.status = 'present') AS present_days,
         COUNT(*) FILTER (WHERE a.status = 'late') AS late_days,
         COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_days,
         COUNT(*) FILTER (WHERE a.status = 'on_leave') AS leave_days,
         ROUND(AVG(a.working_hours)::numeric, 2) AS avg_working_hours,
         ROUND(SUM(a.working_hours)::numeric, 2) AS total_working_hours
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ${where}
       GROUP BY u.id, u.full_name, u.employee_id, u.department
       ORDER BY u.full_name`,
      params
    );

    const summary = await query(
      `SELECT
         COUNT(DISTINCT a.user_id) AS total_employees,
         COUNT(*) FILTER (WHERE a.status = 'present') AS total_present,
         COUNT(*) FILTER (WHERE a.status = 'late') AS total_late,
         COUNT(*) FILTER (WHERE a.status = 'absent') AS total_absent,
         COUNT(*) FILTER (WHERE a.status = 'on_leave') AS total_leave,
         ROUND(AVG(a.working_hours)::numeric, 2) AS avg_working_hours
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ${where}`,
      params
    );

    const dailyTrend = await query(
      `SELECT
         a.date,
         COUNT(*) FILTER (WHERE a.status = 'present') AS present,
         COUNT(*) FILTER (WHERE a.status = 'late') AS late,
         COUNT(*) FILTER (WHERE a.status = 'absent') AS absent,
         COUNT(*) FILTER (WHERE a.status = 'on_leave') AS on_leave
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       ${where}
       GROUP BY a.date
       ORDER BY a.date`,
      params
    );

    res.json({
      report: result.rows,
      summary: summary.rows[0],
      daily_trend: dailyTrend.rows,
      month: targetMonth,
      year: targetYear,
    });
  } catch (error) {
    next(error);
  }
};

const getLeaveReport = async (req, res, next) => {
  try {
    const { year, department, status } = req.query;
    const targetYear = year || new Date().getFullYear();

    let conditions = [`EXTRACT(YEAR FROM l.start_date) = $1`];
    let params = [targetYear];
    let paramCount = 2;

    if (department) {
      conditions.push(`u.department = $${paramCount}`);
      params.push(department);
      paramCount++;
    }
    if (status) {
      conditions.push(`l.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT
         u.id,
         u.full_name,
         u.employee_id,
         u.department,
         COUNT(*) FILTER (WHERE l.leave_type = 'Annual Leave') AS annual_taken,
         COUNT(*) FILTER (WHERE l.leave_type = 'Sick Leave') AS sick_taken,
         COUNT(*) FILTER (WHERE l.leave_type = 'Emergency Leave') AS emergency_taken,
         SUM(l.total_days) AS total_leave_days,
         COUNT(*) FILTER (WHERE l.status = 'pending') AS pending_requests
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       ${where}
       GROUP BY u.id, u.full_name, u.employee_id, u.department
       ORDER BY u.full_name`,
      params
    );

    const summary = await query(
      `SELECT
         COUNT(*) AS total_requests,
         COUNT(*) FILTER (WHERE l.status = 'approved') AS approved,
         COUNT(*) FILTER (WHERE l.status = 'rejected') AS rejected,
         COUNT(*) FILTER (WHERE l.status = 'pending') AS pending,
         SUM(l.total_days) FILTER (WHERE l.status = 'approved') AS total_approved_days
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       ${where}`,
      params
    );

    const leaveTypeDistribution = await query(
      `SELECT
         l.leave_type,
         COUNT(*) AS requests,
         SUM(l.total_days) AS total_days
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       ${where}
       GROUP BY l.leave_type
       ORDER BY requests DESC`,
      params
    );

    res.json({
      report: result.rows,
      summary: summary.rows[0],
      leave_distribution: leaveTypeDistribution.rows,
      year: targetYear,
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const employeeStats = await query(
      `SELECT
         COUNT(*) FILTER (WHERE is_active = true) AS total_employees,
         COUNT(*) FILTER (WHERE is_active = true AND role = 'employee') AS total_staff,
         COUNT(*) FILTER (WHERE is_active = true AND join_date >= DATE_TRUNC('month', NOW())) AS new_this_month
       FROM users WHERE role != 'admin'`
    );

    const attendanceStats = await query(
      `SELECT
         COUNT(*) FILTER (WHERE a.date = $1 AND a.check_in IS NOT NULL) AS present_today,
         COUNT(*) FILTER (WHERE a.date = $1 AND a.status = 'late') AS late_today,
         COUNT(*) FILTER (WHERE a.date = $1 AND a.status = 'on_leave') AS on_leave_today
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE u.is_active = true`,
      [today]
    );

    const leaveStats = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_leaves,
         COUNT(*) FILTER (WHERE status = 'approved' AND EXTRACT(MONTH FROM start_date) = $1 AND EXTRACT(YEAR FROM start_date) = $2) AS approved_this_month
       FROM leaves`,
      [currentMonth, currentYear]
    );

    const recentAttendance = await query(
      `SELECT a.date, a.status, a.check_in, a.check_out, u.full_name, u.department
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.date = $1
       ORDER BY a.check_in DESC
       LIMIT 10`,
      [today]
    );

    const pendingLeaves = await query(
      `SELECT l.*, u.full_name, u.department, u.employee_id
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       WHERE l.status = 'pending'
       ORDER BY l.created_at DESC
       LIMIT 5`
    );

    res.json({
      employees: employeeStats.rows[0],
      attendance: attendanceStats.rows[0],
      leaves: leaveStats.rows[0],
      recent_attendance: recentAttendance.rows,
      pending_leaves: pendingLeaves.rows,
    });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), offset]
    );

    const unreadCount = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;

    if (ids && ids.length > 0) {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2::uuid[])',
        [userId, ids]
      );
    } else {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1',
        [userId]
      );
    }

    res.json({ message: 'Notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendanceReport,
  getLeaveReport,
  getDashboardStats,
  getNotifications,
  markNotificationsRead,
};
