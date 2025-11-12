import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { taxService } from '../../../services/database';

interface TaxConfiguration {
  itbis_rate: number;
  isr_rates: {
    [key: string]: number;
  };
  withholding_rates: {
    [key: string]: number;
  };
  fiscal_year_start: number;
  auto_generate_ncf: boolean;
  ncf_validation: boolean;
  report_frequency: string;
}

export default function TaxConfigurationPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<TaxConfiguration>({
    itbis_rate: 18.00,
    isr_rates: {
      'salary': 15,
      'professional_services': 10,
      'rent': 10
    },
    withholding_rates: {
      'itbis': 30,
      'isr': 27
    },
    fiscal_year_start: 1,
    auto_generate_ncf: true,
    ncf_validation: true,
    report_frequency: 'monthly'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const data = await taxService.getTaxConfiguration();
      if (data) {
        setConfig({
          itbis_rate: data.itbis_rate || 18.00,
          isr_rates: data.isr_rates || { 'salary': 15, 'professional_services': 10, 'rent': 10 },
          withholding_rates: data.withholding_rates || { 'itbis': 30, 'isr': 27 },
          fiscal_year_start: data.fiscal_year_start || 1,
          auto_generate_ncf: data.auto_generate_ncf ?? true,
          ncf_validation: data.ncf_validation ?? true,
          report_frequency: data.report_frequency || 'monthly'
        });
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await taxService.saveTaxConfiguration(config);
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const updateIsrRate = (type: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      isr_rates: {
        ...prev.isr_rates,
        [type]: value
      }
    }));
  };

  const updateWithholdingRate = (type: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      withholding_rates: {
        ...prev.withholding_rates,
        [type]: value
      }
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración de Impuestos</h1>
            <p className="text-gray-600">Configurar tasas y parámetros fiscales</p>
          </div>
          <button
            onClick={() => navigate('/taxes')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Volver a Impuestos
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Configuración General</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* ITBIS Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasa ITBIS (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={config.itbis_rate}
                onChange={(e) => setConfig(prev => ({ ...prev, itbis_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* ISR Rates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasas ISR (%)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Salarios</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.isr_rates.salary || 0}
                    onChange={(e) => updateIsrRate('salary', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Servicios Profesionales</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.isr_rates.professional_services || 0}
                    onChange={(e) => updateIsrRate('professional_services', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Alquileres</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.isr_rates.rent || 0}
                    onChange={(e) => updateIsrRate('rent', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Withholding Rates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasas de Retención (%)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ITBIS</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.withholding_rates.itbis || 0}
                    onChange={(e) => updateWithholdingRate('itbis', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ISR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.withholding_rates.isr || 0}
                    onChange={(e) => updateWithholdingRate('isr', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Fiscal Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inicio del Año Fiscal
              </label>
              <select
                value={config.fiscal_year_start}
                onChange={(e) => setConfig(prev => ({ ...prev, fiscal_year_start: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i, 1).toLocaleDateString('es-DO', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Report Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frecuencia de Reportes
              </label>
              <select
                value={config.report_frequency}
                onChange={(e) => setConfig(prev => ({ ...prev, report_frequency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_generate_ncf"
                  checked={config.auto_generate_ncf}
                  onChange={(e) => setConfig(prev => ({ ...prev, auto_generate_ncf: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_generate_ncf" className="ml-2 block text-sm text-gray-900">
                  Generar NCF automáticamente
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="ncf_validation"
                  checked={config.ncf_validation}
                  onChange={(e) => setConfig(prev => ({ ...prev, ncf_validation: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ncf_validation" className="ml-2 block text-sm text-gray-900">
                  Validar formato de NCF
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}