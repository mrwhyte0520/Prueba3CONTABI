
import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface PayrollPeriod {
  id: string;
  name: string;
  period_type: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  start_date: string;
  end_date: string;
  pay_date: string;
  status: 'draft' | 'processing' | 'calculated' | 'paid' | 'closed';
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  created_at: string;
  closed_at?: string;
}

const mockPeriods: PayrollPeriod[] = [
  {
    id: '1',
    name: 'Enero 2024',
    period_type: 'monthly',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    pay_date: '2024-02-05',
    status: 'paid',
    total_employees: 45,
    total_gross: 2250000,
    total_deductions: 450000,
    total_net: 1800000,
    created_at: '2024-01-25',
    closed_at: '2024-02-05'
  },
  {
    id: '2',
    name: 'Febrero 2024',
    period_type: 'monthly',
    start_date: '2024-02-01',
    end_date: '2024-02-29',
    pay_date: '2024-03-05',
    status: 'paid',
    total_employees: 47,
    total_gross: 2350000,
    total_deductions: 470000,
    total_net: 1880000,
    created_at: '2024-02-25',
    closed_at: '2024-03-05'
  },
  {
    id: '3',
    name: 'Marzo 2024',
    period_type: 'monthly',
    start_date: '2024-03-01',
    end_date: '2024-03-31',
    pay_date: '2024-04-05',
    status: 'calculated',
    total_employees: 48,
    total_gross: 2400000,
    total_deductions: 480000,
    total_net: 1920000,
    created_at: '2024-03-25'
  },
  {
    id: '4',
    name: 'Abril 2024',
    period_type: 'monthly',
    start_date: '2024-04-01',
    end_date: '2024-04-30',
    pay_date: '2024-05-05',
    status: 'processing',
    total_employees: 50,
    total_gross: 2500000,
    total_deductions: 500000,
    total_net: 2000000,
    created_at: '2024-04-25'
  },
  {
    id: '5',
    name: 'Mayo 2024',
    period_type: 'monthly',
    start_date: '2024-05-01',
    end_date: '2024-05-31',
    pay_date: '2024-06-05',
    status: 'draft',
    total_employees: 52,
    total_gross: 0,
    total_deductions: 0,
    total_net: 0,
    created_at: '2024-05-01'
  }
];

