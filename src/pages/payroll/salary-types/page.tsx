
import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface SalaryType {
  id: string;
  name: string;
  description: string;
  calculation_method: 'fixed' | 'hourly' | 'commission' | 'mixed';
  base_amount: number;
  commission_rate?: number;
  overtime_rate: number;
  night_shift_rate: number;
  holiday_rate: number;
  is_active: boolean;
  created_at: string;
}

const mockSalaryTypes: SalaryType[] = [
  {
    id: '1',
    name: 'Salario Fijo Mensual',
    description: 'Salario fijo pagado mensualmente sin variaciones',
    calculation_method: 'fixed',
    base_amount: 45000,
    overtime_rate: 1.5,
    night_shift_rate: 1.15,
    holiday_rate: 2.0,
    is_active: true,
    created_at: '2024-01-15'
  },
  {
    id: '2',
    name: 'Salario por Horas',
    description: 'Pago basado en horas trabajadas',
    calculation_method: 'hourly',
    base_amount: 250,
    overtime_rate: 1.5,
    night_shift_rate: 1.15,
    holiday_rate: 2.0,
    is_active: true,
    created_at: '2024-01-15'
  },
  {
    id: '3',
    name: 'Salario + Comisión',
    description: 'Salario base más comisión por ventas',
    calculation_method: 'mixed',
    base_amount: 30000,
    commission_rate: 3.5,
    overtime_rate: 1.5,
    night_shift_rate: 1.15,
    holiday_rate: 2.0,
    is_active: true,
    created_at: '2024-01-20'
  },
  {
    id: '4',
    name: 'Solo Comisión',
    description: 'Pago únicamente por comisiones de ventas',
    calculation_method: 'commission',
    base_amount: 0,
    commission_rate: 8.0,
    overtime_rate: 1.0,
    night_shift_rate: 1.0,
    holiday_rate: 1.0,
    is_active: true,
    created_at: '2024-02-01'
  },
  {
    id: '5',
    name: 'Salario Ejecutivo',
    description: 'Salario fijo para posiciones ejecutivas',
    calculation_method: 'fixed',
    base_amount: 120000,
    overtime_rate: 1.0,
    night_shift_rate: 1.0,
    holiday_rate: 1.5,
    is_active: true,
    created_at: '2024-02-10'
  }
];

