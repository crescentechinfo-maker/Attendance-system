import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, leaveAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'badge-success' },
  late: { label: 'Late', color: 'badge-warning' },
  absent: { label: 'Absent', color: 'badge-danger' },
  on_leave: { label: 'On Leave', color: 'badge-info' },
  half_day: { label: 'Half Day', color: 'badge-warning' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [balance, setBalance] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [todayRes, balanceRes, attendanceRes, leavesRes] = await Promise.allSettled([
        attendanceAPI.getToday(),
        leaveAPI.getBalance(),
        attendanceAPI.getMy({ limit: 5 }),
        leaveAPI.getMy({ limit: 5 }),
      ]);

      if (todayRes.status === 'fulfilled') setTodayAttendance(todayRes.value.data.attendance);
      if (balanceRes.status === 'fulfilled') setBalance(balanceRes.value.data.balance);
      if (attendanceRes.status === 'fulfilled') setRecentAttendance(attendanceRes.value.data.attendance);
      if (leavesRes.status === 'fulfilled') setRecentLeaves(leavesRes.value.data.leaves);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceAPI.checkIn();
      setTodayAttendance(res.data.attendance);
      toast.success('Checked in successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceAPI.checkOut();
      setTodayAttendance(res.data.attendance);
      toast.success(`Checked out! Worked ${res.data.working_hours} hours today.`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const now = new Date();
  const isCheckedIn = !!todayAttendance?.check_in;
  const isCheckedOut = !!todayAttendance?.check_out;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 mt-1">{format(now, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Check In/Out Card */}
      <div className="card bg-gradient-to-r from-primary-600 to-blue-700 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium">Today's Attendance</p>
            <p className="text-3xl font-bold mt-1">{format(now, 'HH:mm')}</p>
            <p className="text-primary-200 text-sm mt-1">{format(now, 'EEEE, MMM d')}</p>

            {todayAttendance && (
              <div className="mt-3 space-y-1">
                {todayAttendance.check_in && (
                  <p className="text-sm text-primary-100">
                    Check-in: <span className="text-white font-medium">
                      {format(new Date(todayAttendance.check_in), 'HH:mm')}
                    </span>
                  </p>
                )}
                {todayAttendance.check_out && (
                  <p className="text-sm text-primary-100">
                    Check-out: <span className="text-white font-medium">
                      {format(new Date(todayAttendance.check_out), 'HH:mm')}
                    </span>
                    {todayAttendance.working_hours && (
                      <span className="ml-2">({todayAttendance.working_hours}h worked)</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {!isCheckedIn && (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary-700 rounded-xl font-semibold text-sm hover:bg-primary-50 transition-colors disabled:opacity-60"
              >
                <CheckCircleIcon className="h-5 w-5" />
                Check In
              </button>
            )}
            {isCheckedIn && !isCheckedOut && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                <XCircleIcon className="h-5 w-5" />
                Check Out
              </button>
            )}
            {isCheckedOut && (
              <div className="px-5 py-2.5 bg-white/20 rounded-xl text-sm font-medium text-center">
                Done for today!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Balance */}
      {balance && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Leave Balance {balance.year}</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Annual Leave', total: balance.annual_leave, used: balance.used_annual, color: 'blue' },
              { label: 'Sick Leave', total: balance.sick_leave, used: balance.used_sick, color: 'green' },
              { label: 'Emergency', total: balance.emergency_leave, used: balance.used_emergency, color: 'amber' },
            ].map(({ label, total, used, color }) => {
              const available = total - used;
              const pct = total > 0 ? (used / total) * 100 : 0;
              const barColors = { blue: 'bg-blue-500', green: 'bg-emerald-500', amber: 'bg-amber-500' };
              return (
                <div key={label} className="card text-center">
                  <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
                  <p className="text-3xl font-bold text-gray-900">{available}</p>
                  <p className="text-xs text-gray-400 mb-3">of {total} remaining</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${barColors[color]}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              Recent Attendance
            </h2>
          </div>
          {recentAttendance.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No attendance records yet</p>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((record) => {
                const cfg = STATUS_CONFIG[record.status] || { label: record.status, color: 'badge-gray' };
                return (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(record.date), 'EEE, MMM d')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {record.check_in ? format(new Date(record.check_in), 'HH:mm') : '--:--'}
                        {' — '}
                        {record.check_out ? format(new Date(record.check_out), 'HH:mm') : '--:--'}
                        {record.working_hours ? ` (${record.working_hours}h)` : ''}
                      </p>
                    </div>
                    <span className={cfg.color}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Leaves */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
              Recent Leave Requests
            </h2>
          </div>
          {recentLeaves.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No leave requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map((leave) => {
                const statusColor = {
                  pending: 'badge-warning',
                  approved: 'badge-success',
                  rejected: 'badge-danger',
                  cancelled: 'badge-gray',
                }[leave.status] || 'badge-gray';
                return (
                  <div key={leave.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{leave.leave_type}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d, yyyy')}
                        {' · '}{leave.total_days} day{leave.total_days > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={statusColor}>{leave.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
