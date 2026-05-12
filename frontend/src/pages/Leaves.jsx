import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { leaveAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { PlusIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const LEAVE_TYPES = ['Annual Leave', 'Sick Leave', 'Emergency Leave'];

const STATUS_BADGE = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  cancelled: 'badge-gray',
};

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, balanceRes] = await Promise.all([
        leaveAPI.getMy(),
        leaveAPI.getBalance(),
      ]);
      setLeaves(leavesRes.data.leaves);
      setBalance(balanceRes.data.balance);
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await leaveAPI.apply(data);
      toast.success('Leave application submitted successfully!');
      setApplyModalOpen(false);
      reset();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await leaveAPI.cancel(id);
      toast.success('Leave cancelled successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel leave');
    }
  };

  if (loading) return <LoadingSpinner />;

  const startDate = watch('start_date');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        <button onClick={() => setApplyModalOpen(true)} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Apply for Leave
        </button>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Annual Leave', total: balance.annual_leave, used: balance.used_annual, available: balance.available_annual },
            { label: 'Sick Leave', total: balance.sick_leave, used: balance.used_sick, available: balance.available_sick },
            { label: 'Emergency', total: balance.emergency_leave, used: balance.used_emergency, available: balance.available_emergency },
          ].map(({ label, total, used, available }) => (
            <div key={label} className="card text-center">
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <p className="text-3xl font-bold text-gray-900">{available}</p>
              <p className="text-xs text-gray-400">{used} used / {total} total</p>
            </div>
          ))}
        </div>
      )}

      {/* Leave History */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          Leave History
        </h2>

        {leaves.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No leave requests yet</p>
            <button onClick={() => setApplyModalOpen(true)} className="btn-primary mt-4 text-sm">
              Apply for your first leave
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="font-medium text-gray-900">{leave.leave_type}</td>
                    <td className="text-gray-600">{format(new Date(leave.start_date), 'MMM d, yyyy')}</td>
                    <td className="text-gray-600">{format(new Date(leave.end_date), 'MMM d, yyyy')}</td>
                    <td className="text-gray-600">{leave.total_days}</td>
                    <td>
                      <span className={STATUS_BADGE[leave.status] || 'badge-gray'}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">
                      {format(new Date(leave.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      {['pending', 'approved'].includes(leave.status) && (
                        <button
                          onClick={() => handleCancel(leave.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                      {leave.approval_notes && (
                        <p className="text-xs text-gray-400 mt-0.5">Note: {leave.approval_notes}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => { setApplyModalOpen(false); reset(); }}
        title="Apply for Leave"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <select
              className={`input ${errors.leave_type ? 'border-red-400' : ''}`}
              {...register('leave_type', { required: 'Leave type is required' })}
            >
              <option value="">Select leave type</option>
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.leave_type && <p className="text-red-500 text-xs mt-1">{errors.leave_type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className={`input ${errors.start_date ? 'border-red-400' : ''}`}
                min={new Date().toISOString().split('T')[0]}
                {...register('start_date', { required: 'Start date is required' })}
              />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date.message}</p>}
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className={`input ${errors.end_date ? 'border-red-400' : ''}`}
                min={startDate || new Date().toISOString().split('T')[0]}
                {...register('end_date', { required: 'End date is required' })}
              />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <textarea
              rows={3}
              className={`input resize-none ${errors.reason ? 'border-red-400' : ''}`}
              placeholder="Please describe the reason for your leave..."
              {...register('reason', {
                required: 'Reason is required',
                minLength: { value: 10, message: 'Reason must be at least 10 characters' },
              })}
            />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setApplyModalOpen(false); reset(); }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
