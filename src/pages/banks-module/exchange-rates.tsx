import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { bankCurrenciesService, bankExchangeRatesService } from '../../services/database';

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
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const initialFormState: FormState = {
  base_currency_code: '',
  target_currency_code: '',
  rate: '',
  valid_from: todayISO(),
  valid_to: '',
};

export default function BankExchangeRatesPage() {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<BankCurrency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const [currenciesData, ratesData] = await Promise.all([
          bankCurrenciesService.getAll(user.id),
          bankExchangeRatesService.getAll(user.id),
        ]);
        setCurrencies(currenciesData as BankCurrency[]);
        setRates(ratesData as ExchangeRate[]);
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
        valid_from: form.valid_from,
        valid_to: form.valid_to || null,
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
            Defina y consulte las tasas de cambio entre las monedas configuradas en el módulo de bancos.
          </p>
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
                Tasa (¿cuántas unidades de moneda destino por 1 unidad de moneda base?)
              </label>
              <input
                type="text"
                value={form.rate}
                onChange={e => handleChange('rate', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Ej: 58.2500"
              />
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !user?.id}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar tasa'}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Tasas registradas</h2>
              {loading && (
                <span className="text-xs text-gray-500">Cargando...</span>
              )}
            </div>

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
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Tasa</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Válida desde</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Válida hasta</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Creada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rates.map(rate => (
                      <tr key={rate.id}>
                        <td className="px-3 py-2 font-mono text-xs">
                          {rate.base_currency_code} → {rate.target_currency_code}
                        </td>
                        <td className="px-3 py-2">
                          {rate.rate.toFixed(6)}
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
