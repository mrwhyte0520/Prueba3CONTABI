import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import {
  bankDepositsService,
  bankChecksService,
  bankTransfersService,
  bankCreditsService,
  bankChargesService,
  bankReconciliationService,
  bankAccountsService,
} from '../../services/database';

type MovementType = 'deposit' | 'check' | 'transfer' | 'credit' | 'charge';

type BankMovement = {
  id: string;
  date: string;
  type: MovementType;
  bank_id?: string | null;
  bank_account_code?: string | null;
  currency: string;
  amount: number;
  reference?: string | null;
  description?: string | null;
};

type Filters = {
  bankAccountSearch: string;
  fromDate: string;
  toDate: string;
};

type StatementBalances = {
  opening: string;
  closing: string;
};

export default function BankReconciliationPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [reconciliationDate, setReconciliationDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [filters, setFilters] = useState<Filters>({
    bankAccountSearch: '',
    fromDate: '',
    toDate: '',
  });
  const [statement, setStatement] = useState<StatementBalances>({
    opening: '',
    closing: '',
  });
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadBankAccounts = async () => {
      try {
        const data = await bankAccountsService.getAll(user.id);
        const mapped = (data || []).map((ba: any) => ({
          id: ba.id as string,
          name: `${ba.bank_name} - ${ba.account_number}`,
        }));
        setBankAccounts(mapped);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading bank accounts for reconciliation (banks module):', err);
      }
    };

    loadBankAccounts();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [deposits, checks, transfers, credits, charges] = await Promise.all([
          bankDepositsService.getAll(user.id),
          bankChecksService.getAll(user.id),
          bankTransfersService.getAll(user.id),
          bankCreditsService.getAll(user.id),
          bankChargesService.getAll(user.id),
        ]);

        const normalized: BankMovement[] = [];

        // Depósitos
        (deposits as any[]).forEach((d) => {
          normalized.push({
            id: d.id,
            date: d.deposit_date,
            type: 'deposit',
            bank_id: d.bank_id ?? null,
            bank_account_code: d.bank_account_code ?? null,
            currency: d.currency,
            amount: Number(d.amount) || 0,
            reference: d.reference ?? null,
            description: d.description ?? null,
          });
        });

        // Cheques
        (checks as any[]).forEach((c) => {
          normalized.push({
            id: c.id,
            date: c.check_date,
            type: 'check',
            bank_id: c.bank_id ?? null,
            bank_account_code: c.bank_account_code ?? null,
            currency: c.currency,
            amount: Number(c.amount) || 0,
            reference: c.check_number ?? null,
            description: c.description ?? null,
          });
        });

        // Transferencias (solo lado del banco origen para conciliación)
        (transfers as any[]).forEach((t) => {
          normalized.push({
            id: t.id,
            date: t.transfer_date,
            type: 'transfer',
            bank_id: t.from_bank_id ?? null,
            bank_account_code: t.from_bank_account_code ?? null,
            currency: t.currency,
            amount: Number(t.amount) || 0,
            reference: t.reference ?? null,
            description: t.description ?? null,
          });
        });

        // Créditos bancarios
        (credits as any[]).forEach((cr) => {
          normalized.push({
            id: cr.id,
            date: cr.start_date,
            type: 'credit',
            bank_id: cr.bank_id ?? null,
            bank_account_code: cr.bank_account_code ?? null,
            currency: cr.currency,
            amount: Number(cr.amount) || 0,
            reference: cr.credit_number ?? null,
            description: cr.description ?? null,
          });
        });

        // Cargos bancarios
        (charges as any[]).forEach((ch) => {
          normalized.push({
            id: ch.id,
            date: ch.charge_date,
            type: 'charge',
            bank_id: ch.bank_id ?? null,
            bank_account_code: ch.bank_account_code ?? null,
            currency: ch.currency,
            amount: Number(ch.amount) || 0,
            reference: ch.ncf ?? null,
            description: ch.description ?? null,
          });
        });

        // Orden por fecha ascendente (útil para conciliación)
        normalized.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

        setMovements(normalized);
        setReconciledIds(new Set());
      } catch (e: any) {
        setError(e?.message || 'Error cargando movimientos bancarios para conciliación');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStatementChange = (field: keyof StatementBalances, value: string) => {
    setStatement((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleReconciled = (id: string) => {
    setReconciledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (
        filters.bankAccountSearch &&
        !(
          (m.bank_account_code || '').toLowerCase().includes(filters.bankAccountSearch.toLowerCase()) ||
          (m.bank_id || '').toLowerCase().includes(filters.bankAccountSearch.toLowerCase())
        )
      ) {
        return false;
      }

      if (filters.fromDate && m.date < filters.fromDate) return false;
      if (filters.toDate && m.date > filters.toDate) return false;

      return true;
    });
  }, [movements, filters]);

  const getSignedAmount = (m: BankMovement) => {
    // Para conciliación, tratamos:
    // - Depósitos y créditos como entradas (+)
    // - Cheques, transferencias (origen) y cargos como salidas (-)
    const positiveTypes: MovementType[] = ['deposit', 'credit'];
    const sign = positiveTypes.includes(m.type) ? 1 : -1;
    return sign * m.amount;
  };

  const totals = useMemo(() => {
    let totalAll = 0;
    let totalReconciled = 0;

    filteredMovements.forEach((m) => {
      const signed = getSignedAmount(m);
      totalAll += signed;
      if (reconciledIds.has(m.id)) {
        totalReconciled += signed;
      }
    });

    const opening = Number(statement.opening.replace(',', '.')) || 0;
    const closing = Number(statement.closing.replace(',', '.')) || 0;

    const calculatedClosing = opening + totalReconciled;
    const difference = closing ? closing - calculatedClosing : 0;

    return {
      totalAll,
      totalReconciled,
      opening,
      closing,
      calculatedClosing,
      difference,
    };
  }, [filteredMovements, reconciledIds, statement]);

  const formatCurrency = (value: number) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatTypeLabel = (type: MovementType) => {
    switch (type) {
      case 'deposit':
        return 'Depósito';
      case 'check':
        return 'Cheque';
      case 'transfer':
        return 'Transferencia';
      case 'credit':
        return 'Crédito bancario';
      case 'charge':
        return 'Cargo bancario';
      default:
        return type;
    }
  };

  const handleSaveReconciliation = async () => {
    if (!user?.id) {
      alert('Debe iniciar sesión para guardar la conciliación.');
      return;
    }

    if (!selectedBankAccountId) {
      alert('Debe seleccionar una cuenta de banco para guardar la conciliación.');
      return;
    }

    if (!reconciliationDate) {
      alert('Debe seleccionar una fecha de conciliación.');
      return;
    }

    try {
      const opening = Number(statement.opening.replace(',', '.')) || 0;
      const bookBalance = totals.calculatedClosing;

      const reconciliation = await bankReconciliationService.getOrCreateReconciliation(
        user.id,
        selectedBankAccountId,
        reconciliationDate,
        opening,
        bookBalance,
      );

      // Persistir items de conciliación para todos los movimientos visibles
      await bankReconciliationService.upsertItemsFromBankMovements(
        reconciliation.id,
        user.id,
        filteredMovements,
        reconciledIds,
      );

      alert(
        `Conciliación guardada correctamente para la cuenta seleccionada y fecha ${reconciliationDate}.`,
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error saving bank reconciliation from banks module:', err);
      alert('Error al guardar la conciliación bancaria.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Conciliación Bancaria</h1>
          <p className="text-gray-600 text-sm">
            Seleccione la cuenta, el periodo y marque los movimientos que aparecen en el extracto bancario para calcular la conciliación.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="bg-white rounded-lg shadow p-4 space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold">Parámetros de conciliación</h2>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Cuenta de Banco
                </label>
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-8"
                >
                  <option value="">Seleccionar cuenta</option>
                  {bankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Desde</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Hasta / Fecha de Conciliación</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => {
                    handleFilterChange('toDate', e.target.value);
                    setReconciliationDate(e.target.value || new Date().toISOString().split('T')[0]);
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Saldo inicial del extracto
                </label>
                <input
                  type="text"
                  value={statement.opening}
                  onChange={(e) => handleStatementChange('opening', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Ej: 150000.00"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Saldo final del extracto
                </label>
                <input
                  type="text"
                  value={statement.closing}
                  onChange={(e) => handleStatementChange('closing', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Ej: 175000.00"
                />
              </div>
            </div>

            <div className="pt-2 text-xs text-gray-600">
              {loading
                ? 'Cargando movimientos bancarios...'
                : `${filteredMovements.length} movimiento(s) encontrados para los filtros actuales.`}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveReconciliation}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                disabled={!selectedBankAccountId || !reconciliationDate}
              >
                <i className="ri-save-line mr-2" />
                Guardar Conciliación
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h2 className="text-lg font-semibold">Resumen de conciliación</h2>

            <div className="text-sm">
              <div className="flex justify-between py-1 border-b border-dashed border-gray-200">
                <span className="text-gray-600">Saldo inicial extracto:</span>
                <span className="font-mono">
                  {formatCurrency(totals.opening)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-gray-200">
                <span className="text-gray-600">Total movimientos conciliados:</span>
                <span className="font-mono">
                  {formatCurrency(totals.totalReconciled)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-gray-200">
                <span className="text-gray-600">Saldo calculado (sist.+conc.):</span>
                <span className="font-mono">
                  {formatCurrency(totals.calculatedClosing)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-gray-200">
                <span className="text-gray-600">Saldo final extracto:</span>
                <span className="font-mono">
                  {formatCurrency(totals.closing)}
                </span>
              </div>
              <div className="flex justify-between py-1 mt-1">
                <span className="font-medium text-gray-700">Diferencia:</span>
                <span
                  className={`font-mono font-semibold ${
                    Math.abs(totals.difference) < 0.01
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatCurrency(totals.difference)}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Para una conciliación perfecta, la diferencia debe ser 0.00.
              Esta primera versión no guarda la conciliación; es solo para análisis en pantalla.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Movimientos a conciliar</h2>
            {loading && (
              <span className="text-xs text-gray-500">Cargando...</span>
            )}
          </div>

          {filteredMovements.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay movimientos que coincidan con los filtros actuales.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center">
                      <span className="sr-only">Conciliado</span>
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Cuenta/Banco</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Moneda</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Monto (+/-)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Referencia</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMovements.map((m) => {
                    const signed = getSignedAmount(m);
                    const checked = reconciledIds.has(m.id);
                    return (
                      <tr key={`${m.type}-${m.id}`} className={checked ? 'bg-emerald-50/40' : ''}>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleReconciled(m.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {m.date ? new Date(m.date).toLocaleDateString() : ''}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {formatTypeLabel(m.type)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {m.bank_account_code || m.bank_id || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">{m.currency}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {signed >= 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(signed))}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          {m.reference || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate">
                          {m.description || ''}
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
