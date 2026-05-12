// Demo mode — all data is fake and stored in localStorage

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const MOCK_USERS = {
  'admin123@gmail.com': {
    id: 'mock-admin-001',
    email: 'admin123@gmail.com',
    full_name: 'System Administrator',
    role: 'admin',
    department: 'IT',
    position: 'System Admin',
    phone: '+60123456789',
    employee_id: 'EMP0001',
    is_active: true,
    join_date: '2023-01-01',
  },
  'employee@demo.com': {
    id: 'mock-emp-001',
    email: 'employee@demo.com',
    full_name: 'Demo Employee',
    role: 'employee',
    department: 'Engineering',
    position: 'Software Developer',
    phone: '+60198765432',
    employee_id: 'EMP0002',
    is_active: true,
    join_date: '2024-01-15',
  },
};

const PASSWORDS = {
  'admin123@gmail.com': 'Admin123',
  'employee@demo.com': 'Demo1234',
};

const today = new Date().toISOString().split('T')[0];

const MOCK_ATTENDANCE = [
  { id: 'att-1', date: today, check_in: `${today}T08:45:00Z`, check_out: `${today}T17:30:00Z`, working_hours: 8.75, status: 'present' },
  { id: 'att-2', date: getPastDate(1), check_in: `${getPastDate(1)}T09:10:00Z`, check_out: `${getPastDate(1)}T18:00:00Z`, working_hours: 8.83, status: 'late' },
  { id: 'att-3', date: getPastDate(2), check_in: `${getPastDate(2)}T08:30:00Z`, check_out: `${getPastDate(2)}T17:00:00Z`, working_hours: 8.5, status: 'present' },
  { id: 'att-4', date: getPastDate(3), check_in: null, check_out: null, working_hours: null, status: 'absent' },
  { id: 'att-5', date: getPastDate(4), check_in: `${getPastDate(4)}T08:55:00Z`, check_out: `${getPastDate(4)}T17:15:00Z`, working_hours: 8.33, status: 'present' },
];

function getPastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const MOCK_LEAVES = [
  { id: 'leave-1', leave_type: 'Annual Leave', start_date: getPastDate(30), end_date: getPastDate(28), total_days: 3, reason: 'Family vacation', status: 'approved', created_at: new Date(Date.now() - 35 * 86400000).toISOString() },
  { id: 'leave-2', leave_type: 'Sick Leave', start_date: getPastDate(10), end_date: getPastDate(10), total_days: 1, reason: 'Fever and flu', status: 'approved', created_at: new Date(Date.now() - 12 * 86400000).toISOString() },
  { id: 'leave-3', leave_type: 'Annual Leave', start_date: getPastDate(-5), end_date: getPastDate(-3), total_days: 3, reason: 'Personal trip', status: 'pending', created_at: new Date().toISOString() },
];

const MOCK_BALANCE = {
  annual_leave: 21, used_annual: 4,
  sick_leave: 14, used_sick: 1,
  emergency_leave: 3, used_emergency: 0,
  year: new Date().getFullYear(),
};

const MOCK_EMPLOYEES = [
  { id: 'mock-admin-001', full_name: 'System Administrator', email: 'admin123@gmail.com', role: 'admin', department: 'IT', position: 'System Admin', employee_id: 'EMP0001', is_active: true, join_date: '2023-01-01' },
  { id: 'mock-emp-001', full_name: 'Demo Employee', email: 'employee@demo.com', role: 'employee', department: 'Engineering', position: 'Software Developer', employee_id: 'EMP0002', is_active: true, join_date: '2024-01-15' },
  { id: 'mock-emp-002', full_name: 'Sarah Johnson', email: 'sarah@demo.com', role: 'employee', department: 'HR', position: 'HR Executive', employee_id: 'EMP0003', is_active: true, join_date: '2024-03-01' },
  { id: 'mock-emp-003', full_name: 'Ali Hassan', email: 'ali@demo.com', role: 'manager', department: 'Engineering', position: 'Engineering Manager', employee_id: 'EMP0004', is_active: true, join_date: '2023-06-01' },
];

// ── Auth ──────────────────────────────────────────────────────────
export const mockAuthAPI = {
  login: async ({ email, password }) => {
    await delay();
    const user = MOCK_USERS[email.toLowerCase()];
    if (!user || PASSWORDS[email.toLowerCase()] !== password) {
      const err = new Error('Invalid email or password.');
      err.response = { data: { error: 'Invalid email or password.' } };
      throw err;
    }
    return { data: { token: 'demo-token', user } };
  },
  register: async ({ full_name, email, password }) => {
    await delay();
    if (MOCK_USERS[email.toLowerCase()]) {
      const err = new Error('Email already registered.');
      err.response = { data: { error: 'Email already registered.' } };
      throw err;
    }
    return { data: { message: 'Account created successfully. Please sign in.' } };
  },
  getMe: async () => {
    await delay(100);
    const stored = localStorage.getItem('user');
    const user = stored ? JSON.parse(stored) : null;
    if (!user) throw new Error('Not authenticated');
    return { data: { user } };
  },
  updateProfile: async (data) => {
    await delay();
    const stored = localStorage.getItem('user');
    const user = { ...JSON.parse(stored), ...data };
    localStorage.setItem('user', JSON.stringify(user));
    return { data: { message: 'Profile updated', user } };
  },
  changePassword: async () => {
    await delay();
    return { data: { message: 'Password changed successfully.' } };
  },
};

