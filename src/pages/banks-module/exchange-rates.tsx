import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { bankCurrenciesService, bankExchangeRatesService, chartAccountsService } from '../../services/database';

type BankCurrency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_base: boolean;
  is_active: boolean;
};

type ExchangeRate = {
  id: string;
  base_currency_code: string;
  target_currency_code: string;
  rate: number;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
};

type FormState = {
  base_currency_code: string;
  target_currency_code: string;
  rate: string;
  valid_from: string;
  valid_to: string;
  ar_prima_account: string;
  ap_prima_account: string;
  gain_account: string;
  loss_account: string;
};

type AccountOption = {
  id: string;
  code: string;
  name: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const initialFormState: FormState = {
  base_currency_code: '',
  target_currency_code: '',
  rate: '',
  valid_from: todayISO(),
  valid_to: '',
  ar_prima_account: '110103',
  ap_prima_account: '200103',
  gain_account: '4098',
  loss_account: '4103',
};

export default function BankExchangeRatesPage() {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<BankCurrency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustmentInfo, setShowAdjustmentInfo] = useState(false);

  const activeCurrencies = useMemo(
    () => currencies.filter(c => c.is_active),
    [currencies]
  );

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [currenciesData, ratesData, accountsData] = await Promise.all([
          bankCurrenciesService.getAll(user.id),
          bankExchangeRatesService.getAll(user.id),
          chartAccountsService.getAll(user.id),
        ]);
        setCurrencies(currenciesData as BankCurrency[]);
        setRates(ratesData as ExchangeRate[]);
        
        const accountOptions = (accountsData || []).filter((acc: any) => 
          acc.allowPosting && acc.isActive !== false
        ).map((acc: any) => ({
          id: acc.id,
          code: acc.code,
          name: acc.name,
        }));
        setAccounts(accountOptions);
      } catch (e: any) {
        setError(e?.message || 'Error cargando tasas cambiarias');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!form.base_currency_code || !form.target_currency_code) {
      setError('Debe seleccionar moneda base y moneda destino');
      return;
    }

    if (form.base_currency_code === form.target_currency_code) {
      setError('La moneda base y la moneda destino deben ser diferentes');
      return;
    }

    const numericRate = Number(form.rate.replace(',', '.'));
    if (!numericRate || numericRate <= 0) {
      setError('La tasa debe ser un número mayor que cero');
      return;
    }

    // Validar cuentas prima obligatorias
    if (!form.ar_prima_account || !form.ap_prima_account || !form.gain_account || !form.loss_account) {
      setError('Debe asignar las 4 cuentas prima obligatorias');
      return;
    }

    // Calcular tasa ajustada (restar 1 para cuadre contable)
    const adjustedRate = numericRate - 1;

    if (!form.valid_from) {
      setError('La fecha "Válida desde" es obligatoria');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await bankExchangeRatesService.create(user.id, {
        base_currency_code: form.base_currency_code,
        target_currency_code: form.target_currency_code,
        rate: numericRate,
        adjusted_rate: adjustedRate,
        valid_from: form.valid_from,
        valid_to: form.valid_to || null,
        ar_prima_account_code: form.ar_prima_account,
        ap_prima_account_code: form.ap_prima_account,
        gain_account_code: form.gain_account,
        loss_account_code: form.loss_account,
      });

      setRates(prev => [created as ExchangeRate, ...prev]);
      setForm(initialFormState);
    } catch (e: any) {
      setError(e?.message || 'Error guardando la tasa cambiaria');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Tasas Cambiarias</h1>
          <p className="text-gray-600 text-sm">
            Defina tasas de cambio para monedas extranjeras y asigne cuentas prima para ajustes cambiarios automáticos.
          </p>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <i className="ri-information-line mr-1"></i>
              <strong>Nota importante:</strong> La tasa ingresada se ajustará automáticamente (-1) para cálculos contables. 
              Ejemplo: Si ingresa 60, el sistema calculará con 59 para que las cuentas principales cuadren.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow p-4 space-y-4 lg:col-span-1"
          >
            <h2 className="text-lg font-semibold">Nueva tasa de cambio</h2>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Moneda base</label>
              <select
                value={form.base_currency_code}
                onChange={e => handleChange('base_currency_code', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Seleccione moneda base</option>
                {activeCurrencies.map(currency => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Moneda destino</label>
              <select
                value={form.target_currency_code}
                onChange={e => handleChange('target_currency_code', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Seleccione moneda destino</option>
                {activeCurrencies.map(currency => (
                  <option key={currency.id} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Tasa Oficial *
              </label>
              <input
                type="text"
                value={form.rate}
                onChange={e => handleChange('rate', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Ej: 60.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tasa oficial del mercado. El sistema usará {form.rate ? (Number(form.rate) - 1).toFixed(2) : '(tasa - 1)'} para cálculos contables.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Válida desde</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={e => handleChange('valid_from', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Válida hasta (opcional)</label>
                <input
                  type="date"
                  value={form.valid_to}
                  onChange={e => handleChange('valid_to', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Cuentas Prima Obligatorias */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                <i className="ri-bank-line mr-2 text-indigo-600"></i>
                Cuentas Prima (Obligatorias)
              </h3>
              
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">CxC Prima *</label>
                <select
                  value={form.ar_prima_account}
                  onChange={e => handleChange('ar_prima_account', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seleccione cuenta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">CxP Prima *</label>
                <select
                  value={form.ap_prima_account}
                  onChange={e => handleChange('ap_prima_account', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seleccione cuenta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Ganancia Diferencia Cambiaria *</label>
                <select
                  value={form.gain_account}
                  onChange={e => handleChange('gain_account', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seleccione cuenta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Pérdida Diferencia Cambiaria *</label>
                <select
                  value={form.loss_account}
                  onChange={e => handleChange('loss_account', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">Seleccione cuenta...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !user?.id}
                className="w-full inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar tasa'}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Tasas registradas</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdjustmentInfo(!showAdjustmentInfo)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <i className="ri-information-line mr-1"></i>
                  Ajuste mensual
                </button>
                {loading && (
                  <span className="text-xs text-gray-500">Cargando...</span>
                )}
              </div>
            </div>

            {showAdjustmentInfo && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                  <i className="ri-calendar-line mr-1"></i>
                  Asiento Mensual de Ajuste Cambiario
                </h3>
                <p className="text-xs text-yellow-800 mb-2">
                  Al final de cada mes, el sistema debe generar un asiento automático para ajustar los saldos de:
                </p>
                <ul className="text-xs text-yellow-800 space-y-1 ml-4">
                  <li>• Bancos en moneda extranjera</li>
                  <li>• Cuentas por Cobrar en moneda extranjera</li>
                  <li>• Cuentas por Pagar en moneda extranjera</li>
                </ul>
                <p className="text-xs text-yellow-800 mt-2">
                  El ajuste reconoce ganancias o pérdidas por diferencia cambiaria según las fluctuaciones de la tasa durante el mes.
                </p>
                <div className="mt-3 pt-3 border-t border-yellow-300">
                  <button className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700">
                    <i className="ri-file-add-line mr-1"></i>
                    Generar Asiento de Ajuste (Próximamente)
                  </button>
                </div>
              </div>
            )}

            {rates.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay tasas registradas todavía.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Par</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Tasa Oficial</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Tasa Ajustada</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Válida desde</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Válida hasta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rates.map(rate => (
                      <tr key={rate.id}>
                        <td className="px-3 py-2 font-mono text-xs">
                          {rate.base_currency_code} → {rate.target_currency_code}
                        </td>
                        <td className="px-3 py-2">
                          {rate.rate.toFixed(4)}
                        </td>
                        <td className="px-3 py-2 text-green-700 font-semibold">
                          {(rate.rate - 1).toFixed(4)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {rate.valid_from
                            ? new Date(rate.valid_from).toLocaleDateString()
                            : ''}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {rate.valid_to
                            ? new Date(rate.valid_to).toLocaleDateString()
                            : ''}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {rate.created_at
                            ? new Date(rate.created_at).toLocaleDateString()
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
