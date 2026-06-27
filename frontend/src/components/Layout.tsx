import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { LogOut, Plus, Clock } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const { displayTz, setDisplayTz, commonTimezones } = useTimezone();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-blue-700">
                Work Order Manager
              </Link>
              <Link to="/orders/new" className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                <Plus size={16} /> New
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} />
                <select
                  value={displayTz}
                  onChange={(e) => setDisplayTz(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                >
                  {commonTimezones.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-600">{user?.display_name}</span>
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
                <LogOut size={16} /> Logout
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
