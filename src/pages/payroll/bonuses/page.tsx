import { useState } from 'react';

interface Bonus {
  id: string;
  name: string;
  type: 'fijo' | 'porcentaje' | 'formula';
  amount: number;
  percentage?: number;
  formula?: string;
  frequency: 'mensual' | 'trimestral' | 'semestral' | 'anual' | 'unico';
  category: 'productividad' | 'ventas' | 'asistencia' | 'antiguedad' | 'navidad' | 'vacaciones' | 'otro';
  isActive: boolean;
  isTaxable: boolean;
  affectsISR: boolean;
  affectsSocialSecurity: boolean;
  description: string;
  conditions: string;
  createdAt: string;
}

const mockBonuses: Bonus[] = [
  {
    id: '1',
    name: 'Bono de Productividad',
    type: 'porcentaje',
    amount: 0,
    percentage: 15,
    frequency: 'mensual',
    category: 'productividad',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: true,
    description: 'Bono por cumplimiento de metas de productividad',
    conditions: 'Cumplir 100% de las metas mensuales establecidas',
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Bono de Ventas',
    type: 'porcentaje',
    amount: 0,
    percentage: 5,
    frequency: 'mensual',
    category: 'ventas',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: true,
    description: 'Comisión por ventas realizadas',
    conditions: 'Aplicable sobre ventas netas del mes',
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    name: 'Bono de Asistencia Perfecta',
    type: 'fijo',
    amount: 5000,
    frequency: 'mensual',
    category: 'asistencia',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: true,
    description: 'Bono por asistencia perfecta mensual',
    conditions: 'No tener faltas ni tardanzas en el mes',
    createdAt: '2024-01-01'
  },
  {
    id: '4',
    name: 'Bono de Antigüedad',
    type: 'porcentaje',
    amount: 0,
    percentage: 2,
    frequency: 'anual',
    category: 'antiguedad',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: true,
    description: 'Bono por años de servicio en la empresa',
    conditions: 'Por cada año completo de servicio',
    createdAt: '2024-01-01'
  },
  {
    id: '5',
    name: 'Bono Navideño (Doble Sueldo)',
    type: 'formula',
    amount: 0,
    formula: 'salario_base * 1',
    frequency: 'anual',
    category: 'navidad',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: false,
    description: 'Bono navideño equivalente a un salario mensual',
    conditions: 'Haber trabajado mínimo 3 meses en el año',
    createdAt: '2024-01-01'
  },
  {
    id: '6',
    name: 'Bono Vacacional',
    type: 'porcentaje',
    amount: 0,
    percentage: 50,
    frequency: 'anual',
    category: 'vacaciones',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: false,
    description: 'Bono equivalente al 50% del salario para vacaciones',
    conditions: 'Al tomar vacaciones anuales',
    createdAt: '2024-01-01'
  },
  {
    id: '7',
    name: 'Bono por Referidos',
    type: 'fijo',
    amount: 10000,
    frequency: 'unico',
    category: 'otro',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: true,
    description: 'Bono por referir empleados que sean contratados',
    conditions: 'El empleado referido debe completar 3 meses de prueba',
    createdAt: '2024-01-01'
  },
  {
    id: '8',
    name: 'Bono de Capacitación',
    type: 'fijo',
    amount: 7500,
    frequency: 'trimestral',
    category: 'otro',
    isActive: true,
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: true,
    description: 'Bono por completar capacitaciones certificadas',
    conditions: 'Completar al menos 20 horas de capacitación trimestral',
    createdAt: '2024-01-01'
  }
];

