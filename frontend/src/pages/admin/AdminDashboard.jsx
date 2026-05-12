import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { reportAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatsCard from '../../components/StatsCard';
import {
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const STATUS_BADGE = {
  present: 'badge-success',
  late: 'badge-warning',
  absent: 'badge-danger',
  on_leave: 'badge-info',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await reportAPI.getDashboard();
        setData(res.data);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner />;

  const { employees, attendance, leaves, recent_attendance, pending_leaves } = data || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees"
          value={employees?.total_employees}
          subtitle={`${employees?.new_this_month || 0} joined this month`}
          icon={UsersIcon}
          color="blue"
        />
        <StatsCard
          title="Present Today"
          value={attendance?.present_today}
          subtitle={`${attendance?.late_today || 0} late arrivals`}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatsCard
          title="On Leave Today"
          value={attendance?.on_leave_today}
          icon={CalendarDaysIcon}
          color="amber"
        />
        <StatsCard
          title="Pending Leaves"
          value={leaves?.pending_leaves}
          subtitle={`${leaves?.approved_this_month || 0} approved this month`}
          icon={ClockIcon}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Attendance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Today's Attendance</h2>
            <Link to="/admin/attendance" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              View All →
            </Link>
          </div>

          {!recent_attendance?.length ? (
            <p className="text-gray-400 text-sm text-center py-6">No check-ins today</p>
          ) : (
            <div className="space-y-3">
              {recent_attendance.map((record) => {
                const cfg = STATUS_BADGE[record.status] || 'badge-gray';
                return (
                  <div key={`${record.user_id}-${record.date}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{record.full_name}</p>
                      <p className="text-xs text-gray-400">
                        {record.department} ·{' '}
                        {record.check_in ? format(new Date(record.check_in), 'HH:mm') : '--:--'}
                      </p>
                    </div>
                    <span className={cfg}>{record.status?.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Leaves */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Pending Leave Requests</h2>
            <Link to="/admin/leaves" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Manage All →
            </Link>
          </div>

          {!pending_leaves?.length ? (
            <p className="text-gray-400 text-sm text-center py-6">No pending leave requests</p>
          ) : (
            <div className="space-y-3">
              {pending_leaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{leave.full_name}</p>
                    <p className="text-xs text-gray-400">
                      {leave.leave_type} · {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d')}
                      {' · '}{leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link
                    to="/admin/leaves"
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
