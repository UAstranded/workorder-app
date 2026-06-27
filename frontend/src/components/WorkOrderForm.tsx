import { useState, FormEvent } from 'react';
import { WorkOrderFormData, Task } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { Plus, Trash2 } from 'lucide-react';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

interface Props {
  initial?: WorkOrderFormData;
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  loading: boolean;
}

const emptyForm = (): WorkOrderFormData => ({
  account_number: '', invoice_number: '', po_number: '', dealer_id: '',
  location_name: '', site_contact: '', address_line1: '', address_line2: '',
  city: '', state: '', zip: '', primary_phone: '',
  earliest_start: '', planned_start: '', due_date: '',
  site_timezone: 'America/New_York',
  status: 'Open - Unconfirmed',
  confirmation_status: 'Unconfirmed',
  tasks: [{ task_name: '', qty_required: 1, sort_order: 0 }],
});

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

function toUtc(localStr: string, tz: string): string {
  if (!localStr) return '';
  try {
    const date = new Date(localStr);
    return fromZonedTime(date, tz).toISOString();
  } catch {
    return '';
  }
}

export default function WorkOrderForm({ initial, onSubmit, loading }: Props) {
  const { commonTimezones } = useTimezone();
  const [form, setForm] = useState<WorkOrderFormData>(() => {
    if (initial) return initial;
    return emptyForm();
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof WorkOrderFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const addTask = () => {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { task_name: '', qty_required: 1, sort_order: prev.tasks.length }],
    }));
  };

  const removeTask = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== idx).map((t, i) => ({ ...t, sort_order: i })),
    }));
  };

  const updateTask = (idx: number, field: keyof Task, value: any) => {
    setForm((prev) => {
      const tasks = [...prev.tasks];
      tasks[idx] = { ...tasks[idx], [field]: value };
      return { ...prev, tasks };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.location_name.trim()) newErrors.location_name = 'Location name is required';
    if (form.earliest_start && form.due_date) {
      const es = new Date(toUtc(form.earliest_start, form.site_timezone));
      const dd = new Date(toUtc(form.due_date, form.site_timezone));
      if (dd < es) newErrors.due_date = 'Due date must not be before earliest start';
    }

    if (form.primary_phone && !/^[\d\s\-+.()]{7,20}$/.test(form.primary_phone)) {
      newErrors.primary_phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const submitData: WorkOrderFormData = {
      ...form,
      earliest_start: form.earliest_start ? toUtc(form.earliest_start, form.site_timezone) : null as any,
      planned_start: form.planned_start ? toUtc(form.planned_start, form.site_timezone) : null as any,
      due_date: form.due_date ? toUtc(form.due_date, form.site_timezone) : null as any,
      tasks: form.tasks.filter((t) => t.task_name.trim()),
    };

    await onSubmit(submitData);
  };

  const inputClass = (field: string) =>
    `w-full border ${errors[field] ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500`;

  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded">
          {Object.values(errors).map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Identifiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>Account Number</label>
            <input className={inputClass('account_number')} value={form.account_number} onChange={(e) => update('account_number', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Invoice Number</label>
            <input className={inputClass('invoice_number')} value={form.invoice_number} onChange={(e) => update('invoice_number', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>PO Number</label>
            <input className={inputClass('po_number')} value={form.po_number} onChange={(e) => update('po_number', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Dealer ID</label>
            <input className={inputClass('dealer_id')} value={form.dealer_id} onChange={(e) => update('dealer_id', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Site / Contact Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Location Name *</label>
            <input className={inputClass('location_name')} value={form.location_name} onChange={(e) => update('location_name', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Site Contact</label>
            <input className={inputClass('site_contact')} value={form.site_contact} onChange={(e) => update('site_contact', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Primary Phone</label>
            <input className={inputClass('primary_phone')} value={form.primary_phone} onChange={(e) => update('primary_phone', e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address Line 1</label>
            <input className={inputClass('address_line1')} value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Address Line 2</label>
            <input className={inputClass('address_line2')} value={form.address_line2} onChange={(e) => update('address_line2', e.target.value)} />
          </div>
          <div></div>
          <div>
            <label className={labelClass}>City</label>
            <input className={inputClass('city')} value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input className={inputClass('state')} value={form.state} onChange={(e) => update('state', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>ZIP</label>
            <input className={inputClass('zip')} value={form.zip} onChange={(e) => update('zip', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Schedule</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {(['earliest_start', 'planned_start', 'due_date'] as const).map((field) => (
            <div key={field}>
              <label className={labelClass}>
                {field === 'earliest_start' ? 'Earliest Start' : field === 'planned_start' ? 'Planned Start' : 'Due Date'}
              </label>
              <input
                type="datetime-local"
                className={inputClass(field)}
                value={form[field] as string}
                onChange={(e) => update(field, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div>
          <label className={labelClass}>Site Timezone</label>
          <select
            value={form.site_timezone}
            onChange={(e) => update('site_timezone', e.target.value)}
            className={inputClass('site_timezone')}
          >
            {commonTimezones.map((tz) => (
              <option key={tz} value={tz}>{tz.replace('_', ' ').replace('/', ' / ')}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputClass('status')}>
              {['Open - Confirmed', 'Open - Unconfirmed', 'In Progress', 'Completed', 'Cancelled'].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Confirmation Status</label>
            <select value={form.confirmation_status} onChange={(e) => update('confirmation_status', e.target.value)} className={inputClass('confirmation_status')}>
              <option value="Confirmed">Confirmed</option>
              <option value="Unconfirmed">Unconfirmed</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tasks</h2>
          <button type="button" onClick={addTask} className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors">
            <Plus size={16} /> Add Task
          </button>
        </div>
        <div className="space-y-2">
          {form.tasks.map((task, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                placeholder="Task name"
                value={task.task_name}
                onChange={(e) => updateTask(idx, 'task_name', e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                min={1}
                value={task.qty_required}
                onChange={(e) => updateTask(idx, 'qty_required', parseInt(e.target.value) || 1)}
                className="w-20 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              {form.tasks.length > 1 && (
                <button type="button" onClick={() => removeTask(idx)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 font-medium transition-colors">
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
