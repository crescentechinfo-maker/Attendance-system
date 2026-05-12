import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { reportAPI, attendanceAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function AttendanceReport() {
  const [report, setReport] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('report');

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const years = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [reportRes, allRes] = await Promise.all([
        reportAPI.getAttendance({ month: selectedMonth, year: selectedYear }),
        attendanceAPI.getAll({ month: selectedMonth, year: selectedYear, limit: 100 }),
      ]);
      setReport(reportRes.data.report);
      setSummary(reportRes.data.summary);
      setDailyTrend(reportRes.data.daily_trend);
      setAllAttendance(allRes.data.attendance);
    } catch {
      toast.error('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [selectedMonth, selectedYear]);

  const STATUS_BADGE = {
    present: 'badge-success',
    late: 'badge-warning',
    absent: 'badge-danger',
    on_leave: 'badge-info',
  };

  const chartData = dailyTrend.map((d) => ({
    date: format(new Date(d.date), 'MMM d'),
    Present: parseInt(d.present),
    Late: parseInt(d.late),
    'On Leave': parseInt(d.on_leave),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="input w-auto py-2 text-sm"
          >
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="input w-auto py-2 text-sm"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Present', value: summary.total_present, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Late Arrivals', value: summary.total_late, color: 'bg-amber-50 text-amber-700' },
            { label: 'Absent', value: summary.total_absent, color: 'bg-red-50 text-red-700' },
            { label: 'Avg Hours', value: summary.avg_working_hours ? `${summary.avg_working_hours}h` : '—', color: 'bg-blue-50 text-blue-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`card text-center ${color.split(' ')[0]}`}>
              <p className={`text-3xl font-bold ${color.split(' ')[1]}`}>{value ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['report', 'chart', 'detail'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 capitalize transition-colors ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'report' ? 'Summary by Employee' : tab === 'chart' ? 'Daily Trend' : 'Detail Log'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary Report */}
          {activeTab === 'report' && (
            <div className="card p-0 overflow-hidden">
              <div className="table-container border-0 rounded-none">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Present</th>
                      <th>Late</th>
                      <th>Absent</th>
                      <th>On Leave</th>
                      <th>Total Hours</th>
                      <th>Avg Hours/Day</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {report.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <p className="font-medium text-gray-900">{row.full_name}</p>
                          <p className="text-xs text-gray-400">{row.department}</p>
                        </td>
                        <td className="text-emerald-600 font-medium">{row.present_days || 0}</td>
                        <td className="text-amber-600 font-medium">{row.late_days || 0}</td>
                        <td className="text-red-600 font-medium">{row.absent_days || 0}</td>
                        <td className="text-blue-600 font-medium">{row.leave_days || 0}</td>
                        <td className="text-gray-600">{row.total_working_hours ? `${row.total_working_hours}h` : '—'}</td>
                        <td className="text-gray-600">{row.avg_working_hours ? `${row.avg_working_hours}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Chart */}
          {activeTab === 'chart' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Daily Attendance Trend</h2>
              {chartData.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="On Leave" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Detail Log */}
          {activeTab === 'detail' && (
            <div className="card p-0 overflow-hidden">
              <div className="table-container border-0 rounded-none">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {allAttendance.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <p className="font-medium text-gray-900">{record.full_name}</p>
                          <p className="text-xs text-gray-400">{record.department}</p>
                        </td>
                        <td className="text-gray-600">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
