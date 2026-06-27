import client from './client';
import { WorkOrderExpense } from '../types';

export interface ExpenseForm {
  expense_type: string;
  amount: number;
  description?: string;
  tech_name?: string;
  sort_order?: number;
}

export async function listExpenses(reference: string): Promise<WorkOrderExpense[]> {
  const { data } = await client.get(`/work-orders/${reference}/expenses`);
  return data;
}

export async function createExpense(reference: string, form: ExpenseForm): Promise<WorkOrderExpense> {
  const { data } = await client.post(`/work-orders/${reference}/expenses`, form);
  return data;
}

export async function updateExpense(reference: string, expenseId: string, form: Partial<ExpenseForm>): Promise<WorkOrderExpense> {
  const { data } = await client.put(`/work-orders/${reference}/expenses/${expenseId}`, form);
  return data;
}

export async function deleteExpense(reference: string, expenseId: string): Promise<void> {
  await client.delete(`/work-orders/${reference}/expenses/${expenseId}`);
}
