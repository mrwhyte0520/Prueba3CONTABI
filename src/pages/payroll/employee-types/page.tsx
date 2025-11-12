
import { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

interface EmployeeType {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  workingHours: number;
  overtimeEligible: boolean;
  vacationDays: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function EmployeeTypesPage() {
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([
    {
      id: '1',
      name: 'Tiempo Completo',
      description: 'Empleado con jornada completa de 8 horas diarias',
      benefits: ['Seguro médico', 'Vacaciones pagadas', 'Bonificación navideña', 'Seguro de vida'],
      workingHours: 8,
      overtimeEligible: true,
      vacationDays: 14,
      status: 'active',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Medio Tiempo',
      description: 'Empleado con jornada de 4 horas diarias',
      benefits: ['Vacaciones proporcionales', 'Bonificación proporcional'],
      workingHours: 4,
      overtimeEligible: false,
      vacationDays: 7,
      status: 'active',
      createdAt: '2024-01-20'
    },
    {
      id: '3',
      name: 'Temporal',
      description: 'Empleado contratado por tiempo determinado',
      benefits: ['Pago por servicios'],
      workingHours: 8,
      overtimeEligible: false,
      vacationDays: 0,
      status: 'active',
      createdAt: '2024-02-01'
    },
    {
      id: '4',
      name: 'Contratista',
      description: 'Prestador de servicios independiente',
      benefits: ['Pago por proyecto'],
      workingHours: 0,
      overtimeEligible: false,
      vacationDays: 0,
      status: 'active',
      createdAt: '2024-02-10'
    },
    {
      id: '5',
      name: 'Practicante',
      description: 'Estudiante en práctica profesional',
      benefits: ['Certificado de práctica', 'Experiencia laboral'],
      workingHours: 6,
      overtimeEligible: false,
      vacationDays: 0,
      status: 'active',
      createdAt: '2024-02-15'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<EmployeeType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    benefits: '',
    workingHours: 8,
    overtimeEligible: true,
    vacationDays: 14,
    status: 'active' as 'active' | 'inactive'
  });

  const filteredTypes = employeeTypes.filter(type => {
    const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         type.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || type.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const benefitsArray = formData.benefits.split(',').map(b => b.trim()).filter(b => b);
    
    if (editingType) {
      setEmployeeTypes(prev => prev.map(type => 
        type.id === editingType.id 
          ? { ...type, ...formData, benefits: benefitsArray }
          : type
      ));
    } else {
      const newType: EmployeeType = {
        id: Date.now().toString(),
        ...formData,
        benefits: benefitsArray,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setEmployeeTypes(prev => [...prev, newType]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      benefits: '',
      workingHours: 8,
      overtimeEligible: true,
      vacationDays: 14,
      status: 'active'
    });
    setEditingType(null);
    setShowForm(false);
  };

  const handleEdit = (type: EmployeeType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description,
      benefits: type.benefits.join(', '),
      workingHours: type.workingHours,
      overtimeEligible: type.overtimeEligible,
      vacationDays: type.vacationDays,
      status: type.status
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar este tipo de empleado?')) {
      setEmployeeTypes(prev => prev.filter(type => type.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setEmployeeTypes(prev => prev.map(type => 
      type.id === id 
        ? { ...type, status: type.status === 'active' ? 'inactive' : 'active' }
        : type
    ));
  };

  const downloadExcel = () => {
    let csvContent = 'Tipos de Empleados\\n';
    csvContent += `Generado: ${new Date().toLocaleDateString()}\\n\\n`;
    csvContent += 'Nombre,Descripción,Horas de Trabajo,Horas Extras,Días de Vacaciones,Beneficios,Estado\\n';
    
    filteredTypes.forEach(type => {
      const row = [
        `"${type.name}"`,
        `"${type.description}"`,
        type.workingHours,
        type.overtimeEligible ? 'Sí' : 'No',
        type.vacationDays,
        `"${type.benefits.join(', ')}"`,
        type.status === 'active' ? 'Activo' : 'Inactivo'
      ].join(',');
      csvContent += row + '\\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tipos_empleados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Empleados</h1>
            <p className="text-gray-600">Gestiona los diferentes tipos de empleados y sus características</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <i className="ri-download-line"></i>
              Exportar Excel
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <i className="ri-add-line"></i>
              Nuevo Tipo
            </button>
          </div>
        </div>

        {/* Filtros */}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o descripción..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tipos</p>
                <p className="text-2xl font-bold text-gray-900">{employeeTypes.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-team-line text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {employeeTypes.filter(t => t.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Con Horas Extras</p>
                <p className="text-2xl font-bold text-orange-600">
                  {employeeTypes.filter(t => t.overtimeEligible).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-orange-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio Vacaciones</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(employeeTypes.reduce((sum, t) => sum + t.vacationDays, 0) / employeeTypes.length)} días
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-calendar-line text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas de Trabajo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas Extras
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vacaciones
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
                        <div className="text-xs text-gray-400 mt-1">
                          Beneficios: {type.benefits.join(', ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{type.workingHours} horas/día</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        type.overtimeEligible 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {type.overtimeEligible ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{type.vacationDays} días/año</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        type.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {type.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Editar"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => toggleStatus(type.id)}
                          className={`transition-colors ${
                            type.status === 'active' 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={type.status === 'active' ? 'Desactivar' : 'Activar'}
                        >
                          <i className={type.status === 'active' ? 'ri-pause-line' : 'ri-play-line'}></i>
                        </button>
                        <button
                          onClick={() => handleDelete(type.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
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
        </div>

        {/* Modal de formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingType ? 'Editar Tipo de Empleado' : 'Nuevo Tipo de Empleado'}
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
                      Nombre del Tipo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beneficios (separados por comas)
                  </label>
                  <textarea
                    value={formData.benefits}
                    onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                    rows={2}
                    placeholder="Seguro médico, Vacaciones pagadas, Bonificación navideña..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horas de Trabajo/Día
                    </label>
                    <input
                      type="number"
                      value={formData.workingHours}
                      onChange={(e) => setFormData({...formData, workingHours: parseInt(e.target.value)})}
                      min="0"
                      max="24"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Días de Vacaciones/Año
                    </label>
                    <input
                      type="number"
                      value={formData.vacationDays}
                      onChange={(e) => setFormData({...formData, vacationDays: parseInt(e.target.value)})}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.overtimeEligible}
                        onChange={(e) => setFormData({...formData, overtimeEligible: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Elegible para horas extras</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
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
