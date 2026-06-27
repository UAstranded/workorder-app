import { useState, useEffect } from 'react';
import { WorkOrderExpense } from '../types';
import { listExpenses, createExpense, deleteExpense } from '../api/expenses';
import { Plus, Trash2, DollarSign } from 'lucide-react';

interface Props {
  workOrderReference: string;
}

const EXPENSE_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Labor' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'per_diem', label: 'Per Diem' },
];

const typeColors: Record<string, string> = {
  material: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  labor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  mileage: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  per_diem: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
};

export default function ExpensesSection({ workOrderReference }: Props) {
  const [expenses, setExpenses] = useState<WorkOrderExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchExpenses = async () => {
    try {
      const data = await listExpenses(workOrderReference);
      setExpenses(data);
    } catch { /* */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [workOrderReference]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await createExpense(workOrderReference, {
        expense_type: fd.get('expense_type') as string,
        amount: parseFloat(fd.get('amount') as string) || 0,
        description: fd.get('description') as string,
        tech_name: fd.get('tech_name') as string,
      });
      form.reset();
      setAdding(false);
      await fetchExpenses();
    } catch { /* */ }
  };

  const handleDelete = async (expId: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(workOrderReference, expId);
      await fetchExpenses();
    } catch { /* */ }
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-gray-400 dark:text-gray-500" />
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses / Tech Pay</h2>
          {total > 0 && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">${total.toFixed(2)}</span>
          )}
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-sm">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Loading...</p>
          ) : expenses.length === 0 && !adding ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No expenses recorded</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[exp.expense_type] || 'text-gray-600 bg-gray-100'}`}>
                      {exp.expense_type.replace('_', ' ')}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">${Number(exp.amount).toFixed(2)}</span>
                    {exp.description && <span className="text-gray-500 dark:text-gray-400 text-xs">{exp.description}</span>}
                    {exp.tech_name && <span className="text-gray-400 dark:text-gray-500 text-xs">— {exp.tech_name}</span>}
                  </div>
                  <button onClick={() => handleDelete(exp.id)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {adding ? (
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <select name="expense_type" defaultValue="material" className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {EXPENSE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input name="amount" type="number" step="0.01" min="0" placeholder="Amount" required className="w-24 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <input name="description" placeholder="Description" className="flex-1 min-w-[120px] border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <input name="tech_name" placeholder="Tech name" className="w-28 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm hover:bg-brand-700 transition-colors">Add</button>
              <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors">
              <Plus size={14} /> Add Expense
            </button>
          )}
        </div>
      )}
    </div>
  );
}
