import client from './client';
import { WorkOrder, WorkOrderListEntry, WorkOrderFormData } from '../types';

export interface ListParams {
  search?: string;
  status?: string;
  confirmation_status?: string;
  city?: string;
  state?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: string;
  skip?: number;
  limit?: number;
}

export async function listWorkOrders(params?: ListParams): Promise<WorkOrderListEntry[]> {
  const { data } = await client.get('/work-orders', { params });
  return data;
}

export async function getWorkOrder(reference: string): Promise<WorkOrder> {
  const { data } = await client.get(`/work-orders/${reference}`);
  return data;
}

export async function createWorkOrder(form: WorkOrderFormData): Promise<WorkOrder> {
  const { data } = await client.post('/work-orders', form);
  return data;
}

export async function updateWorkOrder(reference: string, form: WorkOrderFormData): Promise<WorkOrder> {
  const { data } = await client.put(`/work-orders/${reference}`, form);
  return data;
}

export async function deleteWorkOrder(reference: string): Promise<void> {
  await client.delete(`/work-orders/${reference}`);
}

export function getExportUrl(reference: string, tz: string): string {
  return `/api/export/work-order/${reference}?tz=${encodeURIComponent(tz)}`;
}

export function getExportListUrl(references: string[], tz: string): string {
  return `/api/export/work-orders?ids=${references.join(',')}&tz=${encodeURIComponent(tz)}`;
}

export async function downloadExport(url: string, filename: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
