import axios from 'axios';
import {
  mockAuthAPI, mockAttendanceAPI, mockLeaveAPI,
  mockEmployeeAPI, mockReportAPI,
} from './mockApi';

export const isDemoMode = () => localStorage.getItem('demo_mode') === 'true';
export const enableDemoMode = () => localStorage.setItem('demo_mode', 'true');
export const disableDemoMode = () => localStorage.removeItem('demo_mode');

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
  login: (data) => isDemoMode() ? mockAuthAPI.login(data) : api.post('/auth/login', data),
  register: (data) => isDemoMode() ? mockAuthAPI.register(data) : api.post('/auth/register', data),
  getMe: () => isDemoMode() ? mockAuthAPI.getMe() : api.get('/auth/me'),
  updateProfile: (data) => isDemoMode() ? mockAuthAPI.updateProfile(data) : api.put('/auth/profile', data),
  changePassword: (data) => isDemoMode() ? mockAuthAPI.changePassword(data) : api.put('/auth/password', data),
};

export const employeeAPI = {
  getAll: (params) => isDemoMode() ? mockEmployeeAPI.getAll() : api.get('/employees', { params }),
  getOne: (id) => isDemoMode() ? mockEmployeeAPI.getOne(id) : api.get(`/employees/${id}`),
  create: (data) => isDemoMode() ? mockEmployeeAPI.create(data) : api.post('/employees', data),
  update: (id, data) => isDemoMode() ? mockEmployeeAPI.update(id, data) : api.put(`/employees/${id}`, data),
  delete: (id) => isDemoMode() ? mockEmployeeAPI.delete(id) : api.delete(`/employees/${id}`),
  getDepartments: () => isDemoMode() ? mockEmployeeAPI.getDepartments() : api.get('/employees/departments'),
};

export const attendanceAPI = {
  checkIn: () => isDemoMode() ? mockAttendanceAPI.checkIn() : api.post('/attendance/checkin'),
  checkOut: () => isDemoMode() ? mockAttendanceAPI.checkOut() : api.post('/attendance/checkout'),
  getToday: () => isDemoMode() ? mockAttendanceAPI.getToday() : api.get('/attendance/today'),
  getMy: (params) => isDemoMode() ? mockAttendanceAPI.getMy() : api.get('/attendance/my', { params }),
  getAll: (params) => isDemoMode() ? mockAttendanceAPI.getAll() : api.get('/attendance', { params }),
  update: (id, data) => isDemoMode() ? mockAttendanceAPI.update(id, data) : api.put(`/attendance/${id}`, data),
  getSummary: () => isDemoMode() ? mockAttendanceAPI.getSummary() : api.get('/attendance/summary'),
};

export const leaveAPI = {
  apply: (data) => isDemoMode() ? mockLeaveAPI.apply(data) : api.post('/leaves/apply', data),
  getMy: (params) => isDemoMode() ? mockLeaveAPI.getMy() : api.get('/leaves/my', { params }),
  getAll: (params) => isDemoMode() ? mockLeaveAPI.getAll() : api.get('/leaves', { params }),
  approve: (id, data) => isDemoMode() ? mockLeaveAPI.approve(id) : api.put(`/leaves/${id}/approve`, data),
  reject: (id, data) => isDemoMode() ? mockLeaveAPI.reject(id) : api.put(`/leaves/${id}/reject`, data),
  cancel: (id) => isDemoMode() ? mockLeaveAPI.cancel(id) : api.put(`/leaves/${id}/cancel`),
  getBalance: (userId) => isDemoMode() ? mockLeaveAPI.getBalance() : (userId ? api.get(`/leaves/balance/${userId}`) : api.get('/leaves/balance')),
};

export const reportAPI = {
  getDashboard: () => isDemoMode() ? mockReportAPI.getDashboard() : api.get('/reports/dashboard'),
  getAttendance: (params) => isDemoMode() ? mockReportAPI.getAttendance() : api.get('/reports/attendance', { params }),
  getLeaves: (params) => isDemoMode() ? mockReportAPI.getLeaves() : api.get('/reports/leaves', { params }),
  getNotifications: (params) => isDemoMode() ? mockReportAPI.getNotifications() : api.get('/reports/notifications', { params }),
  markNotificationsRead: (ids) => isDemoMode() ? mockReportAPI.markNotificationsRead() : api.put('/reports/notifications/read', { ids }),
};

export default api;