export default function SalaryTypesPage() {
  const [salaryTypes, setSalaryTypes] = useState<SalaryType[]>(mockSalaryTypes);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<SalaryType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    calculation_method: 'fixed' as const,
    base_amount: 0,
    commission_rate: 0,
    overtime_rate: 1.5,
    night_shift_rate: 1.15,
    holiday_rate: 2.0
  });

  const filteredTypes = salaryTypes.filter(type => {
    const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         type.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || type.calculation_method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingType) {
      setSalaryTypes(prev => prev.map(type => 
        type.id === editingType.id 
          ? { ...type, ...formData }
          : type
      ));
    } else {
      const newType: SalaryType = {
        id: Date.now().toString(),
        ...formData,
        is_active: true,
        created_at: new Date().toISOString().split('T')[0]
      };
      setSalaryTypes(prev => [...prev, newType]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      calculation_method: 'fixed',
      base_amount: 0,
      commission_rate: 0,
      overtime_rate: 1.5,
      night_shift_rate: 1.15,
      holiday_rate: 2.0
    });
    setEditingType(null);
    setShowForm(false);
  };

  const handleEdit = (type: SalaryType) => {
    setFormData({
      name: type.name,
      description: type.description,
      calculation_method: type.calculation_method,
      base_amount: type.base_amount,
      commission_rate: type.commission_rate || 0,
      overtime_rate: type.overtime_rate,
      night_shift_rate: type.night_shift_rate,
      holiday_rate: type.holiday_rate
    });
    setEditingType(type);
    setShowForm(true);
  };

  const toggleStatus = (id: string) => {
    setSalaryTypes(prev => prev.map(type => 
      type.id === id ? { ...type, is_active: !type.is_active } : type
    ));
  };

  const exportToExcel = () => {
    const csvContent = [
      ['Nombre', 'Descripción', 'Método de Cálculo', 'Monto Base', 'Tasa Comisión', 'Tasa Horas Extra', 'Tasa Turno Nocturno', 'Tasa Días Feriados', 'Estado', 'Fecha Creación'].join(','),
      ...filteredTypes.map(type => [
        type.name,
        type.description,
        type.calculation_method === 'fixed' ? 'Fijo' : 
        type.calculation_method === 'hourly' ? 'Por Horas' :
        type.calculation_method === 'commission' ? 'Comisión' : 'Mixto',
        type.base_amount.toLocaleString(),
        type.commission_rate ? `${type.commission_rate}%` : 'N/A',
        `${(type.overtime_rate * 100)}%`,
        `${(type.night_shift_rate * 100)}%`,
        `${(type.holiday_rate * 100)}%`,
        type.is_active ? 'Activo' : 'Inactivo',
        type.created_at
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tipos_salarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'fixed': return 'Fijo';
      case 'hourly': return 'Por Horas';
      case 'commission': return 'Comisión';
      case 'mixed': return 'Mixto';
      default: return method;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'fixed': return 'bg-blue-100 text-blue-800';
      case 'hourly': return 'bg-green-100 text-green-800';
      case 'commission': return 'bg-purple-100 text-purple-800';
      case 'mixed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Salarios</h1>
            <p className="text-gray-600">Gestiona los diferentes tipos de salarios y métodos de cálculo</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <i className="ri-download-line"></i>
              Exportar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <i className="ri-add-line"></i>
              Nuevo Tipo
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tipos</p>
                <p className="text-2xl font-bold text-gray-900">{salaryTypes.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Salarios Fijos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {salaryTypes.filter(t => t.calculation_method === 'fixed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-bank-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Por Comisión</p>
                <p className="text-2xl font-bold text-gray-900">
                  {salaryTypes.filter(t => t.calculation_method === 'commission' || t.calculation_method === 'mixed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-line-chart-line text-xl text-purple-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {salaryTypes.filter(t => t.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-check-line text-xl text-orange-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Cálculo
              </label>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los métodos</option>
                <option value="fixed">Salario Fijo</option>
                <option value="hourly">Por Horas</option>
                <option value="commission">Solo Comisión</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterMethod('all');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Salary Types Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Salario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Base
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas Extra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMethodColor(type.calculation_method)}`}>
                        {getMethodLabel(type.calculation_method)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.calculation_method === 'hourly' 
                        ? `RD$${type.base_amount.toLocaleString()}/hora`
                        : `RD$${type.base_amount.toLocaleString()}`
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.commission_rate ? `${type.commission_rate}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(type.overtime_rate * 100)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        type.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {type.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => toggleStatus(type.id)}
                          className={`${type.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          <i className={`${type.is_active ? 'ri-pause-circle-line' : 'ri-play-circle-line'}`}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingType ? 'Editar Tipo de Salario' : 'Nuevo Tipo de Salario'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Tipo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Salario Fijo Mensual"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Cálculo *
                    </label>
                    <select
                      required
                      value={formData.calculation_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, calculation_method: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="fixed">Salario Fijo</option>
                      <option value="hourly">Por Horas</option>
                      <option value="commission">Solo Comisión</option>
                      <option value="mixed">Salario + Comisión</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción del tipo de salario..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.calculation_method === 'hourly' ? 'Tarifa por Hora (RD$)' : 'Monto Base (RD$)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.base_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, base_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {(formData.calculation_method === 'commission' || formData.calculation_method === 'mixed') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tasa de Comisión (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.commission_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tasa Horas Extra
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      step="0.1"
                      value={formData.overtime_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, overtime_rate: parseFloat(e.target.value) || 1.5 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tasa Turno Nocturno
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="2"
                      step="0.01"
                      value={formData.night_shift_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, night_shift_rate: parseFloat(e.target.value) || 1.15 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tasa Días Feriados
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      step="0.1"
                      value={formData.holiday_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, holiday_rate: parseFloat(e.target.value) || 2.0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingType ? 'Actualizar' : 'Crear'} Tipo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
