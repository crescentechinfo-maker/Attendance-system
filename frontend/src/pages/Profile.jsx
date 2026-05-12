import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { UserIcon, KeyIcon } from '@heroicons/react/24/outline';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors },
  } = useForm({ defaultValues: { full_name: user?.full_name, phone: user?.phone } });

  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm();

  const onProfileSubmit = async (data) => {
    setProfileLoading(true);
    try {
      const res = await authAPI.updateProfile(data);
      updateUser(res.data.user);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setPasswordLoading(true);
    try {
      await authAPI.changePassword(data);
      toast.success('Password changed successfully!');
      resetPassword();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>

      {/* Avatar & Basic Info */}
      <div className="card flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-700 font-bold text-3xl">
            {user?.full_name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{user?.full_name}</h2>
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <div className="flex gap-3 mt-2">
            <span className="badge badge-info capitalize">{user?.role}</span>
            {user?.department && <span className="badge badge-gray">{user?.department}</span>}
            {user?.employee_id && <span className="badge badge-gray">{user?.employee_id}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'profile', label: 'Profile Info', icon: UserIcon },
          { key: 'password', label: 'Change Password', icon: KeyIcon },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
          <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className={`input ${profileErrors.full_name ? 'border-red-400' : ''}`}
                {...regProfile('full_name', { required: 'Full name is required' })}
              />
              {profileErrors.full_name && (
                <p className="text-red-500 text-xs mt-1">{profileErrors.full_name.message}</p>
              )}
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                className="input"
                placeholder="+60123456789"
                {...regProfile('phone')}
              />
            </div>
            <div>
              <label className="label">Email (read only)</label>
              <input className="input bg-gray-50 cursor-not-allowed" value={user?.email} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Department</label>
                <input className="input bg-gray-50 cursor-not-allowed" value={user?.department || ''} disabled />
              </div>
              <div>
                <label className="label">Position</label>
                <input className="input bg-gray-50 cursor-not-allowed" value={user?.position || ''} disabled />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={profileLoading} className="btn-primary">
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Form */}
      {activeTab === 'password' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePassword(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                className={`input ${passwordErrors.current_password ? 'border-red-400' : ''}`}
                {...regPassword('current_password', { required: 'Current password is required' })}
              />
              {passwordErrors.current_password && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.current_password.message}</p>
              )}
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className={`input ${passwordErrors.new_password ? 'border-red-400' : ''}`}
                placeholder="Min 8 characters"
                {...regPassword('new_password', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              {passwordErrors.new_password && (
                <p className="text-red-500 text-xs mt-1">{passwordErrors.new_password.message}</p>
              )}
            </div>
            <div className="pt-2">
              <button type="submit" disabled={passwordLoading} className="btn-primary">
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
