import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import { WorkOrder as WorkOrderType } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatInTimeZone } from 'date-fns-tz';
import { Phone, Clock, Hammer, Wrench } from 'lucide-react';
import { formatPhone } from '../utils/format';

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
      <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
    </div>
  );

  if (error || !wo) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <Hammer size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h1 className="text-lg font-display font-bold text-gray-700 dark:text-gray-300 mb-2">Work Order Not Found</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500">This link may be invalid or the work order has been removed.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-1 bg-brand-500" />
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Hammer size={20} className="text-brand-600 dark:text-brand-400" />
          <span className="text-base font-display font-bold text-brand-700 dark:text-brand-400 tracking-tight">Work Order Manager</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">Shared view</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight">{wo.reference}</h1>
          {statusBadge(wo.status)}
          {confBadge(wo.confirmation_status)}
        </div>

        <div className="space-y-5">
          <section className="card-accent p-5">
            <h2 className="card-header mb-4">Identifiers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {[
                ['Account #', wo.account_number],
                ['Invoice #', wo.invoice_number],
                ['PO #', wo.po_number],
                ['Dealer ID', wo.dealer_id],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <span className="section-label block mb-0.5">{label}</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{val || '-'}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card-accent p-5">
            <h2 className="card-header mb-4">Site Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <span className="section-label block mb-0.5">Location</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.location_name || '-'}</p>
              </div>
              <div>
                <span className="section-label block mb-0.5">Contact</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.site_contact || '-'}</p>
              </div>
              <div>
                <span className="section-label block mb-0.5">Phone</span>
                {wo.primary_phone ? (
                  <a href={`tel:${wo.primary_phone}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 text-sm">
                    <Phone size={13} /> {formatPhone(wo.primary_phone)}
                  </a>
                ) : <p className="font-medium text-gray-900 dark:text-gray-100">-</p>}
              </div>
              <div className="sm:col-span-2">
                <span className="section-label block mb-0.5">Address</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.address_line1 || '-'}{wo.address_line2 ? `, ${wo.address_line2}` : ''}</p>
              </div>
              <div>
                <span className="section-label block mb-0.5">City</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.city || '-'}</p>
              </div>
              <div>
                <span className="section-label block mb-0.5">State</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.state || '-'}</p>
              </div>
              <div>
                <span className="section-label block mb-0.5">ZIP</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{wo.zip || '-'}</p>
              </div>
            </div>
          </section>

          <section className="card-accent p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-gray-400 dark:text-gray-500" />
              <h2 className="card-header">Schedule ({displayTz})</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {[
                ['Earliest Start', wo.earliest_start],
                ['Planned Start', wo.planned_start],
                ['Due Date', wo.due_date],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <span className="section-label block mb-0.5">{label}</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{fmt(val as string | null)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">Site Timezone: {wo.site_timezone}</div>
          </section>

          <section className="card-accent p-5">
            <h2 className="card-header mb-4">Tasks</h2>
            {wo.tasks.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No tasks</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {wo.tasks.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <span className="text-gray-900 dark:text-gray-100">{t.task_name}</span>
                    <span className="text-gray-500 dark:text-gray-400 font-medium tabular-nums ml-4">{t.qty_required}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card-accent p-5">
            <h2 className="card-header mb-4">Techs Assigned</h2>
            {wo.techs.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No techs assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {wo.techs.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    <Wrench size={12} /> {t.tech_name}
                  </span>
                ))}
              </div>
            )}
          </section>

          {wo.notes && (
            <section className="card-accent p-5">
              <h2 className="card-header mb-3">Notes</h2>
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">{wo.notes}</p>
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
