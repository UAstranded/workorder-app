import { useState, useRef, FormEvent } from 'react';
import { WorkOrderFormData, Task } from '../types';
import { useTimezone } from '../contexts/TimezoneContext';
import { Plus, Trash2, Save, Scan } from 'lucide-react';
import TechsSection from './TechsSection';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { scanImage, parseWorkOrderForm, applyParsedFields } from '../utils/ocr';

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
  notes: '',
  status: 'Open - Unconfirmed',
  confirmation_status: 'Unconfirmed',
  tasks: [{ task_name: '', qty_required: 1, sort_order: 0 }],
  techs: [],
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
  const [scanning, setScanning] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

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

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const text = await scanImage(file);
      const parsed = parseWorkOrderForm(text);
      setForm((prev) => applyParsedFields(prev, parsed));
    } catch (err: any) {
      alert('OCR scan failed: ' + (err.message || 'Unknown error'));
    }
    setScanning(false);
    if (scanRef.current) scanRef.current.value = '';
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
      techs: form.techs.filter((t) => t.tech_name.trim()),
    };

    await onSubmit(submitData);
  };

  const inputClass = (field: string) =>
    `input-field ${errors[field] ? 'input-error' : ''}`;

  const labelClass = "section-label block mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded-md">
          {Object.values(errors).map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mb-2">
        <input ref={scanRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
        <button type="button" onClick={() => scanRef.current?.click()} disabled={scanning} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors disabled:opacity-50">
          <Scan size={14} /> {scanning ? 'Scanning...' : 'Scan Form'}
        </button>
      </div>

      <section className="card-accent p-5">
        <h2 className="card-header mb-4">Identifiers</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Reference</label>
            <input className={inputClass('reference')} value={form.reference || ''} onChange={(e) => update('reference', e.target.value)} placeholder="Auto-generated if blank" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
      </section>

      <section className="card-accent p-5">
        <h2 className="card-header mb-4">Site / Contact Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <section className="card-accent p-5">
        <h2 className="card-header mb-4">Schedule</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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

      <section className="card-accent p-5">
        <h2 className="card-header mb-4">Notes</h2>
        <textarea
          className="input-field min-h-[100px] resize-y"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="General notes, instructions, or remarks..."
        />
      </section>

      <section className="card-accent p-5">
        <h2 className="card-header mb-4">Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <section className="card-accent p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-header">Tasks</h2>
          <button type="button" onClick={addTask} className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium inline-flex items-center gap-1 transition-colors">
            <Plus size={14} /> Add Task
          </button>
        </div>
        <div className="space-y-2">
          {form.tasks.map((task, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                placeholder="Task name"
                value={task.task_name}
                onChange={(e) => updateTask(idx, 'task_name', e.target.value)}
                className="flex-1 input-field"
              />
              <input
                type="number"
                min={1}
                value={task.qty_required}
                onChange={(e) => updateTask(idx, 'qty_required', parseInt(e.target.value) || 1)}
                className="w-20 input-field text-center"
              />
              {form.tasks.length > 1 && (
                <button type="button" onClick={() => removeTask(idx)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card-accent p-5">
        <TechsSection
          techs={form.techs}
          onChange={(techs) => setForm((prev) => ({ ...prev, techs }))}
        />
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          <Save size={16} /> {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
