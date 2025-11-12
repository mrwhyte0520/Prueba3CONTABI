
import { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

interface CommissionType {
  id: string;
  name: string;
  description: string;
  calculationType: 'percentage' | 'fixed' | 'tiered';
  rate: number;
  minAmount?: number;
  maxAmount?: number;
  basedOn: 'sales' | 'profit' | 'units' | 'revenue';
  paymentFrequency: 'monthly' | 'quarterly' | 'annually';
  isActive: boolean;
  applicablePositions: string[];
  createdAt: string;
}

const mockCommissionTypes: CommissionType[] = [
  {
    id: '1',
    name: 'Comisión por Ventas',
    description: 'Comisión basada en el volumen de ventas mensuales',
    calculationType: 'percentage',
    rate: 3.5,
    basedOn: 'sales',
    paymentFrequency: 'monthly',
    isActive: true,
    applicablePositions: ['Vendedor', 'Ejecutivo de Ventas'],
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Comisión por Utilidad',
    description: 'Comisión calculada sobre la utilidad bruta de las ventas',
    calculationType: 'percentage',
    rate: 5.0,
    basedOn: 'profit',
    paymentFrequency: 'monthly',
    isActive: true,
    applicablePositions: ['Gerente de Ventas'],
    createdAt: '2024-01-10'
  },
  {
    id: '3',
    name: 'Bono por Unidades',
    description: 'Comisión fija por cada unidad vendida',
    calculationType: 'fixed',
    rate: 50,
    basedOn: 'units',
    paymentFrequency: 'monthly',
    isActive: true,
    applicablePositions: ['Vendedor Junior'],
    createdAt: '2024-01-20'
  },
  {
    id: '4',
    name: 'Comisión Escalonada',
    description: 'Comisión variable según tramos de ventas',
    calculationType: 'tiered',
    rate: 2.0,
    minAmount: 100000,
    maxAmount: 500000,
    basedOn: 'sales',
    paymentFrequency: 'quarterly',
    isActive: true,
    applicablePositions: ['Ejecutivo Senior'],
    createdAt: '2024-01-05'
  },
  {
    id: '5',
    name: 'Comisión Anual',
    description: 'Comisión especial por cumplimiento de metas anuales',
    calculationType: 'percentage',
    rate: 1.5,
    basedOn: 'revenue',
    paymentFrequency: 'annually',
    isActive: false,
    applicablePositions: ['Director de Ventas'],
    createdAt: '2024-01-01'
  }
];

export default function CommissionTypesPage() {
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>(mockCommissionTypes);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<CommissionType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    calculationType: 'percentage' as const,
    rate: 0,
    minAmount: '',
    maxAmount: '',
    basedOn: 'sales' as const,
    paymentFrequency: 'monthly' as const,
    applicablePositions: [] as string[]
  });

  const filteredTypes = commissionTypes.filter(type => {
    const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         type.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && type.isActive) ||
                         (filterStatus === 'inactive' && !type.isActive);
    const matchesFrequency = filterFrequency === 'all' || type.paymentFrequency === filterFrequency;
    
    return matchesSearch && matchesStatus && matchesFrequency;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newType: CommissionType = {
      id: editingType?.id || Date.now().toString(),
      ...formData,
      minAmount: formData.minAmount ? parseFloat(formData.minAmount) : undefined,
      maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : undefined,
      isActive: true,
      createdAt: editingType?.createdAt || new Date().toISOString().split('T')[0]
    };

    if (editingType) {
      setCommissionTypes(prev => prev.map(type => 
        type.id === editingType.id ? newType : type
      ));
    } else {
      setCommissionTypes(prev => [...prev, newType]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      calculationType: 'percentage',
      rate: 0,
      minAmount: '',
      maxAmount: '',
      basedOn: 'sales',
      paymentFrequency: 'monthly',
      applicablePositions: []
    });
    setShowForm(false);
    setEditingType(null);
  };

  const handleEdit = (type: CommissionType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description,
      calculationType: type.calculationType,
      rate: type.rate,
      minAmount: type.minAmount?.toString() || '',
      maxAmount: type.maxAmount?.toString() || '',
      basedOn: type.basedOn,
      paymentFrequency: type.paymentFrequency,
      applicablePositions: type.applicablePositions
    });
    setShowForm(true);
  };

  const toggleStatus = (id: string) => {
    setCommissionTypes(prev => prev.map(type =>
      type.id === id ? { ...type, isActive: !type.isActive } : type
    ));
  };

  const exportToCSV = () => {
    const headers = ['Nombre', 'Descripción', 'Tipo de Cálculo', 'Tasa/Monto', 'Basado en', 'Frecuencia', 'Estado'];
    const csvData = filteredTypes.map(type => [
      type.name,
      type.description,
      type.calculationType === 'percentage' ? 'Porcentaje' : 
      type.calculationType === 'fixed' ? 'Monto Fijo' : 'Escalonado',
      type.calculationType === 'percentage' ? `${type.rate}%` : `$${type.rate.toLocaleString()}`,
      type.basedOn === 'sales' ? 'Ventas' : 
      type.basedOn === 'profit' ? 'Utilidad' : 
      type.basedOn === 'units' ? 'Unidades' : 'Ingresos',
      type.paymentFrequency === 'monthly' ? 'Mensual' : 
      type.paymentFrequency === 'quarterly' ? 'Trimestral' : 'Anual',
      type.isActive ? 'Activo' : 'Inactivo'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'tipos_comisiones.csv';
    link.click();
  };

  const activeTypes = commissionTypes.filter(type => type.isActive).length;
  const totalCommissionRate = commissionTypes
    .filter(type => type.isActive && type.calculationType === 'percentage')
    .reduce((sum, type) => sum + type.rate, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Comisiones</h1>
            <p className="text-gray-600">Gestiona los diferentes tipos de comisiones para empleados</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Tipo
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-percent-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tipos</p>
                <p className="text-2xl font-bold text-gray-900">{commissionTypes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">{activeTypes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <i className="ri-calculator-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tasa Promedio</p>
                <p className="text-2xl font-bold text-gray-900">{(totalCommissionRate / Math.max(activeTypes, 1)).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <i className="ri-calendar-line text-orange-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Frecuencias</p>
                <p className="text-2xl font-bold text-gray-900">{new Set(commissionTypes.map(t => t.paymentFrequency)).size}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar tipos de comisión..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="all">Todas</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annually">Anual</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={exportToCSV}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
              >
                <i className="ri-download-line mr-2"></i>
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Commission Types Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Comisión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cálculo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Basado en
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frecuencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <div className="text-sm text-gray-900">
                        {type.calculationType === 'percentage' ? `${type.rate}%` : 
                         type.calculationType === 'fixed' ? `$${type.rate.toLocaleString()}` : 
                         'Escalonado'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {type.calculationType === 'percentage' ? 'Porcentaje' : 
                         type.calculationType === 'fixed' ? 'Monto Fijo' : 
                         'Por Tramos'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {type.basedOn === 'sales' ? 'Ventas' : 
                         type.basedOn === 'profit' ? 'Utilidad' : 
                         type.basedOn === 'units' ? 'Unidades' : 'Ingresos'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.paymentFrequency === 'monthly' ? 'Mensual' : 
                       type.paymentFrequency === 'quarterly' ? 'Trimestral' : 'Anual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        type.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {type.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => toggleStatus(type.id)}
                          className={`${type.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          <i className={`${type.isActive ? 'ri-pause-line' : 'ri-play-line'}`}></i>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingType ? 'Editar Tipo de Comisión' : 'Nuevo Tipo de Comisión'}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Comisión por Ventas"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Cálculo *
                      </label>
                      <select
                        required
                        value={formData.calculationType}
                        onChange={(e) => setFormData(prev => ({ ...prev, calculationType: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                      >
                        <option value="percentage">Porcentaje</option>
                        <option value="fixed">Monto Fijo</option>
                        <option value="tiered">Escalonado</option>
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
                      placeholder="Descripción del tipo de comisión..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.calculationType === 'percentage' ? 'Porcentaje (%)' : 'Monto ($)'} *
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={formData.rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Basado en *
                      </label>
                      <select
                        required
                        value={formData.basedOn}
                        onChange={(e) => setFormData(prev => ({ ...prev, basedOn: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                      >
                        <option value="sales">Ventas</option>
                        <option value="profit">Utilidad</option>
                        <option value="units">Unidades</option>
                        <option value="revenue">Ingresos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia de Pago *
                      </label>
                      <select
                        required
                        value={formData.paymentFrequency}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentFrequency: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                      >
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="annually">Anual</option>
                      </select>
                    </div>
                  </div>

                  {formData.calculationType === 'tiered' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monto Mínimo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.minAmount}
                          onChange={(e) => setFormData(prev => ({ ...prev, minAmount: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monto Máximo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.maxAmount}
                          onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      {editingType ? 'Actualizar' : 'Crear'} Tipo
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
