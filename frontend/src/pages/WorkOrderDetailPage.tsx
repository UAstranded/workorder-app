import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getWorkOrder, deleteWorkOrder, getExportUrl, downloadExport } from '../api/workOrders';
import { WorkOrder as WorkOrderType } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatInTimeZone } from 'date-fns-tz';
import ImageGallery from '../components/ImageGallery';
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
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `Work Order ${wo?.reference}`, url }); } catch { /* */ }
    } else {
      await navigator.clipboard.writeText(url);
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

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!wo) return <div className="text-center py-12 text-gray-500">Work order not found</div>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold">{wo.reference}</h1>
          {statusBadge(wo.status)}
          {confBadge(wo.confirmation_status)}
        </div>
        <div className="flex gap-2">
          <button onClick={handleShare} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={() => downloadExport(getExportUrl(wo.reference, displayTz), `work-order-${wo.reference}.xlsx`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            <Download size={16} /> Export
          </button>
          <Link to={`/orders/${wo.reference}/edit`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={handleDelete} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Identifiers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                ['Account #', wo.account_number],
                ['Invoice #', wo.invoice_number],
                ['PO #', wo.po_number],
                ['Dealer ID', wo.dealer_id],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <span className="text-gray-500 text-xs">{label}</span>
                  <p className="font-medium">{val || '-'}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Site Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <span className="text-gray-500 text-xs">Location</span>
                <p className="font-medium">{wo.location_name || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Contact</span>
                <p className="font-medium">{wo.site_contact || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Phone</span>
                {wo.primary_phone ? (
                  <a href={`tel:${wo.primary_phone}`} className="font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
                    <Phone size={14} /> {wo.primary_phone}
                  </a>
                ) : <p className="font-medium">-</p>}
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500 text-xs">Address</span>
                <p className="font-medium">{wo.address_line1 || '-'}{wo.address_line2 ? `, ${wo.address_line2}` : ''}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">City</span>
                <p className="font-medium">{wo.city || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">State</span>
                <p className="font-medium">{wo.state || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">ZIP</span>
                <p className="font-medium">{wo.zip || '-'}</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-gray-400" />
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schedule ({displayTz})</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[
                ['Earliest Start', wo.earliest_start],
                ['Planned Start', wo.planned_start],
                ['Due Date', wo.due_date],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <span className="text-gray-500 text-xs">{label}</span>
                  <p className="font-medium">{fmt(val as string | null)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400">Site Timezone: {wo.site_timezone}</div>
          </section>

          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tasks</h2>
            {wo.tasks.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No tasks</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1 text-gray-500 font-medium">Task</th>
                    <th className="text-right py-1 text-gray-500 font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.tasks.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5">{t.task_name}</td>
                      <td className="text-right py-1.5">{t.qty_required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Attachments</h2>
            <ImageGallery workOrderId={wo.id} />
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Metadata</h2>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500 text-xs block">Created</span>{fmt(wo.created_at)}</div>
              <div><span className="text-gray-500 text-xs block">Updated</span>{fmt(wo.updated_at)}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
