import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import client from '../api/client';
import { Save, Calendar } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);

  useEffect(() => {
    client.get('/calendar/status')
      .then(({ data }) => setCalendarConnected(data.connected))
      .catch(() => {})
      .finally(() => setCalendarLoading(false));
  }, []);

  const connectCalendar = async () => {
    try {
      const { data } = await client.get('/calendar/auth');
      window.location.href = data.auth_url;
    } catch {
      setError('Failed to start Google Calendar auth');
    }
  };

  const disconnectCalendar = async () => {
    try {
      await client.post('/calendar/disconnect');
      setCalendarConnected(false);
      setMessage('Calendar disconnected');
    } catch {
      setError('Failed to disconnect calendar');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const body: any = { display_name: displayName };
      if (currentPassword && newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }
      await client.put('/auth/account', body);
      setMessage('Account updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-6">Account Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="card-accent p-5">
          <h2 className="card-header mb-4">Profile</h2>
          {message && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm p-3 rounded-md mb-4">{message}</div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded-md mb-4">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="section-label block mb-1">Display Name</label>
              <input className="input-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="section-label block mb-1">Email</label>
              <input className="input-field" value={user?.email || ''} disabled />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </section>

        <section className="card-accent p-5">
          <h2 className="card-header mb-4">Change Password</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Leave blank to keep current password.</p>
          <div className="space-y-4">
            <div>
              <label className="section-label block mb-1">Current Password</label>
              <input type="password" className="input-field" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label className="section-label block mb-1">New Password</label>
              <input type="password" className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="card-accent p-5">
          <h2 className="card-header mb-4">Google Calendar</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Sync work orders to a shared Google Calendar. Events are created from due dates, scheduled dates, and tasks.
          </p>
          {calendarLoading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Checking connection...</p>
          ) : calendarConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Calendar size={16} />
                <span>Connected</span>
              </div>
              <button type="button" onClick={disconnectCalendar} className="btn-danger text-xs">
                Disconnect
              </button>
            </div>
          ) : (
            <button type="button" onClick={connectCalendar} className="btn-primary text-xs">
              <Calendar size={14} /> Connect Google Calendar
            </button>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            <Save size={16} /> {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
