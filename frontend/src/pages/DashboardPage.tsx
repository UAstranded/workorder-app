import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { listWorkOrders, ListParams, deleteWorkOrder, getExportListUrl, downloadExport } from '../api/workOrders';
import { WorkOrderListEntry } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatInTimeZone } from 'date-fns-tz';
import { Search, Download, Trash2, Eye, Edit, ChevronUp, ChevronDown, Plus } from 'lucide-react';

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
    } catch { }
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
    return sortDir === 'asc' ? <ChevronUp size={13} className="inline" /> : <ChevronDown size={13} className="inline" />;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight">Work Orders</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={handleExportSelected} className="btn-secondary text-xs">
              <Download size={14} /> Export ({selected.size})
            </button>
          )}
          <Link to="/orders/new" className="btn-primary text-xs">
            <Plus size={14} /> New Work Order
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search reference, account, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
            {statusOptions.map((o) => <option key={o} value={o}>{o || 'All Statuses'}</option>)}
          </select>
          <select value={confFilter} onChange={(e) => setConfFilter(e.target.value)} className="input-field w-auto min-w-[150px]">
            {confirmationOptions.map((o) => <option key={o} value={o}>{o || 'All Confirmations'}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                <th className="table-header w-10">
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(orders.map(o => o.reference)));
                    else setSelected(new Set());
                  }} className="dark:bg-gray-700 rounded" />
                </th>
                <th className="table-header" onClick={() => handleSort('reference')}>Ref <SortIcon col="reference" /></th>
                <th className="table-header" onClick={() => handleSort('location_name')}>Location <SortIcon col="location_name" /></th>
                <th className="table-header hidden md:table-cell" onClick={() => handleSort('city')}>City <SortIcon col="city" /></th>
                <th className="table-header hidden md:table-cell" onClick={() => handleSort('state')}>St <SortIcon col="state" /></th>
                <th className="table-header" onClick={() => handleSort('status')}>Status <SortIcon col="status" /></th>
                <th className="table-header hidden lg:table-cell">Confirmation</th>
                <th className="table-header hidden lg:table-cell" onClick={() => handleSort('planned_start')}>Planned <SortIcon col="planned_start" /></th>
                <th className="table-header hidden xl:table-cell" onClick={() => handleSort('updated_at')}>Updated <SortIcon col="updated_at" /></th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">No work orders found</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                  <td className="table-cell">
                    <input type="checkbox" checked={selected.has(o.reference)} onChange={() => toggleSelect(o.reference)} className="dark:bg-gray-700 rounded" />
                  </td>
                  <td className="table-cell font-medium">
                    <Link to={`/orders/${o.reference}`} className="text-brand-600 dark:text-brand-400 hover:underline font-display text-xs tracking-tight">{o.reference}</Link>
                  </td>
                  <td className="table-cell text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{o.location_name || '-'}</td>
                  <td className="table-cell text-gray-600 dark:text-gray-400 hidden md:table-cell">{o.city || '-'}</td>
                  <td className="table-cell text-gray-600 dark:text-gray-400 hidden md:table-cell">{o.state || '-'}</td>
                  <td className="table-cell">{statusBadge(o.status)}</td>
                  <td className="table-cell hidden lg:table-cell">{confBadge(o.confirmation_status)}</td>
                  <td className="table-cell text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap hidden lg:table-cell">{fmt(o.planned_start)}</td>
                  <td className="table-cell text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap hidden xl:table-cell">{fmt(o.updated_at)}</td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/orders/${o.reference}`} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Eye size={15} /></Link>
                      <Link to={`/orders/${o.reference}/edit`} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Edit size={15} /></Link>
                      <button onClick={() => handleDelete(o.reference)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Trash2 size={15} /></button>
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
