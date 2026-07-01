import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import WorkOrderForm from '../components/WorkOrderForm';
import { getWorkOrder, updateWorkOrder } from '../api/workOrders';
import { WorkOrderFormData } from '../types';
import { ArrowLeft } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';

function toLocalDatetime(utcStr: string | null | undefined, tz: string): string {
  if (!utcStr) return '';
  try {
    const zoned = toZonedTime(new Date(utcStr), tz);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}T${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`;
  } catch {
    return '';
  }
}

export default function WorkOrderEditPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<WorkOrderFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!reference) return;
    getWorkOrder(reference)
      .then((wo) => {
        setInitial({
          reference: wo.reference,
          account_number: wo.account_number,
          invoice_number: wo.invoice_number,
          po_number: wo.po_number,
          dealer_id: wo.dealer_id,
          location_name: wo.location_name,
          site_contact: wo.site_contact,
          address_line1: wo.address_line1,
          address_line2: wo.address_line2,
          city: wo.city,
          state: wo.state,
          zip: wo.zip,
          primary_phone: wo.primary_phone,
          earliest_start: toLocalDatetime(wo.earliest_start, wo.site_timezone),
          planned_start: toLocalDatetime(wo.planned_start, wo.site_timezone),
          due_date: toLocalDatetime(wo.due_date, wo.site_timezone),
          calendar_start: toLocalDatetime(wo.calendar_start, wo.site_timezone),
          calendar_end: toLocalDatetime(wo.calendar_end, wo.site_timezone),
          site_timezone: wo.site_timezone,
          notes: wo.notes || '',
          status: wo.status,
          confirmation_status: wo.confirmation_status,
          tasks: wo.tasks.length > 0 ? wo.tasks : [{ task_name: '', qty_required: 1, sort_order: 0 }],
          techs: wo.techs.length > 0 ? wo.techs : [],
        });
      })
      .catch(() => navigate('/'))
      .finally(() => setFetching(false));
  }, [reference, navigate]);

  const handleSubmit = async (data: WorkOrderFormData) => {
    if (!reference) return;
    setLoading(true);
    try {
      const wo = await updateWorkOrder(reference, data);
      navigate(`/orders/${wo.reference}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update work order');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!initial) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Work order not found</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/orders/${reference}`} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit {reference}</h1>
      </div>
      <WorkOrderForm initial={initial} onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
