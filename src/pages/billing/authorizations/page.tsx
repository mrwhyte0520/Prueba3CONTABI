import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';

interface ApprovalRequest {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  notes: string | null;
}

export default function AuthorizationsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(false);

  const loadRequests = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('approval_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests((data || []) as ApprovalRequest[]);
    } catch (error) {
      console.error('Error loading approval requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadRequests();
    }
  }, [user?.id, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      if (!user?.id) return;
      const payload: any = {
        status: newStatus,
      };
      if (newStatus === 'approved') {
        payload.approved_at = new Date().toISOString();
        payload.approved_by = user.id;
      }
      const { error } = await supabase
        .from('approval_requests')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      await loadRequests();
    } catch (error) {
      console.error('Error updating approval request:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'customer_payment':
        return 'Pago de cliente';
      case 'supplier_payment':
        return 'Pago a suplidor';
      case 'petty_cash_reimbursement':
        return 'Reembolso de caja chica';
      case 'invoice_discount':
        return 'Descuento en factura';
      case 'quote_discount':
        return 'Descuento en cotización';
      default:
        return type;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Autorizaciones</h1>
            <p className="text-gray-600">Solicitudes pendientes de aprobación para pagos, reembolsos y descuentos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
              >
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="all">Todos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Solicitudes ({requests.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha solicitud</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTypeLabel(req.entity_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {req.entity_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          req.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : req.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {req.status === 'pending'
                          ? 'Pendiente'
                          : req.status === 'approved'
                          ? 'Aprobada'
                          : 'Rechazada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(req.requested_at).toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                      {req.notes || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {req.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'approved')}
                            className="text-green-600 hover:text-green-900 p-1"
                          >
                            <i className="ri-check-line" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <i className="ri-close-line" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && requests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No hay solicitudes para mostrar.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                      Cargando solicitudes...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
