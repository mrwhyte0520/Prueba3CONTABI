
import { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

interface Position {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salaryRange: {
    min: number;
    max: number;
  };
  level: 'junior' | 'mid' | 'senior' | 'executive';
  employeeCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([
    {
      id: '1',
      title: 'Gerente de Recursos Humanos',
      department: 'Recursos Humanos',
      description: 'Responsable de liderar el departamento de RRHH y desarrollar estrategias de talento humano',
      requirements: ['Licenciatura en RRHH o afines', '5+ años de experiencia', 'Liderazgo de equipos'],
      responsibilities: ['Gestión del talento', 'Desarrollo organizacional', 'Políticas de RRHH'],
      salaryRange: { min: 80000, max: 120000 },
      level: 'executive',
      employeeCount: 1,
      status: 'active',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      title: 'Contador Senior',
      department: 'Contabilidad',
      description: 'Encargado de la gestión contable y financiera de la empresa',
      requirements: ['CPA o Licenciatura en Contabilidad', '3+ años de experiencia', 'Conocimiento en NIIF'],
      responsibilities: ['Estados financieros', 'Análisis contable', 'Cumplimiento fiscal'],
      salaryRange: { min: 60000, max: 85000 },
      level: 'senior',
      employeeCount: 3,
      status: 'active',
      createdAt: '2024-01-20'
    },
    {
      id: '3',
      title: 'Desarrollador Full Stack',
      department: 'Tecnología',
      description: 'Desarrollo de aplicaciones web y sistemas internos',
      requirements: ['Ingeniería en Sistemas', 'React, Node.js', '2+ años de experiencia'],
      responsibilities: ['Desarrollo frontend', 'APIs backend', 'Mantenimiento sistemas'],
      salaryRange: { min: 50000, max: 75000 },
      level: 'mid',
      employeeCount: 8,
      status: 'active',
      createdAt: '2024-02-01'
    },
    {
      id: '4',
      title: 'Ejecutivo de Ventas',
      department: 'Ventas',
      description: 'Responsable de la gestión comercial y atención a clientes',
      requirements: ['Bachillerato', 'Experiencia en ventas', 'Habilidades comunicativas'],
      responsibilities: ['Prospección clientes', 'Cierre de ventas', 'Seguimiento post-venta'],
      salaryRange: { min: 25000, max: 40000 },
      level: 'junior',
      employeeCount: 12,
      status: 'active',
      createdAt: '2024-02-10'
    },
    {
      id: '5',
      title: 'Especialista en Marketing Digital',
      department: 'Marketing',
      description: 'Gestión de campañas digitales y redes sociales',
      requirements: ['Marketing o Comunicación', 'Google Ads, Facebook Ads', 'Creatividad'],
      responsibilities: ['Campañas digitales', 'Análisis métricas', 'Contenido creativo'],
      salaryRange: { min: 35000, max: 55000 },
      level: 'mid',
      employeeCount: 4,
      status: 'active',
      createdAt: '2024-02-15'
    },
    {
      id: '6',
      title: 'Supervisor de Operaciones',
      department: 'Operaciones',
      description: 'Supervisión de procesos operativos y control de calidad',
      requirements: ['Ingeniería Industrial', 'Liderazgo', 'Gestión de procesos'],
      responsibilities: ['Supervisión equipos', 'Control calidad', 'Optimización procesos'],
      salaryRange: { min: 45000, max: 65000 },
      level: 'senior',
      employeeCount: 6,
      status: 'active',
      createdAt: '2024-03-01'
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    requirements: '',
    responsibilities: '',
    salaryMin: 0,
    salaryMax: 0,
    level: 'junior' as 'junior' | 'mid' | 'senior' | 'executive',
    status: 'active' as 'active' | 'inactive'
  });

  const departments = [...new Set(positions.map(p => p.department))];

  const filteredPositions = positions.filter(position => {
    const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         position.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || position.department === departmentFilter;
    const matchesLevel = levelFilter === 'all' || position.level === levelFilter;
    return matchesSearch && matchesDepartment && matchesLevel;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const requirementsArray = formData.requirements.split(',').map(r => r.trim()).filter(r => r);
    const responsibilitiesArray = formData.responsibilities.split(',').map(r => r.trim()).filter(r => r);
    
    if (editingPosition) {
      setPositions(prev => prev.map(position => 
        position.id === editingPosition.id 
          ? { 
              ...position, 
              ...formData,
              requirements: requirementsArray,
              responsibilities: responsibilitiesArray,
              salaryRange: { min: formData.salaryMin, max: formData.salaryMax }
            }
          : position
      ));
    } else {
      const newPosition: Position = {
        id: Date.now().toString(),
        title: formData.title,
        department: formData.department,
        description: formData.description,
        requirements: requirementsArray,
        responsibilities: responsibilitiesArray,
        salaryRange: { min: formData.salaryMin, max: formData.salaryMax },
        level: formData.level,
        employeeCount: 0,
        status: formData.status,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setPositions(prev => [...prev, newPosition]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      description: '',
      requirements: '',
      responsibilities: '',
      salaryMin: 0,
      salaryMax: 0,
      level: 'junior',
      status: 'active'
    });
    setEditingPosition(null);
    setShowForm(false);
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      title: position.title,
      department: position.department,
      description: position.description,
      requirements: position.requirements.join(', '),
      responsibilities: position.responsibilities.join(', '),
      salaryMin: position.salaryRange.min,
      salaryMax: position.salaryRange.max,
      level: position.level,
      status: position.status
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta posición?')) {
      setPositions(prev => prev.filter(position => position.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setPositions(prev => prev.map(position => 
      position.id === id 
        ? { ...position, status: position.status === 'active' ? 'inactive' : 'active' }
        : position
    ));
  };

  const downloadExcel = () => {
    let csvContent = 'Cargos y Posiciones\\n';
    csvContent += `Generado: ${new Date().toLocaleDateString()}\\n\\n`;
    csvContent += 'Título,Departamento,Nivel,Salario Mín,Salario Máx,Empleados,Estado\\n';
    
    filteredPositions.forEach(position => {
      const row = [
        `"${position.title}"`,
        `"${position.department}"`,
        position.level,
        position.salaryRange.min.toLocaleString(),
        position.salaryRange.max.toLocaleString(),
        position.employeeCount,
        position.status === 'active' ? 'Activo' : 'Inactivo'
      ].join(',');
      csvContent += row + '\\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `posiciones_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getLevelBadge = (level: string) => {
    const badges = {
      junior: 'bg-green-100 text-green-800',
      mid: 'bg-blue-100 text-blue-800',
      senior: 'bg-purple-100 text-purple-800',
      executive: 'bg-red-100 text-red-800'
    };
    return badges[level as keyof typeof badges] || badges.junior;
  };

  const getLevelText = (level: string) => {
    const texts = {
      junior: 'Junior',
      mid: 'Intermedio',
      senior: 'Senior',
      executive: 'Ejecutivo'
    };
    return texts[level as keyof typeof texts] || 'Junior';
  };

  const totalEmployees = positions.reduce((sum, pos) => sum + pos.employeeCount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cargos / Posiciones</h1>
            <p className="text-gray-600">Gestiona los cargos y posiciones de la empresa</p>
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
              Nueva Posición
            </button>
          </div>
        </div>

        {/* Filtros */}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por título o departamento..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departamento
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los departamentos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nivel
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los niveles</option>
                <option value="junior">Junior</option>
                <option value="mid">Intermedio</option>
                <option value="senior">Senior</option>
                <option value="executive">Ejecutivo</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDepartmentFilter('all');
                  setLevelFilter('all');
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
                <p className="text-sm font-medium text-gray-600">Total Posiciones</p>
                <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-briefcase-line text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Empleados Asignados</p>
                <p className="text-2xl font-bold text-green-600">{totalEmployees}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-team-line text-green-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Posiciones Activas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {positions.filter(p => p.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-check-line text-purple-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departamentos</p>
                <p className="text-2xl font-bold text-orange-600">{departments.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-building-line text-orange-600 text-xl"></i>
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
                    Posición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rango Salarial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleados
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
                {filteredPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{position.title}</div>
                        <div className="text-sm text-gray-500">{position.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{position.department}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelBadge(position.level)}`}>
                        {getLevelText(position.level)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${position.salaryRange.min.toLocaleString()} - ${position.salaryRange.max.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{position.employeeCount}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        position.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {position.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(position)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Editar"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => toggleStatus(position.id)}
                          className={`transition-colors ${
                            position.status === 'active' 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={position.status === 'active' ? 'Desactivar' : 'Activar'}
                        >
                          <i className={position.status === 'active' ? 'ri-pause-line' : 'ri-play-line'}></i>
                        </button>
                        <button
                          onClick={() => handleDelete(position.id)}
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
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPosition ? 'Editar Posición' : 'Nueva Posición'}
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
                      Título de la Posición *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departamento *
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Requisitos (separados por comas)
                    </label>
                    <textarea
                      value={formData.requirements}
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                      rows={3}
                      placeholder="Licenciatura en..., 3+ años experiencia, Conocimiento en..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsabilidades (separadas por comas)
                    </label>
                    <textarea
                      value={formData.responsibilities}
                      onChange={(e) => setFormData({...formData, responsibilities: e.target.value})}
                      rows={3}
                      placeholder="Gestión de equipos, Análisis de datos, Reportes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salario Mínimo
                    </label>
                    <input
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData({...formData, salaryMin: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salario Máximo
                    </label>
                    <input
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData({...formData, salaryMax: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nivel
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({...formData, level: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="junior">Junior</option>
                      <option value="mid">Intermedio</option>
                      <option value="senior">Senior</option>
                      <option value="executive">Ejecutivo</option>
                    </select>
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
                    {editingPosition ? 'Actualizar' : 'Crear'} Posición
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
