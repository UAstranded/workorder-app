import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';
import client from '../api/client';

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { display_name: displayName };
      if (currentPassword && newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }
      await client.put('/auth/account', body);
      setSuccess('Settings saved successfully');
      if (user) {
        user.display_name = displayName;
        localStorage.setItem('user', JSON.stringify(user));
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Account Settings</h1>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm p-3 rounded">{success}</div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Profile</h2>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Username</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Change Password</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Leave blank to keep current password</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
