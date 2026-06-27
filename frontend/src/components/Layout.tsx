import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { useTheme } from '../contexts/ThemeContext';
import { getLogoFavicon } from '../api/settings';
import { LogOut, Plus, Clock, Moon, Sun, Settings, Hammer } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { displayTz, setDisplayTz, commonTimezones } = useTimezone();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [logoSvg, setLogoSvg] = useState<string | null>(null);

  useEffect(() => {
    getLogoFavicon().then((res) => {
      if (res.logo_svg) setLogoSvg(res.logo_svg);
      if (res.favicon_svg) {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (link) {
          link.href = `data:image/svg+xml,${encodeURIComponent(res.favicon_svg)}`;
        }
      }
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700 dark:text-brand-400">
                {logoSvg ? (
                  <span className="w-7 h-7" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                ) : (
                  <Hammer size={22} className="text-brand-600 dark:text-brand-400" />
                )}
                Work Order Manager
              </Link>
              <Link to="/orders/new" className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 transition-colors">
                <Plus size={16} /> New
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock size={16} />
                <select
                  value={displayTz}
                  onChange={(e) => setDisplayTz(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {commonTimezones.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link to="/account" className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Account settings">
                <Settings size={18} />
              </Link>
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{user?.display_name}</span>
              <button onClick={handleLogout} className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors">
                <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Outlet />
      </main>
    </div>
  );
}
