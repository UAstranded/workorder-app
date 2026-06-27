import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { useTheme } from '../contexts/ThemeContext';
import { themes } from '../themes';
import { LogOut, Clock, Moon, Sun, Settings, Palette } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { displayTz, setDisplayTz, commonTimezones } = useTimezone();
  const { theme, isDark, toggleDark, setThemeName } = useTheme();
  const navigate = useNavigate();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="h-1 bg-brand-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-brand-700 dark:text-brand-400 tracking-tight">
                <img src="/logo-banner.png" alt="Logo" className="h-7 w-auto" />
                <span className="text-base">Work Order Manager</span>
              </Link>

            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock size={15} />
                <select
                  value={displayTz}
                  onChange={(e) => setDisplayTz(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500"
                >
                  {commonTimezones.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Choose theme"
                >
                  <Palette size={17} />
                </button>
                {showThemePicker && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 w-48 max-h-80 overflow-y-auto"
                    onMouseLeave={() => setShowThemePicker(false)}>
                    {themes.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => { setThemeName(t.name); setShowThemePicker(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                          theme.name === t.name
                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                          style={{ backgroundColor: t.accent }} />
                        <div>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{t.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={toggleDark}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <Link to="/account" className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Account settings">
                <Settings size={17} />
              </Link>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline font-medium">{user?.display_name}</span>
              <button onClick={handleLogout} className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors font-medium">
                <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
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