// ── Attendance ────────────────────────────────────────────────────
export const mockAttendanceAPI = {
  checkIn: async () => {
    await delay();
    const now = new Date().toISOString();
    localStorage.setItem('demo_checkin', now);
    return { data: { message: 'Checked in successfully', check_in: now } };
  },
  checkOut: async () => {
    await delay();
    const now = new Date().toISOString();
    localStorage.removeItem('demo_checkin');
    return { data: { message: 'Checked out successfully', check_out: now } };
  },
  getToday: async () => {
    await delay(100);
    const checkIn = localStorage.getItem('demo_checkin');
    const record = checkIn
      ? { id: 'today', date: today, check_in: checkIn, check_out: null, status: 'present', working_hours: null }
      : null;
    return { data: { attendance: record } };
  },
  getMy: async () => {
    await delay();
    return { data: { attendance: MOCK_ATTENDANCE, total: MOCK_ATTENDANCE.length } };
  },
  getAll: async () => {
    await delay();
    const records = MOCK_EMPLOYEES.flatMap((emp) =>
      MOCK_ATTENDANCE.slice(0, 3).map((a) => ({ ...a, id: `${emp.id}-${a.id}`, user: emp }))
    );
    return { data: { attendance: records, total: records.length } };
  },
  update: async (id, data) => {
    await delay();
    return { data: { message: 'Updated', attendance: { id, ...data } } };
  },
  getSummary: async () => {
    await delay(100);
    return { data: { present: 8, absent: 1, late: 2, on_leave: 1 } };
  },
};

// ── Leaves ────────────────────────────────────────────────────────
export const mockLeaveAPI = {
  apply: async (data) => {
    await delay();
    const newLeave = { id: `leave-${Date.now()}`, ...data, status: 'pending', created_at: new Date().toISOString() };
    return { data: { message: 'Leave applied successfully', leave: newLeave } };
  },
  getMy: async () => {
    await delay();
    return { data: { leaves: MOCK_LEAVES, total: MOCK_LEAVES.length } };
  },
  getAll: async () => {
    await delay();
    const allLeaves = MOCK_EMPLOYEES.slice(1).flatMap((emp) =>
      MOCK_LEAVES.map((l) => ({ ...l, id: `${emp.id}-${l.id}`, user: emp }))
    );
    return { data: { leaves: allLeaves, total: allLeaves.length } };
  },
  approve: async (id) => {
    await delay();
    return { data: { message: 'Leave approved' } };
  },
  reject: async (id) => {
    await delay();
    return { data: { message: 'Leave rejected' } };
  },
  cancel: async (id) => {
    await delay();
    return { data: { message: 'Leave cancelled' } };
  },
  getBalance: async () => {
    await delay(100);
    return { data: { balance: MOCK_BALANCE } };
  },
};

// ── Employees ─────────────────────────────────────────────────────
export const mockEmployeeAPI = {
  getAll: async () => {
    await delay();
    return { data: { employees: MOCK_EMPLOYEES, total: MOCK_EMPLOYEES.length } };
  },
  getOne: async (id) => {
    await delay(100);
    return { data: { employee: MOCK_EMPLOYEES.find((e) => e.id === id) || MOCK_EMPLOYEES[0] } };
  },
  create: async (data) => {
    await delay();
    return { data: { message: 'Employee created', employee: { id: `mock-${Date.now()}`, ...data } } };
  },
  update: async (id, data) => {
    await delay();
    return { data: { message: 'Employee updated', employee: { id, ...data } } };
  },
  delete: async () => {
    await delay();
    return { data: { message: 'Employee deactivated' } };
  },
  getDepartments: async () => {
    await delay(100);
    return { data: { departments: ['Engineering', 'HR', 'IT', 'Sales', 'Finance'] } };
  },
};

// ── Reports ───────────────────────────────────────────────────────
export const mockReportAPI = {
  getDashboard: async () => {
    await delay();
    return {
      data: {
        total_employees: 4,
        active_employees: 4,
        present_today: 3,
        absent_today: 1,
        late_today: 1,
        on_leave_today: 0,
        pending_leaves: 1,
        recent_activity: MOCK_ATTENDANCE.slice(0, 5).map((a) => ({
          ...a,
          user: MOCK_EMPLOYEES[1],
        })),
      },
    };
  },
  getAttendance: async () => {
    await delay();
    return { data: { summary: [], trend: [] } };
  },
  getLeaves: async () => {
    await delay();
    return { data: { summary: [], by_type: [] } };
  },
  getNotifications: async () => {
    await delay(100);
    return {
      data: {
        notifications: [
          { id: 'n1', title: 'Demo Mode Active', message: 'You are using demo mode. No real data is saved.', type: 'info', is_read: false, created_at: new Date().toISOString() },
        ],
      },
    };
  },
  markNotificationsRead: async () => {
    await delay(100);
    return { data: { message: 'Marked as read' } };
  },
};
