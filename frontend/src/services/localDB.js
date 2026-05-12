// Browser localStorage database — no backend or Supabase needed
const P = 'ae_'; // prefix for all keys

// ── Crypto ────────────────────────────────────────────────────────
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password + '__ae_salt__');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  return (await hashPassword(password)) === hash;
}

// ── Table helpers ─────────────────────────────────────────────────
function getTable(name) {
  try { return JSON.parse(localStorage.getItem(P + name) || '[]'); }
  catch { return []; }
}

function saveTable(name, rows) {
  localStorage.setItem(P + name, JSON.stringify(rows));
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function now() { return new Date().toISOString(); }

// ── DB init (runs once on first load) ─────────────────────────────
export async function initDB() {
  // Leave types
  if (getTable('leave_types').length === 0) {
    saveTable('leave_types', [
      { id: genId(), name: 'Annual Leave',    days_allowed: 21, carry_forward: true  },
      { id: genId(), name: 'Sick Leave',      days_allowed: 14, carry_forward: false },
      { id: genId(), name: 'Emergency Leave', days_allowed: 3,  carry_forward: false },
      { id: genId(), name: 'Maternity Leave', days_allowed: 90, carry_forward: false },
      { id: genId(), name: 'Paternity Leave', days_allowed: 7,  carry_forward: false },
      { id: genId(), name: 'Unpaid Leave',    days_allowed: 0,  carry_forward: false },
    ]);
  }

  // Admin account
  const users = getTable('users');
  if (!users.find((u) => u.email === 'admin123@gmail.com')) {
    const hash = await hashPassword('Admin123');
    const adminId = genId();
    users.push({
      id: adminId,
      email: 'admin123@gmail.com',
      password_hash: hash,
      full_name: 'System Administrator',
      role: 'admin',
      department: 'IT',
      position: 'System Admin',
      phone: '',
      employee_id: 'EMP0001',
      is_active: true,
      join_date: now().split('T')[0],
      created_at: now(),
    });
    saveTable('users', users);
    _createLeaveBalance(adminId);
  }
}

function _createLeaveBalance(userId) {
  const year = new Date().getFullYear();
  const balances = getTable('leave_balances');
  if (!balances.find((b) => b.user_id === userId && b.year === year)) {
    balances.push({
      id: genId(), user_id: userId, year,
      annual_leave: 21, sick_leave: 14, emergency_leave: 3,
      used_annual: 0, used_sick: 0, used_emergency: 0,
      created_at: now(),
    });
    saveTable('leave_balances', balances);
  }
}

// ── Users ─────────────────────────────────────────────────────────
export const db = {
  users: {
    findByEmail: (email) => getTable('users').find((u) => u.email === email.toLowerCase().trim()) || null,
    findById: (id) => getTable('users').find((u) => u.id === id) || null,
    findAll: () => getTable('users'),
    create: async ({ email, password, full_name, department, position, phone }) => {
      const users = getTable('users');
      const count = users.length + 1;
      const user = {
        id: genId(),
        email: email.toLowerCase().trim(),
        password_hash: await hashPassword(password),
        full_name,
        role: 'employee',
        department: department || '',
        position: position || '',
        phone: phone || '',
        employee_id: `EMP${String(count).padStart(4, '0')}`,
        is_active: true,
        join_date: now().split('T')[0],
        created_at: now(),
      };
      users.push(user);
      saveTable('users', users);
      _createLeaveBalance(user.id);
      return user;
    },
    update: (id, updates) => {
      const users = getTable('users').map((u) => u.id === id ? { ...u, ...updates } : u);
      saveTable('users', users);
      return users.find((u) => u.id === id);
    },
    safe: (user) => { const { password_hash, ...rest } = user; return rest; },
  },

  attendance: {
    findByUserAndDate: (userId, date) =>
      getTable('attendance').find((a) => a.user_id === userId && a.date === date) || null,
    findByUser: (userId) =>
      getTable('attendance').filter((a) => a.user_id === userId).sort((a, b) => b.date.localeCompare(a.date)),
    findAll: () => getTable('attendance').sort((a, b) => b.date.localeCompare(a.date)),
    create: (data) => {
      const rows = getTable('attendance');
      const row = { id: genId(), created_at: now(), ...data };
      rows.push(row);
      saveTable('attendance', rows);
      return row;
    },
    update: (id, updates) => {
      const rows = getTable('attendance').map((r) => r.id === id ? { ...r, ...updates } : r);
      saveTable('attendance', rows);
      return rows.find((r) => r.id === id);
    },
  },

  leaves: {
    findByUser: (userId) =>
      getTable('leaves').filter((l) => l.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    findById: (id) => getTable('leaves').find((l) => l.id === id) || null,
    findAll: () => getTable('leaves').sort((a, b) => b.created_at.localeCompare(a.created_at)),
    create: (data) => {
      const rows = getTable('leaves');
      const row = { id: genId(), status: 'pending', created_at: now(), ...data };
      rows.push(row);
      saveTable('leaves', rows);
      return row;
    },
    update: (id, updates) => {
      const rows = getTable('leaves').map((r) => r.id === id ? { ...r, ...updates } : r);
      saveTable('leaves', rows);
      return rows.find((r) => r.id === id);
    },
  },

  balances: {
    findByUser: (userId) => {
      const year = new Date().getFullYear();
      return getTable('leave_balances').find((b) => b.user_id === userId && b.year === year) || null;
    },
    update: (userId, updates) => {
      const year = new Date().getFullYear();
      const rows = getTable('leave_balances').map((b) =>
        b.user_id === userId && b.year === year ? { ...b, ...updates } : b
      );
      saveTable('leave_balances', rows);
    },
  },

  leaveTypes: {
    findAll: () => getTable('leave_types'),
  },

  notifications: {
    findByUser: (userId) =>
      getTable('notifications').filter((n) => n.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    create: (data) => {
      const rows = getTable('notifications');
      const row = { id: genId(), is_read: false, created_at: now(), ...data };
      rows.push(row);
      saveTable('notifications', rows);
      return row;
    },
    markRead: (userId) => {
      const rows = getTable('notifications').map((n) =>
        n.user_id === userId ? { ...n, is_read: true } : n
      );
      saveTable('notifications', rows);
    },
  },
};