export default function PayrollPeriodsPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>(mockPeriods);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PayrollPeriod | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    period_type: 'monthly' as const,
    start_date: '',
    end_date: '',
    pay_date: ''
  });

  const filteredPeriods = periods.filter(period => {
    const matchesSearch = period.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || period.status === filterStatus;
    const matchesType = filterType === 'all' || period.period_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingPeriod) {
      setPeriods(prev => prev.map(period => 
        period.id === editingPeriod.id 
          ? { ...period, ...formData }
          : period
      ));
    } else {
      const newPeriod: PayrollPeriod = {
        id: Date.now().toString(),
        ...formData,
        status: 'draft',
        total_employees: 0,
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
        created_at: new Date().toISOString().split('T')[0]
      };
      setPeriods(prev => [...prev, newPeriod]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      period_type: 'monthly',
      start_date: '',
      end_date: '',
      pay_date: ''
    });
    setEditingPeriod(null);
    setShowForm(false);
  };

  const handleEdit = (period: PayrollPeriod) => {
    setFormData({
      name: period.name,
      period_type: period.period_type,
      start_date: period.start_date,
      end_date: period.end_date,
      pay_date: period.pay_date
    });
    setEditingPeriod(period);
    setShowForm(true);
  };

  const updateStatus = (id: string, newStatus: PayrollPeriod['status']) => {
    setPeriods(prev => prev.map(period => 
      period.id === id ? { 
        ...period, 
        status: newStatus,
        ...(newStatus === 'closed' ? { closed_at: new Date().toISOString().split('T')[0] } : {})
      } : period
    ));
  };

  const exportToExcel = () => {
    const csvContent = [
      ['Período', 'Tipo', 'Fecha Inicio', 'Fecha Fin', 'Fecha Pago', 'Estado', 'Empleados', 'Total Bruto', 'Deducciones', 'Total Neto'].join(','),
      ...filteredPeriods.map(period => [
        period.name,
        period.period_type === 'monthly' ? 'Mensual' : 
        period.period_type === 'biweekly' ? 'Quincenal' :
        period.period_type === 'weekly' ? 'Semanal' : period.period_type,
        period.start_date,
        period.end_date,
        period.pay_date,
        period.status === 'draft' ? 'Borrador' :
        period.status === 'processing' ? 'Procesando' :
        period.status === 'calculated' ? 'Calculado' :
        period.status === 'paid' ? 'Pagado' : 'Cerrado',
        period.total_employees.toString(),
        `RD$${period.total_gross.toLocaleString()}`,
        `RD$${period.total_deductions.toLocaleString()}`,
        `RD$${period.total_net.toLocaleString()}`
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `periodos_nomina_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'processing': return 'Procesando';
      case 'calculated': return 'Calculado';
      case 'paid': return 'Pagado';
      case 'closed': return 'Cerrado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'calculated': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPeriodTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly': return 'Semanal';
      case 'biweekly': return 'Quincenal';
      case 'monthly': return 'Mensual';
      case 'quarterly': return 'Trimestral';
      case 'annual': return 'Anual';
      default: return type;
    }
  };

  const canEdit = (status: string) => {
    return status === 'draft' || status === 'processing';
  };

  const canProcess = (status: string) => {
    return status === 'draft';
  };

  const canCalculate = (status: string) => {
    return status === 'processing';
  };

  const canPay = (status: string) => {
    return status === 'calculated';
  };

  const canClose = (status: string) => {
    return status === 'paid';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Períodos de Nómina</h1>
            <p className="text-gray-600">Gestiona los períodos de pago y procesamiento de nóminas</p>
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
              Nuevo Período
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Períodos</p>
                <p className="text-2xl font-bold text-gray-900">{periods.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-calendar-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-gray-900">
                  {periods.filter(p => p.status === 'processing' || p.status === 'calculated').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-xl text-yellow-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pagados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {periods.filter(p => p.status === 'paid').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Último Pago</p>
                <p className="text-lg font-bold text-gray-900">
                  RD${periods.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.total_net, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-xl text-purple-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.max(...periods.map(p => p.total_employees))}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-team-line text-xl text-orange-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar períodos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="processing">Procesando</option>
                <option value="calculated">Calculado</option>
                <option value="paid">Pagado</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Período
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los tipos</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterType('all');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Periods Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Bruto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Neto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPeriods.map((period) => (
                  <tr key={period.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{period.name}</div>
                        <div className="text-sm text-gray-500">{getPeriodTypeLabel(period.period_type)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>{period.start_date} - {period.end_date}</div>
                        <div className="text-gray-500">Pago: {period.pay_date}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(period.status)}`}>
                        {getStatusLabel(period.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {period.total_employees}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${period.total_gross.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${period.total_net.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit(period.status) && (
                          <button
                            onClick={() => handleEdit(period)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                        )}
                        
                        {canProcess(period.status) && (
                          <button
                            onClick={() => updateStatus(period.id, 'processing')}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Procesar"
                          >
                            <i className="ri-play-line"></i>
                          </button>
                        )}
                        
                        {canCalculate(period.status) && (
                          <button
                            onClick={() => updateStatus(period.id, 'calculated')}
                            className="text-blue-600 hover:text-blue-900"
                            title="Calcular"
                          >
                            <i className="ri-calculator-line"></i>
                          </button>
                        )}
                        
                        {canPay(period.status) && (
                          <button
                            onClick={() => updateStatus(period.id, 'paid')}
                            className="text-green-600 hover:text-green-900"
                            title="Marcar como Pagado"
                          >
                            <i className="ri-money-dollar-circle-line"></i>
                          </button>
                        )}
                        
                        {canClose(period.status) && (
                          <button
                            onClick={() => updateStatus(period.id, 'closed')}
                            className="text-purple-600 hover:text-purple-900"
                            title="Cerrar Período"
                          >
                            <i className="ri-lock-line"></i>
                          </button>
                        )}

                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Ver Detalles"
                        >
                          <i className="ri-eye-line"></i>
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
                  {editingPeriod ? 'Editar Período' : 'Nuevo Período'}
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
                      Nombre del Período *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Enero 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Período *
                    </label>
                    <select
                      required
                      value={formData.period_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, period_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="weekly">Semanal</option>
                      <option value="biweekly">Quincenal</option>
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="annual">Anual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Fin *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.pay_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, pay_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                    {editingPeriod ? 'Actualizar' : 'Crear'} Período
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
