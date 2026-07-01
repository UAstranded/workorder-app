import Tesseract from 'tesseract.js';
import { WorkOrderFormData } from '../types';
import { formatPhone } from './format';

export async function scanImage(file: File): Promise<string> {
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`OCR: ${Math.round(m.progress * 100)}%`);
      }
    },
  });
  return data.text;
}

export interface ParsedFields {
  reference?: string;
  account_number?: string;
  invoice_number?: string;
  po_number?: string;
  dealer_id?: string;
  location_name?: string;
  site_contact?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  primary_phone?: string;
  earliest_start?: string;
  planned_start?: string;
  due_date?: string;
  status?: string;
  confirmation_status?: string;
  notes?: string;
  tasks?: { task_name: string; qty_required: number; sort_order: number }[];
}

function extractValue(text: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return '';
}

function parseDate(val: string): string {
  const cleaned = val.replace(/[^\d/\-.\sT:]/g, '').trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const m = cleaned.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T12:00`;
  const m2 = cleaned.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (m2) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}T12:00`;
  return '';
}

export function parseWorkOrderForm(text: string): ParsedFields {
  const lines = text.split('\n').filter(Boolean);

  const reference = extractValue(text, [
    /(?:ref|reference|wo)\s*(?:#|no)?\s*[:.]?\s*([^\n]+)/i,
    /WO-[\w-]+/,
  ]);

  const account_number = extractValue(text, [
    /account\s*(?:#|no|number|num)?\s*[:.]?\s*([^\n]+)/i,
    /acct\s*(?:#|no)?\s*[:.]?\s*([^\n]+)/i,
  ]);

  const invoice_number = extractValue(text, [
    /invoice\s*(?:#|no|number|num)?\s*[:.]?\s*([^\n]+)/i,
    /inv\s*(?:#|no)?\s*[:.]?\s*([^\n]+)/i,
  ]);

  const po_number = extractValue(text, [
    /(?:po|p\.?o\.?|purchase\s*order)\s*(?:#|no|number|num)?\s*[:.]?\s*([^\n]+)/i,
  ]);

  const dealer_id = extractValue(text, [
    /dealer\s*(?:id|#|no)?\s*[:.]?\s*([^\n]+)/i,
  ]);

  const location_name = extractValue(text, [
    /(?:location|site)\s*(?:name)?\s*[:.]?\s*([^\n]+)/i,
  ]);

  const site_contact = extractValue(text, [
    /(?:site\s*contact|contact\s*(?:name|person)?)\s*[:.]?\s*([^\n]+)/i,
  ]);

  const address_line1 = extractValue(text, [
    /(?:address|addr)\s*(?:line\s*1|1)?\s*[:.]?\s*([^\n]+)/i,
  ]);

  const address_line2 = extractValue(text, [
    /(?:address|addr)\s*line\s*2\s*[:.]?\s*([^\n]+)/i,
    /address2?\s*[:.]?\s*([^\n]+)/i,
  ]);

  const city = extractValue(text, [
    /city\s*[:.]?\s*([^\n]+)/i,
  ]);

  const state = extractValue(text, [
    /state\s*[:.]?\s*([^\n]+)/i,
  ]);

  const zip = extractValue(text, [
    /(?:zip|postal\s*code)\s*[:.]?\s*([^\n]+)/i,
  ]);

  const primary_phone = extractValue(text, [
    /(?:phone|telephone|primary\s*phone|contact\s*(?:#|no)?)\s*[:.]?\s*([^\n]+)/i,
    /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,
  ]);

  const earliest_start = parseDate(extractValue(text, [
    /(?:earliest\s*start|start\s*date|earliest)\s*[:.]?\s*([^\n]+)/i,
  ]));

  const planned_start = parseDate(extractValue(text, [
    /(?:planned\s*start|scheduled\s*(?:start|date)|planned)\s*[:.]?\s*([^\n]+)/i,
  ]));

  const due_date = parseDate(extractValue(text, [
    /(?:due\s*date|deadline|completion\s*date|due)\s*[:.]?\s*([^\n]+)/i,
  ]));

  const confirmationMatch = text.match(/confirmation\s+status\s*[:.]?\s*([^\n]+)/i);
  const confirmation_status = confirmationMatch?.[1]?.trim();

  const textNoConfirmation = lines.filter(l => !/confirmation/i.test(l)).join('\n');
  const status = extractValue(textNoConfirmation, [
    /status\s*[:.]?\s*([^\n]+)/i,
  ]);

  const notesMatch = text.match(/notes?\s*[:.]?\s*([^\n]+(?:[\s\S]*?)(?=\n\w+\s*[:.]|$))/i);
  const notes = notesMatch?.[1]?.trim() || '';

  const tasks: { task_name: string; qty_required: number; sort_order: number }[] = [];
  let inTasks = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^tasks?\s*[:.]/i.test(line)) { inTasks = true; continue; }
    if (inTasks) {
      if (/^(?:notes?|status|identifiers|schedule|site)\s*[:.]/i.test(line)) break;
      if (/^qty\s+required/i.test(line)) continue;
      if (line.length < 2 || /^\d+[.)]\s*$/.test(line)) continue;
      let qty = 1;
      for (let j = 1; j <= 3 && i + j < lines.length; j++) {
        const next = lines[i + j].trim();
        const qm = next.match(/qty\s+required\s*[:.]?\s*(\d+)/i);
        if (qm) { qty = parseInt(qm[1]); break; }
        if (/^tasks?\s*[:.]/i.test(next)) break;
      }
      tasks.push({
        task_name: line,
        qty_required: qty,
        sort_order: tasks.length,
      });
    }
  }

  return {
    reference,
    account_number,
    invoice_number,
    po_number,
    dealer_id,
    location_name,
    site_contact,
    address_line1,
    address_line2,
    city,
    state,
    zip,
    primary_phone,
    earliest_start,
    planned_start,
    due_date,
    status,
    confirmation_status,
    notes,
    tasks: tasks.length > 0 ? tasks : undefined,
  };
}

const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Cancelled'] as const;

function normalizeStatus(val: string): string {
  for (const opt of STATUS_OPTIONS) {
    if (opt.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(opt.toLowerCase())) {
      return opt;
    }
  }
  return val;
}

export function applyParsedFields(
  form: WorkOrderFormData,
  parsed: ParsedFields
): WorkOrderFormData {
  const updated = { ...form };

  if (parsed.reference) updated.reference = parsed.reference;
  if (parsed.account_number) updated.account_number = parsed.account_number;
  if (parsed.invoice_number) updated.invoice_number = parsed.invoice_number;
  if (parsed.po_number) updated.po_number = parsed.po_number;
  if (parsed.dealer_id) updated.dealer_id = parsed.dealer_id;
  if (parsed.location_name) updated.location_name = parsed.location_name;
  if (parsed.site_contact) updated.site_contact = parsed.site_contact;
  if (parsed.address_line1) updated.address_line1 = parsed.address_line1;
  if (parsed.address_line2) updated.address_line2 = parsed.address_line2;
  if (parsed.city) updated.city = parsed.city;
  if (parsed.state) updated.state = parsed.state;
  if (parsed.zip) updated.zip = parsed.zip;
  if (parsed.primary_phone) updated.primary_phone = formatPhone(parsed.primary_phone);
  if (parsed.earliest_start) updated.earliest_start = parsed.earliest_start;
  if (parsed.planned_start) updated.planned_start = parsed.planned_start;
  if (parsed.due_date) updated.due_date = parsed.due_date;
  if (parsed.status) updated.status = normalizeStatus(parsed.status);
  if (parsed.confirmation_status) {
    const v = parsed.confirmation_status.toLowerCase();
    updated.confirmation_status = v.includes('unconf') || v.includes('un-conf') ? 'Unconfirmed' : 'Confirmed';
  }
  if (parsed.notes) updated.notes = parsed.notes;
  if (parsed.tasks) updated.tasks = parsed.tasks;

  return updated;
}
