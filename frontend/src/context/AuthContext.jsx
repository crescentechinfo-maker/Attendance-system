import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, enableDemoMode, disableDemoMode, isDemoMode } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    if (isDemoMode()) {
      setLoading(false);
      return;
    }
    try {
      const response = await authAPI.getMe();
      const userData = response.data.user;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user: userData } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const loginDemo = (asRole = 'employee') => {
    enableDemoMode();
    const demoUser = asRole === 'admin'
      ? { id: 'mock-admin-001', email: 'admin123@gmail.com', full_name: 'System Administrator', role: 'admin', department: 'IT', position: 'System Admin', employee_id: 'EMP0001' }
      : { id: 'mock-emp-001', email: 'employee@demo.com', full_name: 'Demo Employee', role: 'employee', department: 'Engineering', position: 'Software Developer', employee_id: 'EMP0002' };
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const logout = () => {
    disableDemoMode();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('demo_checkin');
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isAdminOrManager = isAdmin || isManager;

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginDemo, logout, updateUser, isAdmin, isManager, isAdminOrManager }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
