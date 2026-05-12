import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { leaveAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const STATUS_BADGE = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  cancelled: 'badge-gray',
};

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionModal, setActionModal] = useState(null); // { leave, type: 'approve'|'reject' }
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.getAll({ status: statusFilter || undefined });
      setLeaves(res.data.leaves);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, [statusFilter]);

  const openActionModal = (leave, type) => {
    setActionModal({ leave, type });
    reset();
  };

  const onActionSubmit = async (data) => {
    if (!actionModal) return;
    const { leave, type } = actionModal;
    setSubmitting(true);
    try {
      if (type === 'approve') {
        await leaveAPI.approve(leave.id, { approval_notes: data.notes });
        toast.success(`Leave approved for ${leave.full_name}`);
      } else {
        await leaveAPI.reject(leave.id, { approval_notes: data.notes });
        toast.success(`Leave rejected for ${leave.full_name}`);
      }
      setActionModal(null);
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {['', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              statusFilter === status
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Leaves Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : leaves.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">No {statusFilter || ''} leave requests found</p>
          </div>
        ) : (
          <>
            <div className="table-container border-0 rounded-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Duration</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <p className="font-medium text-gray-900">{leave.full_name}</p>
                        <p className="text-xs text-gray-400">{leave.department} · {leave.employee_id}</p>
                      </td>
                      <td className="text-gray-700 font-medium">{leave.leave_type}</td>
                      <td className="text-gray-600 text-sm">
                        {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </td>
                      <td className="text-gray-600">{leave.total_days}</td>
                      <td className="text-gray-500 max-w-xs">
                        <p className="truncate text-sm" title={leave.reason}>{leave.reason}</p>
                      </td>
                      <td>
                        <span className={STATUS_BADGE[leave.status] || 'badge-gray'}>
                          {leave.status}
                        </span>
                        {leave.approval_notes && (
                          <p className="text-xs text-gray-400 mt-0.5">{leave.approval_notes}</p>
                        )}
                      </td>
                      <td className="text-gray-500 text-xs">
                        {format(new Date(leave.created_at), 'MMM d, yyyy')}
                      </td>
                      <td>
                        {leave.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openActionModal(leave, 'approve')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openActionModal(leave, 'reject')}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Reject"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.total > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
                Showing {leaves.length} of {pagination.total} requests
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve/Reject Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); reset(); }}
        title={actionModal?.type === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        size="sm"
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-1">
              <p><span className="font-medium">Employee:</span> {actionModal.leave.full_name}</p>
              <p><span className="font-medium">Leave Type:</span> {actionModal.leave.leave_type}</p>
              <p>
                <span className="font-medium">Period:</span>{' '}
                {format(new Date(actionModal.leave.start_date), 'MMM d')} – {format(new Date(actionModal.leave.end_date), 'MMM d, yyyy')}
                {' '}({actionModal.leave.total_days} days)
              </p>
              <p><span className="font-medium">Reason:</span> {actionModal.leave.reason}</p>
            </div>

            <form onSubmit={handleSubmit(onActionSubmit)} className="space-y-4">
              <div>
                <label className="label">
                  Notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="input resize-none"
                  placeholder={actionModal.type === 'approve' ? 'Any comments...' : 'Reason for rejection...'}
                  {...register('notes')}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setActionModal(null); reset(); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 btn ${
                    actionModal.type === 'approve'
                      ? 'btn-success'
                      : 'btn-danger'
                  }`}
                >
                  {submitting
                    ? 'Processing...'
                    : actionModal.type === 'approve'
                    ? 'Approve Leave'
                    : 'Reject Leave'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
