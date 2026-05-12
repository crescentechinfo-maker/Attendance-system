// Full localStorage-based API — no backend or database required
import { db, verifyPassword, genId } from './localDB';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const err = (msg, status = 400) => {
  const e = new Error(msg);
  e.response = { data: { error: msg }, status };
  throw e;
};

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login: async ({ email, password }) => {
    await delay();
    const user = db.users.findByEmail(email);
    if (!user) err('Invalid email or password.', 401);
    if (!user.is_active) err('Account is deactivated. Contact admin.', 401);
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) err('Invalid email or password.', 401);
    const token = btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role }));
    return { data: { token, user: db.users.safe(user) } };
  },

  register: async ({ email, password, full_name, department, position, phone }) => {
    await delay();
    if (email.toLowerCase().trim() === 'admin123@gmail.com')
      err('This email is reserved.', 403);
    if (db.users.findByEmail(email))
      err('Email already registered.', 409);
    const user = await db.users.create({ email, password, full_name, department, position, phone });
    return { data: { message: 'Account created successfully. Please sign in.', user: db.users.safe(user) } };
  },

  getMe: async () => {
    await delay(100);
    const stored = localStorage.getItem('user');
    if (!stored) err('Not authenticated', 401);
    const u = JSON.parse(stored);
    const user = db.users.findById(u.id);
    if (!user) err('User not found', 404);
    return { data: { user: db.users.safe(user) } };
  },

  updateProfile: async ({ full_name, phone, department, position }) => {
    await delay();
    const stored = localStorage.getItem('user');
    const u = JSON.parse(stored);
    const updated = db.users.update(u.id, { full_name, phone, department, position });
    localStorage.setItem('user', JSON.stringify(db.users.safe(updated)));
    return { data: { message: 'Profile updated', user: db.users.safe(updated) } };
  },

  changePassword: async ({ current_password, new_password }) => {
    await delay();
    const stored = JSON.parse(localStorage.getItem('user'));
    const user = db.users.findById(stored.id);
    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) err('Current password is incorrect.');
    const { hashPassword } = await import('./localDB');
    const hash = await hashPassword(new_password);
    db.users.update(user.id, { password_hash: hash });
    return { data: { message: 'Password changed successfully.' } };
  },
};

// ── Employees ─────────────────────────────────────────────────────
export const employeeAPI = {
  getAll: async (params = {}) => {
    await delay();
    let employees = db.users.findAll().map(db.users.safe);
    if (params.search) {
      const s = params.search.toLowerCase();
      employees = employees.filter((e) =>
        e.full_name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s)
      );
    }
    if (params.department) employees = employees.filter((e) => e.department === params.department);
    return { data: { employees, total: employees.length } };
  },
  getOne: async (id) => {
    await delay(100);
    const user = db.users.findById(id);
    if (!user) err('Employee not found', 404);
    return { data: { employee: db.users.safe(user) } };
  },
  create: async (data) => {
    await delay();
    if (db.users.findByEmail(data.email)) err('Email already registered.', 409);
    const user = await db.users.create({ ...data, password: data.password || 'Welcome@123' });
    return { data: { message: 'Employee created', employee: db.users.safe(user) } };
  },
  update: async (id, data) => {
    await delay();
    const updated = db.users.update(id, data);
    return { data: { message: 'Employee updated', employee: db.users.safe(updated) } };
  },
  delete: async (id) => {
    await delay();
    db.users.update(id, { is_active: false });
    return { data: { message: 'Employee deactivated' } };
  },
  getDepartments: async () => {
    await delay(100);
    const depts = [...new Set(db.users.findAll().map((u) => u.department).filter(Boolean))];
    return { data: { departments: depts } };
  },
};

