import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { attendanceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const STATUS_BADGE = {
  present: 'badge-success',
  late: 'badge-warning',
  absent: 'badge-danger',
  on_leave: 'badge-info',
  half_day: 'badge-warning',
  holiday: 'badge-gray',
};

export default function Attendance() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, historyRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getMy({ month: selectedMonth, year: selectedYear }),
      ]);
      setTodayAttendance(todayRes.data.attendance);
      setRecords(historyRes.data.attendance);
      setStats(historyRes.data.stats);
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceAPI.checkIn();
      setTodayAttendance(res.data.attendance);
      toast.success('Checked in successfully!');
      fetchData();
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
      toast.success(`Checked out! Worked ${res.data.working_hours} hours.`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const years = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i);

  if (loading) return <LoadingSpinner />;

  const isCheckedIn = !!todayAttendance?.check_in;
  const isCheckedOut = !!todayAttendance?.check_out;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>

      {/* Today's Check-in Card */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-gray-400" />
          Today — {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>

        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Check-in Time</p>
            <p className="text-2xl font-bold text-gray-900">
              {todayAttendance?.check_in ? format(new Date(todayAttendance.check_in), 'HH:mm') : '--:--'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Check-out Time</p>
            <p className="text-2xl font-bold text-gray-900">
              {todayAttendance?.check_out ? format(new Date(todayAttendance.check_out), 'HH:mm') : '--:--'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Working Hours</p>
            <p className="text-2xl font-bold text-gray-900">
              {todayAttendance?.working_hours ? `${todayAttendance.working_hours}h` : '--'}
            </p>
          </div>
          {todayAttendance?.status && (
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={STATUS_BADGE[todayAttendance.status] || 'badge-gray'}>
                {todayAttendance.status}
              </span>
            </div>
          )}

          <div className="flex gap-3 ml-auto">
            {!isCheckedIn && (
              <button onClick={handleCheckIn} disabled={actionLoading} className="btn-success">
                <CheckCircleIcon className="h-5 w-5" />
                Check In
              </button>
            )}
            {isCheckedIn && !isCheckedOut && (
              <button onClick={handleCheckOut} disabled={actionLoading} className="btn-danger">
                <XCircleIcon className="h-5 w-5" />
                Check Out
              </button>
            )}
            {isCheckedOut && (
              <span className="badge badge-success text-sm px-4 py-2">Completed for Today</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Present', value: stats.present_days || 0, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Late', value: stats.late_days || 0, color: 'text-amber-600 bg-amber-50' },
            { label: 'Absent', value: stats.absent_days || 0, color: 'text-red-600 bg-red-50' },
            { label: 'Avg Hours', value: stats.avg_working_hours ? `${stats.avg_working_hours}h` : '--', color: 'text-blue-600 bg-blue-50' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`card text-center rounded-xl py-4 ${color.split(' ')[1]}`}>
              <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Attendance History</h2>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="input w-auto py-1.5 text-sm"
            >
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input w-auto py-1.5 text-sm"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No attendance records for this period</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="font-medium text-gray-900">
                      {format(new Date(record.date), 'EEE, MMM d')}
                    </td>
                    <td className="text-gray-600">
                      {record.check_in ? format(new Date(record.check_in), 'HH:mm') : '—'}
                    </td>
                    <td className="text-gray-600">
                      {record.check_out ? format(new Date(record.check_out), 'HH:mm') : '—'}
                    </td>
                    <td className="text-gray-600">
                      {record.working_hours ? `${record.working_hours}h` : '—'}
                    </td>
                    <td>
                      <span className={STATUS_BADGE[record.status] || 'badge-gray'}>
                        {record.status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
