import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { bankAccountsService, bankCurrenciesService, chartAccountsService, paymentRequestsService } from '../../services/database';

interface PaymentRequest {
  id: string;
  banco: string; // bank_id
  cuentaBanco: string; // bank_account_code
  beneficiario: string; // payee_name
  moneda: string; // currency
  monto: number; // amount
  fecha: string; // request_date (ISO)
  descripcion: string;
  estado: string; // status
}

export default function BankPaymentRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [accountsById, setAccountsById] = useState<Record<string, { id: string; code: string; name: string }>>({});
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [form, setForm] = useState({
    banco: '',
    cuentaBanco: '',
    beneficiario: '',
    moneda: 'DOP',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const loadRequests = async () => {
      if (!user?.id) return;
      const data = await paymentRequestsService.getAll(user.id);
      const mapped: PaymentRequest[] = (data || []).map((row: any) => ({
        id: row.id,
        banco: row.bank_id || '',
        cuentaBanco: row.bank_account_code || '',
        beneficiario: row.payee_name || '',
        moneda: row.currency || 'DOP',
        monto: Number(row.amount) || 0,
        fecha: row.request_date || (row.created_at ? row.created_at.slice(0, 10) : ''),
        descripcion: row.description || '',
        estado: row.status || 'pending',
      }));
      setRequests(mapped);
    };

    loadRequests();
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
        console.error('Error cargando bancos y cuentas contables para solicitudes de pago', error);
      }
    };

    loadBanksAndAccounts();
  }, [user?.id]);

  useEffect(() => {
    const loadCurrencies = async () => {
      if (!user?.id) return;
      try {
        const data = await bankCurrenciesService.getAll(user.id);
        const list = data || [];
        setCurrencies(list);

        if (list.length > 0) {
          const base = list.find((c: any) => c.is_base);
          const firstCode = (base || list[0]).code || 'DOP';
          setForm(prev => ({ ...prev, moneda: prev.moneda || firstCode }));
        }
      } catch (error) {
        console.error('Error cargando monedas para solicitudes de pago', error);
      }
    };

    loadCurrencies();
  }, [user?.id]);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    const montoNumber = Number(form.monto);
    if (!form.banco || !form.cuentaBanco || !form.beneficiario.trim() || !form.moneda || !form.fecha) {
      alert('Complete banco, cuenta de banco, beneficiario, moneda y fecha.');
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
      const created = await paymentRequestsService.create(user.id, {
        bank_id: form.banco,
        bank_account_code: form.cuentaBanco,
        payee_name: form.beneficiario.trim(),
        currency: form.moneda,
        amount: montoNumber,
        request_date: form.fecha,
        description: form.descripcion.trim(),
      });

      const mapped: PaymentRequest = {
        id: created.id,
        banco: created.bank_id || form.banco,
        cuentaBanco: created.bank_account_code || form.cuentaBanco,
        beneficiario: created.payee_name || form.beneficiario.trim(),
        moneda: created.currency || form.moneda,
        monto: Number(created.amount) || montoNumber,
        fecha: created.request_date || form.fecha,
        descripcion: created.description || form.descripcion.trim(),
        estado: created.status || 'pending',
      };

      setRequests(prev => [mapped, ...prev]);
      setForm(prev => ({
        ...prev,
        beneficiario: '',
        monto: '',
        descripcion: '',
      }));
    } catch (error: any) {
      console.error('Error creando solicitud de pago:', error);
      alert(error?.message || 'Error al registrar la solicitud de pago.');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Solicitudes de Pago</h1>
          <p className="text-gray-600 text-sm max-w-3xl">
            Registre solicitudes de pago asociadas a bancos, indicando el banco, la cuenta de banco, el beneficiario,
            el monto, la moneda y la fecha. Estas solicitudes podrán luego aprobarse y convertirse en pagos
            mediante cheques o transferencias.
          </p>
        </div>

        {/* Formulario de registro */}
        <form onSubmit={handleAddRequest} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Registrar nueva solicitud de pago</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
              <select
                value={form.banco}
                onChange={(e) => handleChange('banco', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione un banco...</option>
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bank_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta de Banco (Cuenta Contable)</label>
              <select
                value={form.cuentaBanco}
                onChange={(e) => handleChange('cuentaBanco', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione una cuenta...</option>
                {banks
                  .filter((b: any) => b.id === form.banco && b.chart_account_id)
                  .map((b: any) => {
                    const acc = accountsById[b.chart_account_id];
                    if (!acc) return null;
                    const value = acc.code;
                    if (form.cuentaBanco !== value) {
                      setForm(prev => ({ ...prev, cuentaBanco: value }));
                    }
                    return (
                      <option key={acc.id} value={value}>
                        {acc.code} - {acc.name}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiario / Proveedor</label>
              <input
                type="text"
                value={form.beneficiario}
                onChange={(e) => handleChange('beneficiario', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del beneficiario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select
                value={form.moneda}
                onChange={(e) => handleChange('moneda', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {currencies.length === 0 && (
                  <option value="DOP">Peso Dominicano (DOP)</option>
                )}
                {currencies.map((c: any) => (
                  <option key={c.id} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de la Solicitud</label>
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
              Registrar solicitud
            </button>
          </div>
        </form>

        {/* Listado de solicitudes de pago */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Solicitudes registradas</h2>
            <span className="text-xs text-gray-500">Total: {requests.length}</span>
          </div>
          {requests.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No hay solicitudes de pago registradas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Banco</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Cuenta de Banco</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Beneficiario</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Monto</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Moneda</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {requests.map(req => {
                    const currencyLabel =
                      req.moneda === 'DOP'
                        ? 'Peso Dominicano'
                        : req.moneda === 'USD'
                        ? 'Dólar Estadounidense'
                        : req.moneda === 'EUR'
                        ? 'Euro'
                        : req.moneda;
                    const statusLabel =
                      req.estado === 'pending'
                        ? 'Pendiente'
                        : req.estado === 'approved'
                        ? 'Aprobada'
                        : req.estado === 'rejected'
                        ? 'Rechazada'
                        : req.estado;
                    return (
                      <tr key={req.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{req.fecha}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{req.banco}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{req.cuentaBanco}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{req.beneficiario}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {req.moneda} {req.monto.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{currencyLabel}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-900">{statusLabel}</td>
                        <td className="px-4 py-2 text-gray-900">{req.descripcion}</td>
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