// ── Attendance ────────────────────────────────────────────────────
export const attendanceAPI = {
  checkIn: async () => {
    await delay();
    const user = JSON.parse(localStorage.getItem('user'));
    const today = new Date().toISOString().split('T')[0];
    const existing = db.attendance.findByUserAndDate(user.id, today);
    if (existing?.check_in) err('Already checked in today.');
    const checkInTime = new Date().toISOString();
    const hour = new Date().getHours();
    const status = hour >= 9 ? 'late' : 'present';
    let record;
    if (existing) {
      record = db.attendance.update(existing.id, { check_in: checkInTime, status });
    } else {
      record = db.attendance.create({ user_id: user.id, date: today, check_in: checkInTime, check_out: null, working_hours: null, status });
    }
    return { data: { message: 'Checked in successfully', attendance: record } };
  },

  checkOut: async () => {
    await delay();
    const user = JSON.parse(localStorage.getItem('user'));
    const today = new Date().toISOString().split('T')[0];
    const existing = db.attendance.findByUserAndDate(user.id, today);
    if (!existing?.check_in) err('You have not checked in today.');
    if (existing?.check_out) err('Already checked out today.');
    const checkOutTime = new Date().toISOString();
    const ms = new Date(checkOutTime) - new Date(existing.check_in);
    const working_hours = Math.round((ms / 3600000) * 100) / 100;
    const record = db.attendance.update(existing.id, { check_out: checkOutTime, working_hours });
    return { data: { message: 'Checked out successfully', attendance: record } };
  },

  getToday: async () => {
    await delay(100);
    const user = JSON.parse(localStorage.getItem('user'));
    const today = new Date().toISOString().split('T')[0];
    const record = db.attendance.findByUserAndDate(user.id, today);
    return { data: { attendance: record || null } };
  },

  getMy: async () => {
    await delay();
    const user = JSON.parse(localStorage.getItem('user'));
    const records = db.attendance.findByUser(user.id);
    return { data: { attendance: records, total: records.length } };
  },

  getAll: async (params = {}) => {
    await delay();
    const users = db.users.findAll();
    let records = db.attendance.findAll().map((a) => ({
      ...a,
      user: db.users.safe(users.find((u) => u.id === a.user_id) || {}),
    }));
    if (params.user_id) records = records.filter((r) => r.user_id === params.user_id);
    if (params.date) records = records.filter((r) => r.date === params.date);
    return { data: { attendance: records, total: records.length } };
  },

  update: async (id, data) => {
    await delay();
    const record = db.attendance.update(id, data);
    return { data: { message: 'Updated', attendance: record } };
  },

  getSummary: async () => {
    await delay(100);
    const today = new Date().toISOString().split('T')[0];
    const todayRecs = db.attendance.findAll().filter((a) => a.date === today);
    return {
      data: {
        present: todayRecs.filter((a) => a.status === 'present').length,
        late: todayRecs.filter((a) => a.status === 'late').length,
        absent: todayRecs.filter((a) => a.status === 'absent').length,
        on_leave: todayRecs.filter((a) => a.status === 'on_leave').length,
      },
    };
  },
};

