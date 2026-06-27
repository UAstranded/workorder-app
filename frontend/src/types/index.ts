export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id?: string;
  task_name: string;
  qty_required: number;
  sort_order: number;
}

export interface WorkOrder {
  id: string;
  reference: string;
  account_number: string;
  invoice_number: string;
  po_number: string;
  dealer_id: string;
  location_name: string;
  site_contact: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  primary_phone: string;
  earliest_start: string | null;
  planned_start: string | null;
  due_date: string | null;
  site_timezone: string;
  status: string;
  confirmation_status: string;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
  modified_by_id: string | null;
  tasks: Task[];
  expenses: WorkOrderExpense[];
  image_count: number;
}

export interface WorkOrderListEntry {
  id: string;
  reference: string;
  account_number: string;
  invoice_number: string;
  location_name: string;
  city: string;
  state: string;
  status: string;
  confirmation_status: string;
  earliest_start: string | null;
  planned_start: string | null;
  due_date: string | null;
  site_timezone: string;
  created_at: string;
  updated_at: string;
  image_count: number;
}

export interface ImageAttachment {
  id: string;
  work_order_id: string;
  original_filename: string;
  stored_filename: string;
  label: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by_id: string | null;
}

export interface WorkOrderExpense {
  id: string;
  work_order_id: string;
  expense_type: string;
  amount: number;
  description: string;
  tech_name: string;
  sort_order: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export interface WorkOrderFormData {
  reference?: string;
  account_number: string;
  invoice_number: string;
  po_number: string;
  dealer_id: string;
  location_name: string;
  site_contact: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  primary_phone: string;
  earliest_start: string;
  planned_start: string;
  due_date: string;
  site_timezone: string;
  status: string;
  confirmation_status: string;
  tasks: Task[];
}
