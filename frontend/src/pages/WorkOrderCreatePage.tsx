import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import WorkOrderForm from '../components/WorkOrderForm';
import { createWorkOrder } from '../api/workOrders';
import { WorkOrderFormData } from '../types';
import { ArrowLeft } from 'lucide-react';

export default function WorkOrderCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: WorkOrderFormData) => {
    setLoading(true);
    try {
      const wo = await createWorkOrder(data);
      navigate(`/orders/${wo.reference}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Work Order</h1>
      </div>
      <WorkOrderForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