export default function PayrollBonusesPage() {
  const [bonuses, setBonuses] = useState<Bonus[]>(mockBonuses);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'fijo' as Bonus['type'],
    amount: 0,
    percentage: 0,
    formula: '',
    frequency: 'mensual' as Bonus['frequency'],
    category: 'productividad' as Bonus['category'],
    isTaxable: true,
    affectsISR: true,
    affectsSocialSecurity: true,
    description: '',
    conditions: ''
  });

  const filteredBonuses = bonuses.filter(bonus => {
    const matchesSearch = bonus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bonus.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'todos' || bonus.category === categoryFilter;
    const matchesType = typeFilter === 'todos' || bonus.type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBonus) {
      setBonuses(bonuses.map(bonus => 
        bonus.id === editingBonus.id 
          ? { ...bonus, ...formData, isActive: true }
          : bonus
      ));
    } else {
      const newBonus: Bonus = {
        id: Date.now().toString(),
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      setBonuses([...bonuses, newBonus]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'fijo',
      amount: 0,
      percentage: 0,
      formula: '',
      frequency: 'mensual',
      category: 'productividad',
      isTaxable: true,
      affectsISR: true,
      affectsSocialSecurity: true,
      description: '',
      conditions: ''
    });
    setEditingBonus(null);
    setShowForm(false);
  };

  const handleEdit = (bonus: Bonus) => {
    setFormData({
      name: bonus.name,
      type: bonus.type,
      amount: bonus.amount,
      percentage: bonus.percentage || 0,
      formula: bonus.formula || '',
      frequency: bonus.frequency,
      category: bonus.category,
      isTaxable: bonus.isTaxable,
      affectsISR: bonus.affectsISR,
      affectsSocialSecurity: bonus.affectsSocialSecurity,
      description: bonus.description,
      conditions: bonus.conditions
    });
    setEditingBonus(bonus);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta bonificación?')) {
      setBonuses(bonuses.filter(bonus => bonus.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setBonuses(bonuses.map(bonus => 
      bonus.id === id 
        ? { ...bonus, isActive: !bonus.isActive }
        : bonus
    ));
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Nombre', 'Tipo', 'Monto/Porcentaje', 'Frecuencia', 'Categoría', 'Gravable', 'Afecta ISR', 'Afecta SS', 'Estado'].join(','),
      ...filteredBonuses.map(bonus => [
        bonus.name,
        bonus.type,
        bonus.type === 'fijo' ? `RD$${bonus.amount.toLocaleString()}` : 
        bonus.type === 'porcentaje' ? `${bonus.percentage}%` : bonus.formula,
        bonus.frequency,
        bonus.category,
        bonus.isTaxable ? 'Sí' : 'No',
        bonus.affectsISR ? 'Sí' : 'No',
        bonus.affectsSocialSecurity ? 'Sí' : 'No',
        bonus.isActive ? 'Activo' : 'Inactivo'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bonificaciones.csv';
    a.click();
  };

  const getCategoryColor = (category: Bonus['category']) => {
    switch (category) {
      case 'productividad': return 'bg-blue-100 text-blue-800';
      case 'ventas': return 'bg-green-100 text-green-800';
      case 'asistencia': return 'bg-purple-100 text-purple-800';
      case 'antiguedad': return 'bg-orange-100 text-orange-800';
      case 'navidad': return 'bg-red-100 text-red-800';
      case 'vacaciones': return 'bg-yellow-100 text-yellow-800';
      case 'otro': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: Bonus['category']) => {
    switch (category) {
      case 'productividad': return 'Productividad';
      case 'ventas': return 'Ventas';
      case 'asistencia': return 'Asistencia';
      case 'antiguedad': return 'Antigüedad';
      case 'navidad': return 'Navidad';
      case 'vacaciones': return 'Vacaciones';
      case 'otro': return 'Otro';
      default: return category;
    }
  };

  const getFrequencyLabel = (frequency: Bonus['frequency']) => {
    switch (frequency) {
      case 'mensual': return 'Mensual';
      case 'trimestral': return 'Trimestral';
      case 'semestral': return 'Semestral';
      case 'anual': return 'Anual';
      case 'unico': return 'Único';
      default: return frequency;
    }
  };

  const stats = {
    total: bonuses.length,
    active: bonuses.filter(b => b.isActive).length,
    taxable: bonuses.filter(b => b.isTaxable).length,
    monthly: bonuses.filter(b => b.frequency === 'mensual').length
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonificaciones</h1>
          <p className="text-gray-600 mt-1">Gestión de bonificaciones y pagos adicionales</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-arrow-left-line"></i>
            Volver a Nóminas
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            Nueva Bonificación
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <i className="ri-gift-line text-xl text-blue-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bonos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <i className="ri-check-line text-xl text-green-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <i className="ri-money-dollar-circle-line text-xl text-orange-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gravables</p>
              <p className="text-2xl font-bold text-gray-900">{stats.taxable}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <i className="ri-calendar-line text-xl text-purple-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mensuales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.monthly}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Buscar bonificaciones..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="todos">Todas las categorías</option>
              <option value="productividad">Productividad</option>
              <option value="ventas">Ventas</option>
              <option value="asistencia">Asistencia</option>
              <option value="antiguedad">Antigüedad</option>
              <option value="navidad">Navidad</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="otro">Otro</option>
            </select>

            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="todos">Todos los tipos</option>
              <option value="fijo">Monto Fijo</option>
              <option value="porcentaje">Porcentaje</option>
              <option value="formula">Fórmula</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-download-line mr-2"></i>
              Exportar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Bonificación
            </button>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingBonus ? 'Editar Bonificación' : 'Nueva Bonificación'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Bonificación *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cálculo *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Bonus['type'] })}
                  >
                    <option value="fijo">Monto Fijo</option>
                    <option value="porcentaje">Porcentaje</option>
                    <option value="formula">Fórmula</option>
                  </select>
                </div>

                {formData.type === 'fijo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto (RD$) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                )}

                {formData.type === 'porcentaje' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Porcentaje (%) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.percentage}
                      onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) })}
                    />
                  </div>
                )}

                {formData.type === 'formula' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fórmula *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej: salario_base * 0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.formula}
                      onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Bonus['frequency'] })}
                  >
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                    <option value="unico">Único</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Bonus['category'] })}
                  >
                    <option value="productividad">Productividad</option>
                    <option value="ventas">Ventas</option>
                    <option value="asistencia">Asistencia</option>
                    <option value="antiguedad">Antigüedad</option>
                    <option value="navidad">Navidad</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condiciones para Aplicar
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.isTaxable}
                    onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Es gravable</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.affectsISR}
                    onChange={(e) => setFormData({ ...formData, affectsISR: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Afecta ISR</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.affectsSocialSecurity}
                    onChange={(e) => setFormData({ ...formData, affectsSocialSecurity: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Afecta Seg. Social</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingBonus ? 'Actualizar' : 'Crear'} Bonificación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Bonificaciones */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bonificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo/Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frecuencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impuestos
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
              {filteredBonuses.map((bonus) => (
                <tr key={bonus.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{bonus.name}</div>
                      <div className="text-sm text-gray-500">{bonus.description}</div>
                      {bonus.conditions && (
                        <div className="text-xs text-gray-400 mt-1">
                          <i className="ri-information-line mr-1"></i>
                          {bonus.conditions}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {bonus.type === 'fijo' && `RD$${bonus.amount.toLocaleString()}`}
                      {bonus.type === 'porcentaje' && `${bonus.percentage}%`}
                      {bonus.type === 'formula' && bonus.formula}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{bonus.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getFrequencyLabel(bonus.frequency)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(bonus.category)}`}>
                      {getCategoryLabel(bonus.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {bonus.isTaxable && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Gravable
                        </span>
                      )}
                      {bonus.affectsISR && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          ISR
                        </span>
                      )}
                      {bonus.affectsSocialSecurity && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          SS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bonus.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {bonus.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(bonus)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => toggleStatus(bonus.id)}
                        className={`${bonus.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        title={bonus.isActive ? 'Desactivar' : 'Activar'}
                      >
                        <i className={`${bonus.isActive ? 'ri-pause-circle-line' : 'ri-play-circle-line'}`}></i>
                      </button>
                      <button
                        onClick={() => handleDelete(bonus.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
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

        {filteredBonuses.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-gift-line text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay bonificaciones</h3>
            <p className="text-gray-500 mb-4">No se encontraron bonificaciones con los filtros aplicados.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Primera Bonificación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
