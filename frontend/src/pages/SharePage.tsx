import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import { WorkOrder as WorkOrderType } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatInTimeZone } from 'date-fns-tz';
import { Phone, Clock, Hammer } from 'lucide-react';

export default function SharePage() {
  const { reference } = useParams<{ reference: string }>();
  const { displayTz } = useTimezone();
  const [wo, setWo] = useState<WorkOrderType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reference) return;
    client.get(`/public/work-orders/${reference}`)
      .then(({ data }) => setWo(data))
      .catch(() => setError('Work order not found'))
      .finally(() => setLoading(false));
  }, [reference]);

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <p className="text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  );

  if (error || !wo) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <Hammer size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h1 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Work Order Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">This link may be invalid or the work order has been removed.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Hammer size={22} className="text-brand-600 dark:text-brand-400" />
          <span className="text-lg font-bold text-brand-700 dark:text-brand-400">Work Order Manager</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Shared view</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{wo.reference}</h1>
          {statusBadge(wo.status)}
          {confBadge(wo.confirmation_status)}
        </div>

        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Identifiers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                ['Account #', wo.account_number],
                ['Invoice #', wo.invoice_number],
                ['PO #', wo.po_number],
                ['Dealer ID', wo.dealer_id],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{label}</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{val || '-'}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Site Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Location</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.location_name || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">Contact</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.site_contact || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">Phone</span>
                {wo.primary_phone ? (
                  <a href={`tel:${wo.primary_phone}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1">
                    <Phone size={14} /> {wo.primary_phone}
                  </a>
                ) : <p className="font-medium text-gray-900 dark:text-gray-100">-</p>}
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Address</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.address_line1 || '-'}{wo.address_line2 ? `, ${wo.address_line2}` : ''}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">City</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.city || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">State</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.state || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">ZIP</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.zip || '-'}</p>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-gray-400 dark:text-gray-500" />
              <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule ({displayTz})</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[
                ['Earliest Start', wo.earliest_start],
                ['Planned Start', wo.planned_start],
                ['Due Date', wo.due_date],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{label}</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{fmt(val as string | null)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">Site Timezone: {wo.site_timezone}</div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tasks</h2>
            {wo.tasks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No tasks</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-1 text-gray-500 dark:text-gray-400 font-medium">Task</th>
                    <th className="text-right py-1 text-gray-500 dark:text-gray-400 font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.tasks.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1.5 text-gray-900 dark:text-gray-100">{t.task_name}</td>
                      <td className="text-right py-1.5 text-gray-900 dark:text-gray-100">{t.qty_required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {wo.notes && (
            <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Notes</h2>
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{wo.notes}</p>
            </section>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          Shared via Work Order Manager
        </p>
      </main>
    </div>
  );
}
