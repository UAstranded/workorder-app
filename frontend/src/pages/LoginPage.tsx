import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Hammer, LogIn, Moon, Sun } from 'lucide-react';

export default function LoginPage() {
  const { isDark, toggleDark } = useTheme();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors">
      <div className="h-1 w-full fixed top-0 bg-brand-500" />
      <button
        onClick={toggleDark}
        className="absolute top-6 right-6 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <div className="card-accent p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Hammer size={28} className="text-brand-600 dark:text-brand-400" />
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight">Work Order Manager</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div>
            <label className="section-label block mb-1.5">Username / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="section-label block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
          Default: admin / admin123
        </p>
      </div>
    </div>
  );
}
