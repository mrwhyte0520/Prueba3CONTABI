
import { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

interface Royalty {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  royaltyType: 'percentage' | 'fixed' | 'formula';
  baseAmount: number;
  percentage?: number;
  fixedAmount?: number;
  formula?: string;
  period: 'monthly' | 'quarterly' | 'annual';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  description: string;
  calculatedAmount: number;
  lastCalculation: string;
  createdAt: string;
}

const mockRoyalties: Royalty[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'Juan Carlos Pérez',
    department: 'Ventas',
    position: 'Gerente de Ventas',
    royaltyType: 'percentage',
    baseAmount: 150000,
    percentage: 2.5,
    period: 'monthly',
    startDate: '2024-01-01',
    isActive: true,
    description: 'Regalía por ventas mensuales',
    calculatedAmount: 3750,
    lastCalculation: '2024-01-31',
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'María González',
    department: 'Producción',
    position: 'Supervisora',
    royaltyType: 'fixed',
    baseAmount: 0,
    fixedAmount: 5000,
    period: 'quarterly',
    startDate: '2024-01-01',
    isActive: true,
    description: 'Regalía fija por productividad',
    calculatedAmount: 5000,
    lastCalculation: '2024-03-31',
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'Carlos Rodríguez',
    department: 'Administración',
    position: 'Director Financiero',
    royaltyType: 'formula',
    baseAmount: 200000,
    formula: '(baseAmount * 0.03) + 2000',
    period: 'annual',
    startDate: '2024-01-01',
    isActive: true,
    description: 'Regalía por gestión financiera',
    calculatedAmount: 8000,
    lastCalculation: '2024-12-31',
    createdAt: '2024-01-01'
  }
];

