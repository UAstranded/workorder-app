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
  // expenses state handled by ExpensesSection

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
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `Work Order ${wo?.reference}`, url }); return; } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Link copied to clipboard!');
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

  if (loading) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!wo) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Work order not found</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{wo.reference}</h1>
          {statusBadge(wo.status)}
          {confBadge(wo.confirmation_status)}
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={() => downloadExport(getExportUrl(wo.reference, displayTz), `work-order-${wo.reference}.xlsx`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={16} /> Export
          </button>
          <Link to={`/orders/${wo.reference}/edit`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 transition-colors">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={handleDelete} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
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

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
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

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
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

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
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

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Attachments</h2>
            <ImageGallery workOrderId={wo.id} />
          </section>

          <ExpensesSection workOrderReference={wo.reference} />
        </div>

        <div className="space-y-4">
          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Metadata</h2>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400 text-xs block">Created</span><span className="text-gray-900 dark:text-gray-100">{fmt(wo.created_at)}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 text-xs block">Updated</span><span className="text-gray-900 dark:text-gray-100">{fmt(wo.updated_at)}</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
