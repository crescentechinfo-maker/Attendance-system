import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getDepartments: () => api.get('/employees/departments'),
};

export const attendanceAPI = {
  checkIn: () => api.post('/attendance/checkin'),
  checkOut: () => api.post('/attendance/checkout'),
  getToday: () => api.get('/attendance/today'),
  getMy: (params) => api.get('/attendance/my', { params }),
  getAll: (params) => api.get('/attendance', { params }),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  getSummary: () => api.get('/attendance/summary'),
};

export const leaveAPI = {
  apply: (data) => api.post('/leaves/apply', data),
  getMy: (params) => api.get('/leaves/my', { params }),
  getAll: (params) => api.get('/leaves', { params }),
  approve: (id, data) => api.put(`/leaves/${id}/approve`, data),
  reject: (id, data) => api.put(`/leaves/${id}/reject`, data),
  cancel: (id) => api.put(`/leaves/${id}/cancel`),
  getBalance: (userId) => userId ? api.get(`/leaves/balance/${userId}`) : api.get('/leaves/balance'),
};

export const reportAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getAttendance: (params) => api.get('/reports/attendance', { params }),
  getLeaves: (params) => api.get('/reports/leaves', { params }),
  getNotifications: (params) => api.get('/reports/notifications', { params }),
  markNotificationsRead: (ids) => api.put('/reports/notifications/read', { ids }),
};

export default api;