export default function PayrollRoyaltiesPage() {
  const [royalties, setRoyalties] = useState<Royalty[]>(mockRoyalties);
  const [showForm, setShowForm] = useState(false);
  const [editingRoyalty, setEditingRoyalty] = useState<Royalty | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    royaltyType: 'percentage' as const,
    baseAmount: 0,
    percentage: 0,
    fixedAmount: 0,
    formula: '',
    period: 'monthly' as const,
    startDate: '',
    endDate: '',
    isActive: true,
    description: ''
  });

  const departments = ['Ventas', 'Producción', 'Administración', 'Recursos Humanos', 'Finanzas', 'Marketing'];
  const royaltyTypes = [
    { value: 'percentage', label: 'Porcentaje' },
    { value: 'fixed', label: 'Monto Fijo' },
    { value: 'formula', label: 'Fórmula' }
  ];
  const periods = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'annual', label: 'Anual' }
  ];

  const filteredRoyalties = royalties.filter(royalty => {
    const matchesSearch = royalty.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         royalty.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || royalty.department === filterDepartment;
    const matchesType = !filterType || royalty.royaltyType === filterType;
    const matchesPeriod = !filterPeriod || royalty.period === filterPeriod;
    
    return matchesSearch && matchesDepartment && matchesType && matchesPeriod;
  });

  const calculateRoyalty = (data: any) => {
    switch (data.royaltyType) {
      case 'percentage':
        return (data.baseAmount * data.percentage) / 100;
      case 'fixed':
        return data.fixedAmount;
      case 'formula':
        try {
          // Evaluación simple de fórmula
          const formula = data.formula.replace('baseAmount', data.baseAmount.toString());
          return eval(formula);
        } catch {
          return 0;
        }
      default:
        return 0;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const calculatedAmount = calculateRoyalty(formData);
    
    if (editingRoyalty) {
      setRoyalties(prev => prev.map(royalty => 
        royalty.id === editingRoyalty.id 
          ? { 
              ...royalty, 
              ...formData, 
              calculatedAmount,
              lastCalculation: new Date().toISOString().split('T')[0]
            }
          : royalty
      ));
    } else {
      const newRoyalty: Royalty = {
        id: Date.now().toString(),
        ...formData,
        calculatedAmount,
        lastCalculation: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0]
      };
      setRoyalties(prev => [...prev, newRoyalty]);
    }
    
    setShowForm(false);
    setEditingRoyalty(null);
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      royaltyType: 'percentage',
      baseAmount: 0,
      percentage: 0,
      fixedAmount: 0,
      formula: '',
      period: 'monthly',
      startDate: '',
      endDate: '',
      isActive: true,
      description: ''
    });
  };

  const handleEdit = (royalty: Royalty) => {
    setEditingRoyalty(royalty);
    setFormData({
      employeeId: royalty.employeeId,
      employeeName: royalty.employeeName,
      department: royalty.department,
      position: royalty.position,
      royaltyType: royalty.royaltyType,
      baseAmount: royalty.baseAmount,
      percentage: royalty.percentage || 0,
      fixedAmount: royalty.fixedAmount || 0,
      formula: royalty.formula || '',
      period: royalty.period,
      startDate: royalty.startDate,
      endDate: royalty.endDate || '',
      isActive: royalty.isActive,
      description: royalty.description
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta regalía?')) {
      setRoyalties(prev => prev.filter(royalty => royalty.id !== id));
    }
  };

  const exportToExcel = () => {
    const csvContent = [
      ['Empleado', 'Departamento', 'Tipo', 'Monto Base', 'Monto Calculado', 'Período', 'Estado'].join(','),
      ...filteredRoyalties.map(royalty => [
        royalty.employeeName,
        royalty.department,
        royalty.royaltyType === 'percentage' ? 'Porcentaje' : 
        royalty.royaltyType === 'fixed' ? 'Monto Fijo' : 'Fórmula',
        royalty.baseAmount,
        royalty.calculatedAmount,
        royalty.period === 'monthly' ? 'Mensual' : 
        royalty.period === 'quarterly' ? 'Trimestral' : 'Anual',
        royalty.isActive ? 'Activo' : 'Inactivo'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regalias.csv';
    a.click();
  };

  const totalRoyalties = filteredRoyalties.reduce((sum, royalty) => sum + royalty.calculatedAmount, 0);
  const activeRoyalties = filteredRoyalties.filter(r => r.isActive).length;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Regalías</h1>
            <p className="text-gray-600">Gestión de regalías y participaciones</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Volver
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Exportar Excel
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Regalía
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-money-dollar-circle-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Regalías</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalRoyalties.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-user-star-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Regalías Activas</p>
                <p className="text-2xl font-bold text-gray-900">{activeRoyalties}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <i className="ri-percentage-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Promedio Mensual</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${Math.round(totalRoyalties / Math.max(activeRoyalties, 1)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <i className="ri-team-line text-orange-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                <p className="text-2xl font-bold text-gray-900">{royalties.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <input
                type="text"
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Todos los departamentos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Todos los tipos</option>
                {royaltyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Todos los períodos</option>
                {periods.map(period => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterDepartment('');
                  setFilterType('');
                  setFilterPeriod('');
                }}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Base
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Calculado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
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
                {filteredRoyalties.map((royalty) => (
                  <tr key={royalty.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{royalty.employeeName}</div>
                        <div className="text-sm text-gray-500">{royalty.position}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {royalty.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        royalty.royaltyType === 'percentage' ? 'bg-blue-100 text-blue-800' :
                        royalty.royaltyType === 'fixed' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {royalty.royaltyType === 'percentage' ? 'Porcentaje' :
                         royalty.royaltyType === 'fixed' ? 'Monto Fijo' : 'Fórmula'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${royalty.baseAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${royalty.calculatedAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {royalty.period === 'monthly' ? 'Mensual' :
                       royalty.period === 'quarterly' ? 'Trimestral' : 'Anual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        royalty.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {royalty.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(royalty)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(royalty.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingRoyalty ? 'Editar Regalía' : 'Nueva Regalía'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingRoyalty(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Empleado *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.employeeId}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Empleado *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.employeeName}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departamento *
                      </label>
                      <select
                        required
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">Seleccionar departamento</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posición *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Regalía *
                      </label>
                      <select
                        required
                        value={formData.royaltyType}
                        onChange={(e) => setFormData(prev => ({ ...prev, royaltyType: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        {royaltyTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Período *
                      </label>
                      <select
                        required
                        value={formData.period}
                        onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        {periods.map(period => (
                          <option key={period.value} value={period.value}>{period.label}</option>
                        ))}
                      </select>
                    </div>

                    {formData.royaltyType !== 'fixed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monto Base
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.baseAmount}
                          onChange={(e) => setFormData(prev => ({ ...prev, baseAmount: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    )}

                    {formData.royaltyType === 'percentage' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Porcentaje (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.percentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    )}

                    {formData.royaltyType === 'fixed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monto Fijo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.fixedAmount}
                          onChange={(e) => setFormData(prev => ({ ...prev, fixedAmount: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Inicio *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  {formData.royaltyType === 'formula' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fórmula
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: (baseAmount * 0.03) + 2000"
                        value={formData.formula}
                        onChange={(e) => setFormData(prev => ({ ...prev, formula: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use 'baseAmount' como variable en la fórmula
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Regalía activa
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingRoyalty(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      {editingRoyalty ? 'Actualizar' : 'Crear'} Regalía
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
