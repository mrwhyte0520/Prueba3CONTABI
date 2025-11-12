import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'nacional' | 'religioso' | 'local' | 'empresa';
  isPaid: boolean;
  multiplier: number;
  description: string;
  isRecurring: boolean;
  status: 'activo' | 'inactivo';
  createdAt: string;
}

const mockHolidays: Holiday[] = [
  {
    id: '1',
    name: 'Año Nuevo',
    date: '2024-01-01',
    type: 'nacional',
    isPaid: true,
    multiplier: 2.0,
    description: 'Celebración del Año Nuevo',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Día de los Reyes Magos',
    date: '2024-01-06',
    type: 'religioso',
    isPaid: true,
    multiplier: 2.0,
    description: 'Celebración de los Reyes Magos',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    name: 'Día de la Altagracia',
    date: '2024-01-21',
    type: 'religioso',
    isPaid: true,
    multiplier: 2.0,
    description: 'Día de la Virgen de la Altagracia',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '4',
    name: 'Día de Duarte',
    date: '2024-01-26',
    type: 'nacional',
    isPaid: true,
    multiplier: 2.0,
    description: 'Natalicio de Juan Pablo Duarte',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '5',
    name: 'Día de la Independencia',
    date: '2024-02-27',
    type: 'nacional',
    isPaid: true,
    multiplier: 2.0,
    description: 'Independencia Nacional',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '6',
    name: 'Viernes Santo',
    date: '2024-03-29',
    type: 'religioso',
    isPaid: true,
    multiplier: 2.0,
    description: 'Viernes Santo',
    isRecurring: false,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '7',
    name: 'Día del Trabajo',
    date: '2024-05-01',
    type: 'nacional',
    isPaid: true,
    multiplier: 2.0,
    description: 'Día Internacional del Trabajo',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '8',
    name: 'Corpus Christi',
    date: '2024-05-30',
    type: 'religioso',
    isPaid: true,
    multiplier: 2.0,
    description: 'Corpus Christi',
    isRecurring: false,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '9',
    name: 'Día de la Restauración',
    date: '2024-08-16',
    type: 'nacional',
    isPaid: true,
    multiplier: 2.0,
    description: 'Día de la Restauración',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '10',
    name: 'Día de las Mercedes',
    date: '2024-09-24',
    type: 'religioso',
    isPaid: true,
    multiplier: 2.0,
    description: 'Día de la Virgen de las Mercedes',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '11',
    name: 'Día de la Constitución',
    date: '2024-11-06',
    type: 'nacional',
    isPaid: true,
    multiplier: 2.0,
    description: 'Día de la Constitución',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '12',
    name: 'Navidad',
    date: '2024-12-25',
    type: 'religioso',
    isPaid: true,
    multiplier: 2.0,
    description: 'Celebración de la Navidad',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  },
  {
    id: '13',
    name: 'Aniversario de la Empresa',
    date: '2024-03-15',
    type: 'empresa',
    isPaid: true,
    multiplier: 1.5,
    description: 'Aniversario de fundación de la empresa',
    isRecurring: true,
    status: 'activo',
    createdAt: '2024-01-01'
  }
];