// ── Leaves ────────────────────────────────────────────────────────
function countWorkingDays(start, end) {
  let count = 0;
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

const BALANCE_MAP = {
  'Annual Leave': 'annual', 'Sick Leave': 'sick', 'Emergency Leave': 'emergency',
};

export const leaveAPI = {
  apply: async ({ leave_type, start_date, end_date, reason }) => {
    await delay();
    const user = JSON.parse(localStorage.getItem('user'));
    const days = countWorkingDays(start_date, end_date);
    if (days <= 0) err('Invalid date range.');

    const bal = db.balances.findByUser(user.id);
    const key = BALANCE_MAP[leave_type];
    if (key && bal) {
      const allowed = bal[`${key}_leave`] - bal[`used_${key}`];
      if (days > allowed) err(`Insufficient ${leave_type} balance. Available: ${allowed} days.`);
    }

    const leave = db.leaves.create({ user_id: user.id, leave_type, start_date, end_date, total_days: days, reason });
    return { data: { message: 'Leave applied successfully', leave } };
  },

  getMy: async () => {
    await delay();
    const user = JSON.parse(localStorage.getItem('user'));
    const leaves = db.leaves.findByUser(user.id);
    return { data: { leaves, total: leaves.length } };
  },

  getAll: async (params = {}) => {
    await delay();
    const users = db.users.findAll();
    let leaves = db.leaves.findAll().map((l) => ({
      ...l,
      user: db.users.safe(users.find((u) => u.id === l.user_id) || {}),
    }));
    if (params.status) leaves = leaves.filter((l) => l.status === params.status);
    return { data: { leaves, total: leaves.length } };
  },

  approve: async (id, { notes } = {}) => {
    await delay();
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const leave = db.leaves.findById(id);
    if (!leave) err('Leave not found', 404);
    db.leaves.update(id, { status: 'approved', approval_notes: notes || '', approved_by: currentUser.id, approved_at: new Date().toISOString() });
    const key = BALANCE_MAP[leave.leave_type];
    if (key) {
      const bal = db.balances.findByUser(leave.user_id);
      if (bal) db.balances.update(leave.user_id, { [`used_${key}`]: (bal[`used_${key}`] || 0) + leave.total_days });
    }
    db.notifications.create({ user_id: leave.user_id, title: 'Leave Approved', message: `Your ${leave.leave_type} request has been approved.`, type: 'success' });
    return { data: { message: 'Leave approved' } };
  },

  reject: async (id, { notes } = {}) => {
    await delay();
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const leave = db.leaves.findById(id);
    if (!leave) err('Leave not found', 404);
    db.leaves.update(id, { status: 'rejected', approval_notes: notes || '', approved_by: currentUser.id, approved_at: new Date().toISOString() });
    db.notifications.create({ user_id: leave.user_id, title: 'Leave Rejected', message: `Your ${leave.leave_type} request has been rejected.`, type: 'error' });
    return { data: { message: 'Leave rejected' } };
  },

  cancel: async (id) => {
    await delay();
    const leave = db.leaves.findById(id);
    if (!leave) err('Leave not found', 404);
    if (leave.status === 'approved') {
      const key = BALANCE_MAP[leave.leave_type];
      if (key) {
        const bal = db.balances.findByUser(leave.user_id);
        if (bal) db.balances.update(leave.user_id, { [`used_${key}`]: Math.max(0, (bal[`used_${key}`] || 0) - leave.total_days) });
      }
    }
    db.leaves.update(id, { status: 'cancelled' });
    return { data: { message: 'Leave cancelled' } };
  },

  getBalance: async () => {
    await delay(100);
    const user = JSON.parse(localStorage.getItem('user'));
    const balance = db.balances.findByUser(user.id);
    return { data: { balance: balance || { annual_leave: 21, sick_leave: 14, emergency_leave: 3, used_annual: 0, used_sick: 0, used_emergency: 0 } } };
  },
};

// ── Reports ───────────────────────────────────────────────────────
export const reportAPI = {
  getDashboard: async () => {
    await delay();
    const allUsers = db.users.findAll();
    const today = new Date().toISOString().split('T')[0];
    const todayRecs = db.attendance.findAll().filter((a) => a.date === today);
    const pendingLeaves = db.leaves.findAll().filter((l) => l.status === 'pending');
    const recent = db.attendance.findAll().slice(0, 5).map((a) => ({
      ...a,
      user: db.users.safe(allUsers.find((u) => u.id === a.user_id) || {}),
    }));
    return {
      data: {
        total_employees: allUsers.length,
        active_employees: allUsers.filter((u) => u.is_active).length,
        present_today: todayRecs.filter((a) => ['present', 'late'].includes(a.status)).length,
        absent_today: todayRecs.filter((a) => a.status === 'absent').length,
        late_today: todayRecs.filter((a) => a.status === 'late').length,
        on_leave_today: todayRecs.filter((a) => a.status === 'on_leave').length,
        pending_leaves: pendingLeaves.length,
        recent_activity: recent,
      },
    };
  },

  getAttendance: async (params = {}) => {
    await delay();
    const users = db.users.findAll();
    const records = db.attendance.findAll();
    const summary = users.map((u) => {
      const recs = records.filter((r) => r.user_id === u.id);
      return {
        user: db.users.safe(u),
        present: recs.filter((r) => r.status === 'present').length,
        late: recs.filter((r) => r.status === 'late').length,
        absent: recs.filter((r) => r.status === 'absent').length,
        total_hours: recs.reduce((s, r) => s + (r.working_hours || 0), 0).toFixed(1),
      };
    });
    return { data: { summary, trend: [] } };
  },

  getLeaves: async () => {
    await delay();
    const users = db.users.findAll();
    const leaves = db.leaves.findAll();
    const summary = users.map((u) => {
      const ul = leaves.filter((l) => l.user_id === u.id);
      return {
        user: db.users.safe(u),
        total: ul.length,
        approved: ul.filter((l) => l.status === 'approved').length,
        pending: ul.filter((l) => l.status === 'pending').length,
        rejected: ul.filter((l) => l.status === 'rejected').length,
      };
    });
    return { data: { summary, by_type: [] } };
  },

  getNotifications: async () => {
    await delay(100);
    const user = JSON.parse(localStorage.getItem('user'));
    const notifications = db.notifications.findByUser(user.id);
    return { data: { notifications } };
  },

  markNotificationsRead: async () => {
    await delay(100);
    const user = JSON.parse(localStorage.getItem('user'));
    db.notifications.markRead(user.id);
    return { data: { message: 'Marked as read' } };
  },
};

export default { authAPI, employeeAPI, attendanceAPI, leaveAPI, reportAPI };
