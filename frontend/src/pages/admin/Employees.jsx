import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import {
  PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, UsersIcon,
} from '@heroicons/react/24/outline';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getAll({ search, role: roleFilter });
      setEmployees(res.data.employees);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(debounce);
  }, [search, roleFilter]);

  const openEditModal = (employee) => {
    setEditEmployee(employee);
    setValue('full_name', employee.full_name);
    setValue('email', employee.email);
    setValue('role', employee.role);
    setValue('department', employee.department || '');
    setValue('position', employee.position || '');
    setValue('phone', employee.phone || '');
  };

  const closeModal = () => {
    setAddModalOpen(false);
    setEditEmployee(null);
    reset();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editEmployee) {
        await employeeAPI.update(editEmployee.id, data);
        toast.success('Employee updated successfully!');
      } else {
        await employeeAPI.create(data);
        toast.success('Employee created successfully!');
      }
      closeModal();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}? They will lose system access.`)) return;
    try {
      await employeeAPI.delete(id);
      toast.success('Employee deactivated');
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to deactivate');
    }
  };

  const ROLE_BADGE = {
    admin: 'badge-danger',
    manager: 'badge-info',
    employee: 'badge-gray',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button onClick={() => setAddModalOpen(true)} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-auto"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <UsersIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No employees found</p>
          </div>
        ) : (
          <>
            <div className="table-container border-0 rounded-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Join Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {employees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 font-semibold text-sm">
                              {emp.full_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.full_name}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-600 text-xs font-mono">{emp.employee_id}</td>
                      <td className="text-gray-600">{emp.department || '—'}</td>
                      <td>
                        <span className={ROLE_BADGE[emp.role] || 'badge-gray'}>{emp.role}</span>
                      </td>
                      <td>
                        <span className={emp.is_active ? 'badge-success' : 'badge-danger'}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm">
                        {emp.join_date ? format(new Date(emp.join_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {emp.is_active && (
                            <button
                              onClick={() => handleDeactivate(emp.id, emp.full_name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.total > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
                Showing {employees.length} of {pagination.total} employees
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={addModalOpen || !!editEmployee}
        onClose={closeModal}
        title={editEmployee ? 'Edit Employee' : 'Add New Employee'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input
                className={`input ${errors.full_name ? 'border-red-400' : ''}`}
                placeholder="John Doe"
                {...register('full_name', { required: 'Full name is required' })}
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="label">Email</label>
              <input
                type="email"
                className={`input ${errors.email ? 'border-red-400' : ''} ${editEmployee ? 'bg-gray-50' : ''}`}
                placeholder="john@company.com"
                disabled={!!editEmployee}
                {...register('email', {
                  required: !editEmployee ? 'Email is required' : false,
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' },
                })}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {!editEmployee && (
              <div className="col-span-2">
                <label className="label">Password <span className="text-gray-400">(default: Welcome@123)</span></label>
                <input
                  type="password"
                  className="input"
                  placeholder="Leave blank for default"
                  {...register('password')}
                />
              </div>
            )}

            <div>
              <label className="label">Role</label>
              <select className="input" {...register('role')}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+60123456789" {...register('phone')} />
            </div>

            <div>
              <label className="label">Department</label>
              <input className="input" placeholder="Engineering" {...register('department')} />
            </div>

            <div>
              <label className="label">Position</label>
              <input className="input" placeholder="Software Developer" {...register('position')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving...' : editEmployee ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
