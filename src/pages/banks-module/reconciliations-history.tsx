import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { bankReconciliationsListService } from '../../services/database';

interface Reconciliation {
  id: string;
  bank_account_id: string;
  reconciliation_date: string;
  bank_statement_balance: number;
  book_balance: number;
  adjusted_balance: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  bank_accounts?: {
    bank_name?: string | null;
    account_number?: string | null;
  } | null;
}

export default function BankReconciliationsHistoryPage() {
  const { user } = useAuth();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await bankReconciliationsListService.getAllByUser(user.id);
        setReconciliations((data || []) as Reconciliation[]);
      } catch (err: any) {
        setError(err?.message || 'Error cargando historial de conciliaciones bancarias');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const formatCurrency = (value: number | null | undefined) => {
    const n = Number(value) || 0;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Historial de Conciliaciones Bancarias</h1>
          <p className="text-gray-600 text-sm">
            Consulte las conciliaciones realizadas por cuenta de banco, con sus saldos y estado.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conciliaciones registradas</h2>
            {loading && (
              <span className="text-xs text-gray-500">Cargando...</span>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-200">
              {error}
            </div>
          )}

          {reconciliations.length === 0 && !loading ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              No hay conciliaciones registradas todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Cuenta de Banco</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Saldo Extracto</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Saldo Libro</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-700">Diferencia</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reconciliations.map((rec) => {
                    const diff = (Number(rec.bank_statement_balance) || 0) - (Number(rec.book_balance) || 0);
                    const bankLabel = rec.bank_accounts
                      ? `${rec.bank_accounts.bank_name || ''} - ${rec.bank_accounts.account_number || ''}`.trim()
                      : rec.bank_account_id;

                    const status = rec.status || 'pending';

                    return (
                      <tr key={rec.id}>
                        <td className="px-4 py-2 text-xs text-gray-700">
                          {formatDate(rec.reconciliation_date)}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-900">
                          {bankLabel || '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">
                          {formatCurrency(rec.bank_statement_balance)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">
                          {formatCurrency(rec.book_balance)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">
                          <span className={Math.abs(diff) < 0.01 ? 'text-emerald-600' : 'text-red-600'}>
                            {formatCurrency(diff)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : status === 'closed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {status === 'pending' ? 'Pendiente' : status === 'closed' ? 'Cerrada' : status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
