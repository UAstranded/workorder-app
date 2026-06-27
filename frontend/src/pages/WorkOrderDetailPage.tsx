import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getWorkOrder, deleteWorkOrder, getExportUrl, downloadExport } from '../api/workOrders';
import { WorkOrder as WorkOrderType } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatInTimeZone } from 'date-fns-tz';
import ImageGallery from '../components/ImageGallery';
import ExpensesSection from '../components/ExpensesSection';
import { ArrowLeft, Edit, Trash2, Share2, Download, Phone, Clock } from 'lucide-react';

export default function WorkOrderDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { displayTz } = useTimezone();
  const [wo, setWo] = useState<WorkOrderType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) return;
    setLoading(true);
    getWorkOrder(reference)
      .then(setWo)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [reference, navigate]);

  const handleDelete = async () => {
    if (!wo || !confirm('Delete this work order?')) return;
    await deleteWorkOrder(wo.reference);
    navigate('/');
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/share/${wo?.reference}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Work Order ${wo?.reference}`, url }); return; } catch { }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Share link copied to clipboard!');
    }
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

  if (loading) return <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">Loading...</div>;
  if (!wo) return <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">Work order not found</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -ml-1"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight">{wo.reference}</h1>
          <div className="flex items-center gap-2">
            {statusBadge(wo.status)}
            {confBadge(wo.confirmation_status)}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="btn-secondary text-xs"><Share2 size={14} /> Share</button>
          <button onClick={() => downloadExport(getExportUrl(wo.reference, displayTz), `work-order-${wo.reference}.xlsx`)} className="btn-secondary text-xs"><Download size={14} /> Export</button>
          <Link to={`/orders/${wo.reference}/edit`} className="btn-primary text-xs"><Edit size={14} /> Edit</Link>
          <button onClick={handleDelete} className="btn-danger text-xs"><Trash2 size={14} /> Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
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
                  <p className="font-medium text-gray-900 dark:text-gray-100 font-display text-xs tracking-tight">{val || '-'}</p>
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
                    <Phone size={13} /> {wo.primary_phone}
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
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{fmt(val as string | null)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">Site Timezone: {wo.site_timezone}</div>
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

          {wo.notes && (
            <section className="card-accent p-5">
              <h2 className="card-header mb-3">Notes</h2>
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">{wo.notes}</p>
            </section>
          )}

          <ImageGallery workOrderId={wo.id} />

          <ExpensesSection workOrderReference={wo.reference} />
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="card-header mb-4">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="section-label block mb-0.5">Created</span>
                <span className="text-gray-900 dark:text-gray-100 text-sm">{fmt(wo.created_at)}</span>
              </div>
              <div>
                <span className="section-label block mb-0.5">Updated</span>
                <span className="text-gray-900 dark:text-gray-100 text-sm">{fmt(wo.updated_at)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
