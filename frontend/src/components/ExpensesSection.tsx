import { useState, useEffect } from 'react';
import client from '../api/client';
import { Plus, Trash2, DollarSign } from 'lucide-react';

interface Expense {
  id: string;
  expense_type: string;
  amount: number;
  description: string;
  tech_name: string;
}

interface Props {
  workOrderReference: string;
}

const expenseTypes = ['material', 'labor', 'mileage', 'per_diem'];

export default function ExpensesSection({ workOrderReference }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ expense_type: 'material', amount: 0, description: '', tech_name: '' });

  useEffect(() => {
    client.get(`/work-orders/${workOrderReference}/expenses`).then(({ data }) => setExpenses(data));
  }, [workOrderReference]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await client.post(`/work-orders/${workOrderReference}/expenses`, form);
    setExpenses((prev) => [...prev, data]);
    setForm({ expense_type: 'material', amount: 0, description: '', tech_name: '' });
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await client.delete(`/work-orders/${workOrderReference}/expenses/${id}`);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const typeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ');

  return (
    <section className="card-accent p-5">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="card-header">Expenses / Tech Pay</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-display font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            ${total.toFixed(2)}
          </span>
          <DollarSign size={14} className="text-gray-400 dark:text-gray-500" />
        </div>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-2">
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No expenses</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${exp.expense_type === 'mileage' ? 'bg-blue-500' : exp.expense_type === 'labor' ? 'bg-purple-500' : exp.expense_type === 'material' ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{typeLabel(exp.expense_type)}</span>
                      {exp.tech_name && <span className="text-gray-400 dark:text-gray-500 text-xs">{exp.tech_name}</span>}
                    </div>
                    {exp.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{exp.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-display text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">${exp.amount.toFixed(2)}</span>
                    <button onClick={() => handleDelete(exp.id)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {adding ? (
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-800 mt-3">
              <select
                value={form.expense_type}
                onChange={(e) => setForm({ ...form, expense_type: e.target.value })}
                className="input-field w-auto"
              >
                {expenseTypes.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="input-field w-28"
                required
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field flex-1 min-w-[120px]"
              />
              <input
                placeholder="Tech name"
                value={form.tech_name}
                onChange={(e) => setForm({ ...form, tech_name: e.target.value })}
                className="input-field w-28"
              />
              <div className="flex gap-1">
                <button type="submit" className="btn-primary text-xs py-2 px-3">Add</button>
                <button type="button" onClick={() => setAdding(false)} className="btn-secondary text-xs py-2 px-3">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="mt-3 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium inline-flex items-center gap-1 transition-colors">
              <Plus size={14} /> Add Expense
            </button>
          )}
        </div>
      )}
    </section>
  );
}
