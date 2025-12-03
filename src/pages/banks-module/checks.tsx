import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { apInvoicesService, bankAccountsService, bankChecksService, chartAccountsService, financialReportsService } from '../../services/database';

interface BankCheck {
  id: string;
  banco: string; // bank_id
  cuentaBanco: string; // bank_account_code
  numeroCheque: string; // check_number
  beneficiario: string; // payee_name
  moneda: string; // currency
  monto: number; // amount
  fecha: string; // check_date (ISO)
  descripcion: string;
  estado: string; // status
}

export default function BankChecksPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<BankCheck[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [accountsById, setAccountsById] = useState<Record<string, { id: string; code: string; name: string }>>({});
  const [expenseAccounts, setExpenseAccounts] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [apInvoices, setApInvoices] = useState<any[]>([]);
  const [form, setForm] = useState({
    banco: '',
    cuentaBanco: '',
    numeroCheque: '',
    beneficiario: '',
    cuentaGasto: '',
    apInvoiceId: '',
    moneda: 'DOP',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBankChange = (bankId: string) => {
    setForm(prev => {
      const next = { ...prev, banco: bankId };
      const selectedBank = (banks || []).find((b: any) => b.id === bankId);
      if (selectedBank) {
        const accountId = selectedBank.chart_account_id as string | undefined;
        if (accountId) {
          const acc = accountsById[accountId];
          if (acc) {
            next.cuentaBanco = acc.code;
          }
        }
        if (selectedBank.currency) {
          next.moneda = selectedBank.currency;
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const loadChecks = async () => {
      if (!user?.id) return;
      const data = await bankChecksService.getAll(user.id);
      const mapped: BankCheck[] = (data || []).map((row: any) => ({
        id: row.id,
        banco: row.bank_id || '',
        cuentaBanco: row.bank_account_code || '',
        numeroCheque: row.check_number || '',
        beneficiario: row.payee_name || '',
        moneda: row.currency || 'DOP',
        monto: Number(row.amount) || 0,
        fecha: row.check_date || (row.created_at ? row.created_at.slice(0, 10) : ''),
        descripcion: row.description || '',
        estado: row.status || 'issued',
      }));
      setChecks(mapped);
    };

    loadChecks();
  }, [user?.id]);

  useEffect(() => {
    const loadBanksAndAccounts = async () => {
      if (!user?.id) return;
      try {
        const [bankRows, chartRows, invoiceRows] = await Promise.all([
          bankAccountsService.getAll(user.id),
          chartAccountsService.getAll(user.id),
          apInvoicesService.getAll(user.id),
        ]);

        setBanks(bankRows || []);

        const map: Record<string, { id: string; code: string; name: string }> = {};
        const expenses: Array<{ id: string; code: string; name: string }> = [];

        (chartRows || []).forEach((acc: any) => {
          const mapped = {
            id: acc.id,
            code: acc.code,
            name: acc.name,
          };
          map[acc.id] = mapped;

          if (acc.allowPosting && acc.isActive !== false && !acc.isBankAccount) {
            expenses.push(mapped);
          }
        });

        setAccountsById(map);
        setExpenseAccounts(expenses);

        const pendingInvoices = (invoiceRows || []).filter((inv: any) => inv.status !== 'paid');
        setApInvoices(pendingInvoices);
      } catch (error) {
        console.error('Error cargando bancos y cuentas contables para cheques', error);
      }
    };

    loadBanksAndAccounts();
  }, [user?.id]);

  const handleAddCheck = async (e: React.FormEvent) => {
    e.preventDefault();

    const montoNumber = Number(form.monto);
    if (
      !form.banco ||
      !form.cuentaBanco ||
      !form.numeroCheque.trim() ||
      !form.beneficiario.trim() ||
      !form.cuentaGasto ||
      !form.moneda ||
      !form.fecha
    ) {
      alert('Complete banco, cuenta de banco, número de cheque, beneficiario, cuenta de gasto/proveedor, moneda y fecha.');
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
      // Validar saldo disponible en cuenta bancaria
      const selectedBank = (banks || []).find((b: any) => b.id === form.banco);
      const bankAccountId = selectedBank?.chart_account_id;
      
      if (bankAccountId) {
        const saldoDisponible = await financialReportsService.getAccountBalance(user.id, bankAccountId);
        
        if (saldoDisponible < montoNumber) {
          const bankAccount = accountsById[bankAccountId];
          alert(
            `❌ Saldo insuficiente en cuenta bancaria\n\n` +
            `Banco: ${selectedBank?.bank_name || 'N/A'}\n` +
            `Cuenta: ${bankAccount?.code || 'N/A'} - ${bankAccount?.name || 'N/A'}\n` +
            `Saldo disponible: RD$${saldoDisponible.toFixed(2)}\n` +
            `Monto del cheque: RD$${montoNumber.toFixed(2)}\n\n` +
            `No puede emitir un cheque sin fondos suficientes.`
          );
          return;
        }
      }

      const created = await bankChecksService.create(user.id, {
        bank_id: form.banco,
        bank_account_code: form.cuentaBanco,
        check_number: form.numeroCheque.trim(),
        payee_name: form.beneficiario.trim(),
        currency: form.moneda,
        amount: montoNumber,
        check_date: form.fecha,
        description: form.descripcion.trim(),
        expense_account_code: form.cuentaGasto,
        ap_invoice_id: form.apInvoiceId || null,
      });

      const mapped: BankCheck = {
        id: created.id,
        banco: created.bank_id || form.banco,
        cuentaBanco: created.bank_account_code || form.cuentaBanco,
        numeroCheque: created.check_number || form.numeroCheque.trim(),
        beneficiario: created.payee_name || form.beneficiario.trim(),
        moneda: created.currency || form.moneda,
        monto: Number(created.amount) || montoNumber,
        fecha: created.check_date || form.fecha,
        descripcion: created.description || form.descripcion.trim(),
        estado: created.status || 'issued',
      };

      setChecks(prev => [mapped, ...prev]);
      setForm(prev => ({
        ...prev,
        numeroCheque: '',
        beneficiario: '',
        cuentaGasto: '',
        apInvoiceId: '',
        monto: '',
        descripcion: '',
      }));
    } catch (error: any) {
      console.error('Error creando cheque bancario:', error);
      alert(error?.message || 'Error al registrar el cheque bancario.');
    }
  };

  const selectedBank = (banks || []).find((b: any) => b.id === form.banco);
  const bankAccountLabel = (() => {
    if (selectedBank?.chart_account_id) {
      const acc = accountsById[selectedBank.chart_account_id];
      if (acc) {
        return `${acc.code} - ${acc.name}`;
      }
    }
    return form.cuentaBanco;
  })();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Cheques</h1>
          <p className="text-gray-600 text-sm max-w-3xl">
            Registre cheques emitidos desde las cuentas bancarias, indicando banco, cuenta de banco, número de cheque,
            beneficiario, monto, moneda, fecha y concepto. Estos cheques se consideran egresos que acreditan la cuenta
            del banco y debitan la cuenta de gasto o proveedor correspondiente.
          </p>
        </div>

        {/* Formulario de registro */}
        <form onSubmit={handleAddCheck} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Registrar nuevo cheque</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
              <select
                value={form.banco}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione un banco...</option>
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bank_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factura de CxP (opcional)</label>
              <select
                value={form.apInvoiceId}
                onChange={(e) => handleChange('apInvoiceId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sin factura vinculada</option>
                {apInvoices.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number || inv.document_type || 'FAC'} - {(inv.suppliers as any)?.name || 'Suplidor'} - {inv.balance_amount ?? inv.total_to_pay ?? inv.total_gross}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de Banco (Cuenta Contable)</label>
              <input
                type="text"
                value={bankAccountLabel || ''}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-700"
                placeholder="Se asigna automáticamente según el banco seleccionado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cheque</label>
              <input
                type="text"
                value={form.numeroCheque}
                onChange={(e) => handleChange('numeroCheque', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: CH-0001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiario</label>
              <input
                type="text"
                value={form.beneficiario}
                onChange={(e) => handleChange('beneficiario', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del beneficiario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de Gasto / Proveedor (Débito)</label>
              <select
                value={form.cuentaGasto}
                onChange={(e) => handleChange('cuentaGasto', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione una cuenta...</option>
                {expenseAccounts.map((acc) => (
                  <option key={acc.id} value={acc.code}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
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
                type="number" min="0"
                step="0.01"
                value={form.monto}
                onChange={(e) => handleChange('monto', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Cheque</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => handleChange('fecha', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Concepto</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Pago de factura de proveedor"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrar cheque
            </button>
          </div>
        </form>

        {/* Listado de cheques */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Cheques registrados</h2>
            <span className="text-xs text-gray-500">Total: {checks.length}</span>
          </div>
          {checks.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No hay cheques registrados aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Banco</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Cuenta de Banco</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Nº Cheque</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Beneficiario</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Monto</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Moneda</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {checks.map(ch => {
                    const currencyLabel =
                      ch.moneda === 'DOP'
                        ? 'Peso Dominicano'
                        : ch.moneda === 'USD'
                        ? 'Dólar Estadounidense'
                        : ch.moneda === 'EUR'
                        ? 'Euro'
                        : ch.moneda;
                    const statusLabel =
                      ch.estado === 'issued'
                        ? 'Emitido'
                        : ch.estado === 'paid'
                        ? 'Pagado'
                        : ch.estado === 'void'
                        ? 'Anulado'
                        : ch.estado;
                    return (
                      <tr key={ch.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{ch.fecha}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{ch.banco}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{ch.cuentaBanco}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{ch.numeroCheque}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{ch.beneficiario}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {ch.moneda} {ch.monto.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{currencyLabel}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{statusLabel}</td>
                        <td className="px-4 py-2 text-gray-900">{ch.descripcion}</td>
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
