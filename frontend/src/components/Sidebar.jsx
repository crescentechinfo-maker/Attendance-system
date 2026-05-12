import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  UsersIcon,
  DocumentChartBarIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const employeeNav = [
  { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
  { to: '/attendance', icon: ClockIcon, label: 'Attendance' },
  { to: '/leaves', icon: CalendarDaysIcon, label: 'My Leaves' },
  { to: '/profile', icon: UserIcon, label: 'Profile' },
];

const adminNav = [
  { to: '/admin', icon: HomeIcon, label: 'Dashboard' },
  { to: '/admin/employees', icon: UsersIcon, label: 'Employees' },
  { to: '/admin/attendance', icon: DocumentChartBarIcon, label: 'Attendance' },
  { to: '/admin/leaves', icon: ClipboardDocumentListIcon, label: 'Leave Requests' },
  { to: '/profile', icon: UserIcon, label: 'Profile' },
];

export default function Sidebar({ onClose }) {
  const { user, logout, isAdminOrManager } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdminOrManager ? adminNav : employeeNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="flex-shrink-0 w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
          <BuildingOfficeIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">AttendEase</p>
          <p className="text-xs text-gray-500">Management System</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-semibold text-sm">
              {user?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