export default function HolidaysPage() {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState<Holiday[]>(mockHolidays);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'nacional' as Holiday['type'],
    isPaid: true,
    multiplier: 2.0,
    description: '',
    isRecurring: true
  });

  const filteredHolidays = holidays.filter(holiday => {
    const matchesSearch = holiday.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         holiday.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'todos' || holiday.type === typeFilter;
    const matchesStatus = statusFilter === 'todos' || holiday.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingHoliday) {
      setHolidays(holidays.map(holiday => 
        holiday.id === editingHoliday.id 
          ? { ...holiday, ...formData }
          : holiday
      ));
    } else {
      const newHoliday: Holiday = {
        id: Date.now().toString(),
        ...formData,
        status: 'activo',
        createdAt: new Date().toISOString()
      };
      setHolidays([...holidays, newHoliday]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      type: 'nacional',
      isPaid: true,
      multiplier: 2.0,
      description: '',
      isRecurring: true
    });
    setEditingHoliday(null);
    setShowForm(false);
  };

  const handleEdit = (holiday: Holiday) => {
    setFormData({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      isPaid: holiday.isPaid,
      multiplier: holiday.multiplier,
      description: holiday.description,
      isRecurring: holiday.isRecurring
    });
    setEditingHoliday(holiday);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este día feriado?')) {
      setHolidays(holidays.filter(holiday => holiday.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setHolidays(holidays.map(holiday => 
      holiday.id === id 
        ? { ...holiday, status: holiday.status === 'activo' ? 'inactivo' : 'activo' }
        : holiday
    ));
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Nombre', 'Fecha', 'Tipo', 'Pagado', 'Multiplicador', 'Descripción', 'Recurrente', 'Estado'].join(','),
      ...filteredHolidays.map(holiday => [
        holiday.name,
        holiday.date,
        holiday.type,
        holiday.isPaid ? 'Sí' : 'No',
        holiday.multiplier,
        holiday.description,
        holiday.isRecurring ? 'Sí' : 'No',
        holiday.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dias_feriados.csv';
    a.click();
  };

  const getTypeColor = (type: Holiday['type']) => {
    switch (type) {
      case 'nacional': return 'bg-blue-100 text-blue-800';
      case 'religioso': return 'bg-purple-100 text-purple-800';
      case 'local': return 'bg-green-100 text-green-800';
      case 'empresa': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: Holiday['type']) => {
    switch (type) {
      case 'nacional': return 'Nacional';
      case 'religioso': return 'Religioso';
      case 'local': return 'Local';
      case 'empresa': return 'Empresa';
      default: return type;
    }
  };

  const stats = {
    total: holidays.length,
    nacional: holidays.filter(h => h.type === 'nacional').length,
    religioso: holidays.filter(h => h.type === 'religioso').length,
    empresa: holidays.filter(h => h.type === 'empresa').length,
    pagados: holidays.filter(h => h.isPaid).length
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Días Feriados</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/payroll')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <i className="ri-home-line"></i>
              Volver al Inicio
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <i className="ri-add-line"></i>
              Nuevo Feriado
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-calendar-line text-xl text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Feriados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-flag-line text-xl text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Nacionales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.nacional}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <i className="ri-church-line text-xl text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Religiosos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.religioso}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <i className="ri-building-line text-xl text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Empresa</p>
                <p className="text-2xl font-bold text-gray-900">{stats.empresa}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pagados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pagados}</p>
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
                  placeholder="Buscar feriados..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="todos">Todos los tipos</option>
                <option value="nacional">Nacional</option>
                <option value="religioso">Religioso</option>
                <option value="local">Local</option>
                <option value="empresa">Empresa</option>
              </select>

              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
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
            </div>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingHoliday ? 'Editar Día Feriado' : 'Nuevo Día Feriado'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Feriado *
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
                      Fecha *
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo *
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Holiday['type'] })}
                    >
                      <option value="nacional">Nacional</option>
                      <option value="religioso">Religioso</option>
                      <option value="local">Local</option>
                      <option value="empresa">Empresa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Multiplicador de Pago
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.multiplier}
                      onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })}
                    />
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

                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.isPaid}
                      onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Es día pagado</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Se repite anualmente</span>
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
                    {editingHoliday ? 'Actualizar' : 'Crear'} Feriado
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de Feriados */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feriado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Multiplicador
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
                {filteredHolidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                        <div className="text-sm text-gray-500">{holiday.description}</div>
                        <div className="flex items-center mt-1 gap-2">
                          {holiday.isPaid && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <i className="ri-money-dollar-circle-line mr-1"></i>
                              Pagado
                            </span>
                          )}
                          {holiday.isRecurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <i className="ri-repeat-line mr-1"></i>
                              Recurrente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(holiday.date).toLocaleDateString('es-DO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(holiday.type)}`}>
                        {getTypeLabel(holiday.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{holiday.multiplier}x</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        holiday.status === 'activo' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {holiday.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => toggleStatus(holiday.id)}
                          className={`${holiday.status === 'activo' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                          title={holiday.status === 'activo' ? 'Desactivar' : 'Activar'}
                        >
                          <i className={`${holiday.status === 'activo' ? 'ri-pause-circle-line' : 'ri-play-circle-line'}`}></i>
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id)}
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

          {filteredHolidays.length === 0 && (
            <div className="text-center py-12">
              <i className="ri-calendar-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay días feriados</h3>
              <p className="text-gray-500 mb-4">No se encontraron días feriados con los filtros aplicados.</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear Primer Feriado
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
