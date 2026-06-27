import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { listWorkOrders, ListParams, deleteWorkOrder, getExportListUrl, downloadExport } from '../api/workOrders';
import { WorkOrderListEntry } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatInTimeZone } from 'date-fns-tz';
import { Search, Download, Trash2, Eye, Edit, ChevronUp, ChevronDown } from 'lucide-react';

const statusOptions = ['', 'Open - Confirmed', 'Open - Unconfirmed', 'In Progress', 'Completed', 'Cancelled'];
const confirmationOptions = ['', 'Confirmed', 'Unconfirmed'];

export default function DashboardPage() {
  const { displayTz } = useTimezone();
  const location = useLocation();
  const [orders, setOrders] = useState<WorkOrderListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confFilter, setConfFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const mounted = useRef(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListParams = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (confFilter) params.confirmation_status = confFilter;
      params.sort_by = sortBy;
      params.sort_dir = sortDir;
      params._t = Date.now();
      const data = await listWorkOrders(params);
      if (mounted.current) setOrders(data);
    } catch {
      // handled by interceptor
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [search, statusFilter, confFilter, sortBy, sortDir]);

  useEffect(() => {
    mounted.current = true;
    fetchOrders();
    return () => { mounted.current = false; };
  }, [fetchOrders, location.key]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const handleDelete = async (ref: string) => {
    if (!confirm('Delete this work order?')) return;
    try {
      await deleteWorkOrder(ref);
      fetchOrders();
    } catch { /* */ }
  };

  const toggleSelect = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const handleExportSelected = async () => {
    if (selected.size === 0) return;
    const url = getExportListUrl(Array.from(selected), displayTz);
    await downloadExport(url, 'work-orders.xlsx');
  };

  const fmt = (dt: string | null) => {
    if (!dt) return '-';
    try {
      return formatInTimeZone(new Date(dt), displayTz, 'MM/dd/yyyy h:mm a zzz');
    } catch {
      return dt;
    }
  };

  const statusBadge = (s: string) => {
    const cls = s === 'Completed' ? 'badge-completed' :
      s === 'In Progress' ? 'badge-in-progress' :
      s === 'Cancelled' ? 'badge-cancelled' :
      (s || '').includes('Confirmed') ? 'badge-open' : 'badge-open';
    return <span className={cls}>{s}</span>;
  };

  const confBadge = (s: string) => {
    return <span className={s === 'Confirmed' ? 'badge-confirmed' : 'badge-unconfirmed'}>{s}</span>;
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const thClass = "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none";

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Work Orders</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={handleExportSelected} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors">
              <Download size={16} /> Export ({selected.size})
            </button>
          )}
          <Link to="/orders/new" className="inline-flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 transition-colors">
            New Work Order
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search reference, account, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {statusOptions.map((o) => <option key={o} value={o}>{o || 'All Statuses'}</option>)}
          </select>
          <select value={confFilter} onChange={(e) => setConfFilter(e.target.value)} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            {confirmationOptions.map((o) => <option key={o} value={o}>{o || 'All Confirmations'}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(orders.map(o => o.reference)));
                    else setSelected(new Set());
                  }} className="dark:bg-gray-700" />
                </th>
                <th className={thClass} onClick={() => handleSort('reference')}>Reference <SortIcon col="reference" /></th>
                <th className={thClass} onClick={() => handleSort('location_name')}>Location <SortIcon col="location_name" /></th>
                <th className={thClass} onClick={() => handleSort('city')}>City <SortIcon col="city" /></th>
                <th className={thClass} onClick={() => handleSort('state')}>State <SortIcon col="state" /></th>
                <th className={thClass} onClick={() => handleSort('status')}>Status <SortIcon col="status" /></th>
                <th className={thClass}>Confirmation</th>
                <th className={thClass} onClick={() => handleSort('planned_start')}>Planned Start <SortIcon col="planned_start" /></th>
                <th className={thClass} onClick={() => handleSort('updated_at')}>Updated <SortIcon col="updated_at" /></th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500 dark:text-gray-400">No work orders found</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(o.reference)} onChange={() => toggleSelect(o.reference)} className="dark:bg-gray-700" />
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-brand-600 dark:text-brand-400">
                    <Link to={`/orders/${o.reference}`}>{o.reference}</Link>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{o.location_name || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{o.city || '-'}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{o.state || '-'}</td>
                  <td className="px-3 py-2 text-sm">{statusBadge(o.status)}</td>
                  <td className="px-3 py-2 text-sm">{confBadge(o.confirmation_status)}</td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">{fmt(o.planned_start)}</td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">{fmt(o.updated_at)}</td>
                  <td className="px-3 py-2 text-sm text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/orders/${o.reference}`} className="p-1 text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"><Eye size={16} /></Link>
                      <Link to={`/orders/${o.reference}/edit`} className="p-1 text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"><Edit size={16} /></Link>
                      <button onClick={() => handleDelete(o.reference)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
