import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';

interface PayrollConfig {
  id: string;
  company_name: string;
  tax_id: string;
  social_security_rate: number;
  income_tax_rate: number;
  christmas_bonus_rate: number;
  vacation_days: number;
  sick_days: number;
  overtime_rate: number;
  night_shift_rate: number;
  sunday_rate: number;
  holiday_rate: number;
  min_wage: number;
  currency: string;
  pay_frequency: 'weekly' | 'biweekly' | 'monthly';
  fiscal_year_start: string;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  auto_calculate_taxes: boolean;
  auto_generate_reports: boolean;
}

interface TaxBracket {
  id: string;
  min_amount: number;
  max_amount: number;
  rate: number;
  fixed_amount: number;
}

export default function PayrollConfigurationPage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    // Mock configuration data
    const mockConfig: PayrollConfig = {
      id: '1',
      company_name: 'Empresa Demo S.R.L.',
      tax_id: '131-12345-6',
      social_security_rate: 2.87,
      income_tax_rate: 15,
      christmas_bonus_rate: 8.33,
      vacation_days: 14,
      sick_days: 12,
      overtime_rate: 1.35,
      night_shift_rate: 1.15,
      sunday_rate: 1.35,
      holiday_rate: 2.0,
      min_wage: 21000,
      currency: 'DOP',
      pay_frequency: 'monthly',
      fiscal_year_start: '2024-01-01',
      backup_frequency: 'weekly',
      auto_calculate_taxes: true,
      auto_generate_reports: true
    };

    const mockTaxBrackets: TaxBracket[] = [
      { id: '1', min_amount: 0, max_amount: 416220, rate: 0, fixed_amount: 0 },
      { id: '2', min_amount: 416220.01, max_amount: 624329, rate: 15, fixed_amount: 0 },
      { id: '3', min_amount: 624329.01, max_amount: 867123, rate: 20, fixed_amount: 31216 },
      { id: '4', min_amount: 867123.01, max_amount: 1000000, rate: 25, fixed_amount: 79775 },
      { id: '5', min_amount: 1000000.01, max_amount: Infinity, rate: 27, fixed_amount: 112994 }
    ];

    setConfig(mockConfig);
    setTaxBrackets(mockTaxBrackets);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (config) {
        setConfig({ ...config, ...formData });
      }
      
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTaxBracket = () => {
    setModalType('tax-bracket');
    setFormData({});
    setShowModal(true);
  };

  const handleEditTaxBracket = (bracket: TaxBracket) => {
    setModalType('tax-bracket');
    setFormData(bracket);
    setShowModal(true);
  };

  const handleSaveTaxBracket = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.id) {
      setTaxBrackets(prev => prev.map(bracket => 
        bracket.id === formData.id ? { ...bracket, ...formData } : bracket
      ));
    } else {
      const newBracket: TaxBracket = {
        ...formData,
        id: Date.now().toString()
      };
      setTaxBrackets(prev => [...prev, newBracket]);
    }
    
    setShowModal(false);
    setFormData({});
  };

  const handleDeleteTaxBracket = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este tramo fiscal?')) {
      setTaxBrackets(prev => prev.filter(bracket => bracket.id !== id));
    }
  };

  const exportConfiguration = () => {
    const configData = {
      'Configuración General': config,
      'Tramos Fiscales': taxBrackets
    };

    const csvContent = [
      'Configuración de Nómina',
      `Generado: ${new Date().toLocaleDateString()}`,
      '',
      'CONFIGURACIÓN GENERAL',
      `Empresa,${config?.company_name}`,
      `RNC,${config?.tax_id}`,
      `Seguridad Social,${config?.social_security_rate}%`,
      `ISR,${config?.income_tax_rate}%`,
      `Regalía Pascual,${config?.christmas_bonus_rate}%`,
      `Días de Vacaciones,${config?.vacation_days}`,
      `Días por Enfermedad,${config?.sick_days}`,
      `Horas Extras,${config?.overtime_rate}x`,
      `Turno Nocturno,${config?.night_shift_rate}x`,
      `Domingo,${config?.sunday_rate}x`,
      `Días Feriados,${config?.holiday_rate}x`,
      `Salario Mínimo,RD$${config?.min_wage?.toLocaleString()}`,
      `Frecuencia de Pago,${config?.pay_frequency}`,
      '',
      'TRAMOS FISCALES',
      'Desde,Hasta,Tasa,Monto Fijo',
      ...taxBrackets.map(bracket => 
        `RD$${bracket.min_amount.toLocaleString()},${bracket.max_amount === Infinity ? 'En adelante' : `RD$${bracket.max_amount.toLocaleString()}`},${bracket.rate}%,RD$${bracket.fixed_amount.toLocaleString()}`
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `configuracion_nomina_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderGeneralConfig = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Empresa</h3>
        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa</label>
            <input
              type="text"
              value={config?.company_name || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, company_name: e.target.value} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RNC/Cédula</label>
            <input
              type="text"
              value={config?.tax_id || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, tax_id: e.target.value} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select
              value={config?.currency || 'DOP'}
              onChange={(e) => setConfig(prev => prev ? {...prev, currency: e.target.value} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DOP">Peso Dominicano (DOP)</option>
              <option value="USD">Dólar Americano (USD)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de Pago</label>
            <select
              value={config?.pay_frequency || 'monthly'}
              onChange={(e) => setConfig(prev => prev ? {...prev, pay_frequency: e.target.value as any} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inicio del Año Fiscal</label>
            <input
              type="date"
              value={config?.fiscal_year_start || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, fiscal_year_start: e.target.value} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salario Mínimo</label>
            <input
              type="number"
              step="0.01"
              value={config?.min_wage || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, min_wage: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasas y Porcentajes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seguridad Social (%)</label>
            <input
              type="number"
              step="0.01"
              value={config?.social_security_rate || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, social_security_rate: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISR Base (%)</label>
            <input
              type="number"
              step="0.01"
              value={config?.income_tax_rate || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, income_tax_rate: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regalía Pascual (%)</label>
            <input
              type="number"
              step="0.01"
              value={config?.christmas_bonus_rate || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, christmas_bonus_rate: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horas Extras (Factor)</label>
            <input
              type="number"
              step="0.01"
              value={config?.overtime_rate || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, overtime_rate: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turno Nocturno (Factor)</label>
            <input
              type="number"
              step="0.01"
              value={config?.night_shift_rate || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, night_shift_rate: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domingo (Factor)</label>
            <input
              type="number"
              step="0.01"
              value={config?.sunday_rate || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, sunday_rate: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días Feriados (Factor)</label>
            <input
              type="number"
              step="0.01"
              value={config?.holiday_rate || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, holiday_rate: parseFloat(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días de Vacaciones</label>
            <input
              type="number"
              value={config?.vacation_days || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, vacation_days: parseInt(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días por Enfermedad</label>
            <input
              type="number"
              value={config?.sick_days || ''}
              onChange={(e) => setConfig(prev => prev ? {...prev, sick_days: parseInt(e.target.value)} : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuraciones Automáticas</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Cálculo Automático de Impuestos</h4>
              <p className="text-sm text-gray-500">Calcular automáticamente ISR y Seguridad Social</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.auto_calculate_taxes || false}
                onChange={(e) => setConfig(prev => prev ? {...prev, auto_calculate_taxes: e.target.checked} : null)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Generación Automática de Reportes</h4>
              <p className="text-sm text-gray-500">Generar reportes automáticamente al cerrar períodos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.auto_generate_reports || false}
                onChange={(e) => setConfig(prev => prev ? {...prev, auto_generate_reports: e.target.checked} : null)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de Respaldo</label>
            <select
              value={config?.backup_frequency || 'weekly'}
              onChange={(e) => setConfig(prev => prev ? {...prev, backup_frequency: e.target.value as any} : null)}
              className="w-full md:w-1/3 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={exportConfiguration}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-download-line mr-2"></i>
          Exportar Configuración
        </button>
        <button
          type="submit"
          onClick={handleSaveConfig}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );

  const renderTaxBrackets = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Tramos Fiscales ISR</h3>
        <button
          onClick={handleAddTaxBracket}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Agregar Tramo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desde</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa (%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Fijo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxBrackets.map((bracket) => (
                <tr key={bracket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RD${bracket.min_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bracket.max_amount === Infinity ? 'En adelante' : `RD$${bracket.max_amount.toLocaleString()}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bracket.rate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RD${bracket.fixed_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEditTaxBracket(bracket)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteTaxBracket(bracket.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="ri-information-line text-blue-500 mt-1 mr-3"></i>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Información sobre Tramos Fiscales</h4>
            <p className="text-sm text-blue-700 mt-1">
              Los tramos fiscales se utilizan para calcular el Impuesto Sobre la Renta (ISR) de forma progresiva. 
              Cada tramo tiene un rango de ingresos, una tasa de impuesto y un monto fijo que se suma al cálculo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {formData.id ? 'Editar' : 'Agregar'} Tramo Fiscal
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          <form onSubmit={handleSaveTaxBracket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Desde</label>
              <input
                type="number"
                step="0.01"
                value={formData.min_amount || ''}
                onChange={(e) => setFormData({...formData, min_amount: parseFloat(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Hasta</label>
              <input
                type="number"
                step="0.01"
                value={formData.max_amount === Infinity ? '' : formData.max_amount || ''}
                onChange={(e) => setFormData({...formData, max_amount: e.target.value ? parseFloat(e.target.value) : Infinity})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dejar vacío para 'En adelante'"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasa (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.rate || ''}
                onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Fijo</label>
              <input
                type="number"
                step="0.01"
                value={formData.fixed_amount || ''}
                onChange={(e) => setFormData({...formData, fixed_amount: parseFloat(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                {formData.id ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Nóminas</h1>
          <p className="text-gray-600">Configurar parámetros generales del sistema de nómina</p>
        </div>
        <button
          onClick={() => window.REACT_APP_NAVIGATE('/payroll')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <i className="ri-arrow-left-line"></i>
          <span>Volver a Nóminas</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', name: 'Configuración General', icon: 'ri-settings-line' },
            { id: 'tax-brackets', name: 'Tramos Fiscales', icon: 'ri-percent-line' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'general' && renderGeneralConfig()}
        {activeTab === 'tax-brackets' && renderTaxBrackets()}
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
}