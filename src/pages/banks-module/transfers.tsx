import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { bankAccountsService, bankTransfersService, chartAccountsService, financialReportsService } from '../../services/database';

interface BankTransfer {
  id: string;
  bancoOrigen: string; // from_bank_id
  cuentaOrigen: string; // from_bank_account_code
  bancoDestino: string; // to_bank_id
  cuentaDestino: string; // to_bank_account_code
  moneda: string; // currency
  monto: number; // amount
  fecha: string; // transfer_date (ISO)
  referencia: string; // reference
  descripcion: string;
  estado: string; // status
}

export default function BankTransfersPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [accountsById, setAccountsById] = useState<Record<string, { id: string; code: string; name: string }>>({});
  const [originBalance, setOriginBalance] = useState<number | null>(null);
  const [form, setForm] = useState({
    bancoOrigen: '',
    cuentaOrigen: '',
    bancoDestino: '',
    cuentaDestino: '',
    moneda: 'DOP',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    referencia: '',
    descripcion: '',
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleOriginBankChange = (bankId: string) => {
    setForm(prev => {
      const next = { ...prev, bancoOrigen: bankId };
      const selectedBank = (banks || []).find((b: any) => b.id === bankId);
      if (selectedBank) {
        const accountId = selectedBank.chart_account_id as string | undefined;
        if (accountId) {
          const acc = accountsById[accountId];
          if (acc) {
            next.cuentaOrigen = acc.code;
          }
        }
        if (selectedBank.currency) {
          next.moneda = selectedBank.currency;
        }
      }
      return next;
    });
  };

  const handleDestBankChange = (bankId: string) => {
    setForm(prev => {
      const next = { ...prev, bancoDestino: bankId };
      const selectedBank = (banks || []).find((b: any) => b.id === bankId);
      if (selectedBank) {
        const accountId = selectedBank.chart_account_id as string | undefined;
        if (accountId) {
          const acc = accountsById[accountId];
          if (acc) {
            next.cuentaDestino = acc.code;
          }
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const loadTransfers = async () => {
      if (!user?.id) return;
      const data = await bankTransfersService.getAll(user.id);
      const mapped: BankTransfer[] = (data || []).map((row: any) => ({
        id: row.id,
        bancoOrigen: row.from_bank_id || '',
        cuentaOrigen: row.from_bank_account_code || '',
        bancoDestino: row.to_bank_id || '',
        cuentaDestino: row.to_bank_account_code || '',
        moneda: row.currency || 'DOP',
        monto: Number(row.amount) || 0,
        fecha: row.transfer_date || (row.created_at ? row.created_at.slice(0, 10) : ''),
        referencia: row.reference || '',
        descripcion: row.description || '',
        estado: row.status || 'issued',
      }));
      setTransfers(mapped);
    };

    loadTransfers();
  }, [user?.id]);

  useEffect(() => {
    const loadBanksAndAccounts = async () => {
      if (!user?.id) return;
      try {
        const [bankRows, chartRows] = await Promise.all([
          bankAccountsService.getAll(user.id),
          chartAccountsService.getAll(user.id),
        ]);

        setBanks(bankRows || []);

        const map: Record<string, { id: string; code: string; name: string }> = {};
        (chartRows || []).forEach((acc: any) => {
          map[acc.id] = {
            id: acc.id,
            code: acc.code,
            name: acc.name,
          };
        });
        setAccountsById(map);
      } catch (error) {
        console.error('Error cargando bancos y cuentas contables para transferencias', error);
      }
    };

    loadBanksAndAccounts();
  }, [user?.id]);

  // Cargar saldo contable estimado de la cuenta de banco origen
  useEffect(() => {
    const loadOriginBalance = async () => {
      if (!user?.id || !form.bancoOrigen) {
        setOriginBalance(null);
        return;
      }
      try {
        const originBank = (banks || []).find((b: any) => b.id === form.bancoOrigen);
        if (!originBank?.chart_account_id) {
          setOriginBalance(null);
          return;
        }
        const asOfDate = form.fecha || new Date().toISOString().slice(0, 10);
        const trial = await financialReportsService.getTrialBalance(user.id, '1900-01-01', asOfDate);
        const originAccount = (trial || []).find((acc: any) => acc.account_id === originBank.chart_account_id);
        if (originAccount) {
          setOriginBalance(Number(originAccount.balance) || 0);
        } else {
          setOriginBalance(null);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading origin bank balance for transfer', error);
        setOriginBalance(null);
      }
    };

    loadOriginBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, form.bancoOrigen, form.fecha, banks]);

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    const montoNumber = Number(form.monto);
    if (!form.bancoOrigen || !form.cuentaOrigen || !form.moneda || !form.fecha) {
      alert('Complete banco y cuenta de origen, moneda y fecha.');
      return;
    }
    if (isNaN(montoNumber) || montoNumber <= 0) {
      alert('El monto debe ser un número mayor que cero.');
      return;
    }

    if (!user?.id) {
      alert('Usuario no autenticado. Inicie sesión nuevamente.');
      return;
    }

    try {
      // Advertencia de saldo insuficiente (no bloqueante)
      try {
        if (originBalance === null) {
          alert(
            'Advertencia: no se pudo estimar el saldo contable de la cuenta de banco origen. ' +
              'Verifique sus saldos bancarios reales antes de confirmar la operación en el banco.'
          );
        } else if (originBalance >= 0 && montoNumber > originBalance + 0.01) {
          alert(
            `Advertencia: el monto a transferir (${montoNumber.toLocaleString()}) excede el saldo contable estimado de la cuenta (${originBalance.toLocaleString()}). ` +
              'Verifique sus saldos bancarios reales antes de confirmar la operación en el banco.'
          );
        }
      } catch (balanceError) {
        // No interrumpir la operación por errores al estimar el saldo
        // eslint-disable-next-line no-console
        console.error('Error estimating origin bank balance for transfer', balanceError);
      }

      const created = await bankTransfersService.create(user.id, {
        from_bank_id: form.bancoOrigen,
        from_bank_account_code: form.cuentaOrigen,
        to_bank_id: form.bancoDestino || null,
        to_bank_account_code: form.cuentaDestino || null,
        currency: form.moneda,
        amount: montoNumber,
        transfer_date: form.fecha,
        reference: form.referencia.trim(),
        description: form.descripcion.trim(),
      });

      const mapped: BankTransfer = {
        id: created.id,
        bancoOrigen: created.from_bank_id || form.bancoOrigen,
        cuentaOrigen: created.from_bank_account_code || form.cuentaOrigen,
        bancoDestino: created.to_bank_id || form.bancoDestino,
        cuentaDestino: created.to_bank_account_code || form.cuentaDestino,
        moneda: created.currency || form.moneda,
        monto: Number(created.amount) || montoNumber,
        fecha: created.transfer_date || form.fecha,
        referencia: created.reference || form.referencia.trim(),
        descripcion: created.description || form.descripcion.trim(),
        estado: created.status || 'issued',
      };

      setTransfers(prev => [mapped, ...prev]);
      setForm(prev => ({
        ...prev,
        monto: '',
        referencia: '',
        descripcion: '',
      }));
    } catch (error: any) {
      console.error('Error creando transferencia bancaria:', error);
      alert(error?.message || 'Error al registrar la transferencia bancaria.');
    }
  };

  const selectedOriginBank = (banks || []).find((b: any) => b.id === form.bancoOrigen);
  const originBankAccountLabel = (() => {
    if (selectedOriginBank?.chart_account_id) {
      const acc = accountsById[selectedOriginBank.chart_account_id];
      if (acc) {
        return `${acc.code} - ${acc.name}`;
      }
    }
    return form.cuentaOrigen;
  })();

  const selectedDestBank = (banks || []).find((b: any) => b.id === form.bancoDestino);
  const destBankAccountLabel = (() => {
    if (selectedDestBank?.chart_account_id) {
      const acc = accountsById[selectedDestBank.chart_account_id];
      if (acc) {
        return `${acc.code} - ${acc.name}`;
      }
    }
    return form.cuentaDestino;
  })();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Transferencias Bancarias</h1>
          <p className="text-gray-600 text-sm max-w-3xl">
            Registre transferencias entre cuentas bancarias o hacia otras cuentas, indicando banco y cuenta de origen,
            banco/cuenta destino (si aplica), moneda, monto, fecha, referencia y concepto.
          </p>
        </div>

        {/* Formulario de registro */}
        <form onSubmit={handleAddTransfer} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Registrar nueva transferencia bancaria</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco Origen</label>
              <select
                value={form.bancoOrigen}
                onChange={(e) => handleOriginBankChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione un banco...</option>
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bank_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Origen (Cuenta Contable)</label>
              <input
                type="text"
                value={originBankAccountLabel || ''}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-700"
                placeholder="Se asigna automáticamente según el banco de origen seleccionado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco Destino (opcional)</label>
              <select
                value={form.bancoDestino}
                onChange={(e) => handleDestBankChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sin banco destino (solo salida de fondos)</option>
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bank_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Destino (Cuenta Contable, opcional)</label>
              <input
                type="text"
                value={destBankAccountLabel || ''}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-700"
                placeholder="Se asigna automáticamente si selecciona un banco destino"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <input
                type="text"
                value={form.moneda}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                value={form.monto}
                onChange={(e) => handleChange('monto', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de la Transferencia</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => handleChange('fecha', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
              <input
                type="text"
                value={form.referencia}
                onChange={(e) => handleChange('referencia', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: TRF-0001"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Concepto</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Transferencia entre cuentas"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrar transferencia
            </button>
          </div>
        </form>

        {/* Listado de transferencias */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Transferencias registradas</h2>
            <span className="text-xs text-gray-500">Total: {transfers.length}</span>
          </div>
          {transfers.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No hay transferencias bancarias registradas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Banco Origen</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Cuenta Origen</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Banco Destino</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Cuenta Destino</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Monto</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Moneda</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Referencia</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {transfers.map(tr => {
                    const currencyLabel =
                      tr.moneda === 'DOP'
                        ? 'Peso Dominicano'
                        : tr.moneda === 'USD'
                        ? 'Dólar Estadounidense'
                        : tr.moneda === 'EUR'
                        ? 'Euro'
                        : tr.moneda;
                    const statusLabel =
                      tr.estado === 'issued'
                        ? 'Emitida'
                        : tr.estado === 'processed'
                        ? 'Procesada'
                        : tr.estado === 'void'
                        ? 'Anulada'
                        : tr.estado;
                    return (
                      <tr key={tr.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{tr.fecha}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{tr.bancoOrigen}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{tr.cuentaOrigen}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{tr.bancoDestino || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{tr.cuentaDestino || '-'}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {tr.moneda} {tr.monto.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{currencyLabel}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{statusLabel}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{tr.referencia || '-'}</td>
                        <td className="px-4 py-2 text-gray-900">{tr.descripcion}</td>
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
