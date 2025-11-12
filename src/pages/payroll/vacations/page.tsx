
import { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

interface VacationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  vacationType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'personal' | 'compensatory';
  status: 'pending' | 'approved' | 'rejected' | 'taken';
  reason: string;
  approvedBy?: string;
  approvedDate?: string;
  requestDate: string;
  remainingDays: number;
  paidDays: number;
}

const mockVacationRequests: VacationRequest[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'María González',
    department: 'Recursos Humanos',
    position: 'Especialista RRHH',
    startDate: '2024-03-15',
    endDate: '2024-03-22',
    totalDays: 8,
    vacationType: 'annual',
    status: 'approved',
    reason: 'Vacaciones familiares',
    approvedBy: 'Carlos Méndez',
    approvedDate: '2024-02-28',
    requestDate: '2024-02-25',
    remainingDays: 12,
    paidDays: 8
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'Juan Pérez',
    department: 'Ventas',
    position: 'Ejecutivo de Ventas',
    startDate: '2024-03-10',
    endDate: '2024-03-12',
    totalDays: 3,
    vacationType: 'sick',
    status: 'approved',
    reason: 'Enfermedad común',
    approvedBy: 'Ana Rodríguez',
    approvedDate: '2024-03-09',
    requestDate: '2024-03-09',
    remainingDays: 18,
    paidDays: 3
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'Carmen Jiménez',
    department: 'Contabilidad',
    position: 'Contadora',
    startDate: '2024-04-01',
    endDate: '2024-04-05',
    totalDays: 5,
    vacationType: 'personal',
    status: 'pending',
    reason: 'Asuntos personales',
    requestDate: '2024-02-20',
    remainingDays: 15,
    paidDays: 0
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'Roberto Silva',
    department: 'IT',
    position: 'Desarrollador',
    startDate: '2024-05-15',
    endDate: '2024-06-15',
    totalDays: 32,
    vacationType: 'paternity',
    status: 'approved',
    reason: 'Licencia de paternidad',
    approvedBy: 'Luis Torres',
    approvedDate: '2024-02-15',
    requestDate: '2024-02-10',
    remainingDays: 8,
    paidDays: 15
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'Ana Martínez',
    department: 'Marketing',
    position: 'Coordinadora',
    startDate: '2024-03-25',
    endDate: '2024-03-29',
    totalDays: 5,
    vacationType: 'compensatory',
    status: 'rejected',
    reason: 'Días compensatorios por horas extras',
    requestDate: '2024-03-01',
    remainingDays: 20,
    paidDays: 0
  }
];

export default function VacationsPage() {
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>(mockVacationRequests);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<VacationRequest | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    startDate: '',
    endDate: '',
    vacationType: 'annual' as const,
    reason: ''
  });

  const filteredRequests = vacationRequests.filter(request => {
    const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesType = filterType === 'all' || request.vacationType === filterType;
    const matchesDepartment = filterDepartment === 'all' || request.department === filterDepartment;
    
    return matchesSearch && matchesStatus && matchesType && matchesDepartment;
  });

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalDays = calculateDays(formData.startDate, formData.endDate);
    
    const newRequest: VacationRequest = {
      id: editingRequest?.id || Date.now().toString(),
      ...formData,
      totalDays,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0],
      remainingDays: 20, // Default value
      paidDays: 0
    };

    if (editingRequest) {
      setVacationRequests(prev => prev.map(request => 
        request.id === editingRequest.id ? { ...editingRequest, ...newRequest } : request
      ));
    } else {
      setVacationRequests(prev => [...prev, newRequest]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      startDate: '',
      endDate: '',
      vacationType: 'annual',
      reason: ''
    });
    setShowForm(false);
    setEditingRequest(null);
  };

  const handleEdit = (request: VacationRequest) => {
    setEditingRequest(request);
    setFormData({
      employeeId: request.employeeId,
      employeeName: request.employeeName,
      department: request.department,
      position: request.position,
      startDate: request.startDate,
      endDate: request.endDate,
      vacationType: request.vacationType,
      reason: request.reason
    });
    setShowForm(true);
  };

  const updateStatus = (id: string, status: 'approved' | 'rejected') => {
    setVacationRequests(prev => prev.map(request =>
      request.id === id ? { 
        ...request, 
        status,
        approvedBy: status === 'approved' ? 'Sistema' : undefined,
        approvedDate: status === 'approved' ? new Date().toISOString().split('T')[0] : undefined,
        paidDays: status === 'approved' ? request.totalDays : 0
      } : request
    ));
  };

  const exportToCSV = () => {
    const headers = ['Empleado', 'Departamento', 'Tipo', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Estado', 'Motivo'];
    const csvData = filteredRequests.map(request => [
      request.employeeName,
      request.department,
      request.vacationType === 'annual' ? 'Anuales' : 
      request.vacationType === 'sick' ? 'Enfermedad' : 
      request.vacationType === 'maternity' ? 'Maternidad' : 
      request.vacationType === 'paternity' ? 'Paternidad' : 
      request.vacationType === 'personal' ? 'Personales' : 'Compensatorias',
      request.startDate,
      request.endDate,
      request.totalDays.toString(),
      request.status === 'pending' ? 'Pendiente' : 
      request.status === 'approved' ? 'Aprobado' : 
      request.status === 'rejected' ? 'Rechazado' : 'Tomado',
      request.reason
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'solicitudes_vacaciones.csv';
    link.click();
  };

  const pendingRequests = vacationRequests.filter(r => r.status === 'pending').length;
  const approvedRequests = vacationRequests.filter(r => r.status === 'approved').length;
  const totalDaysRequested = vacationRequests.reduce((sum, r) => sum + r.totalDays, 0);
  const departments = [...new Set(vacationRequests.map(r => r.department))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Vacaciones</h1>
            <p className="text-gray-600">Administra las solicitudes de vacaciones y permisos</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nueva Solicitud
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-calendar-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Solicitudes</p>
                <p className="text-2xl font-bold text-gray-900">{vacationRequests.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <i className="ri-time-line text-yellow-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{pendingRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-bold text-gray-900">{approvedRequests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <i className="ri-calendar-check-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Días</p>
                <p className="text-2xl font-bold text-gray-900">{totalDaysRequested}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar empleado..."
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
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
                <option value="taken">Tomado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="all">Todos</option>
                <option value="annual">Anuales</option>
                <option value="sick">Enfermedad</option>
                <option value="maternity">Maternidad</option>
                <option value="paternity">Paternidad</option>
                <option value="personal">Personales</option>
                <option value="compensatory">Compensatorias</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="all">Todos</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
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

        {/* Vacation Requests Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días
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
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.employeeName}</div>
                        <div className="text-sm text-gray-500">{request.employeeId} - {request.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.vacationType === 'annual' ? 'bg-blue-100 text-blue-800' :
                        request.vacationType === 'sick' ? 'bg-red-100 text-red-800' :
                        request.vacationType === 'maternity' ? 'bg-pink-100 text-pink-800' :
                        request.vacationType === 'paternity' ? 'bg-indigo-100 text-indigo-800' :
                        request.vacationType === 'personal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {request.vacationType === 'annual' ? 'Anuales' :
                         request.vacationType === 'sick' ? 'Enfermedad' :
                         request.vacationType === 'maternity' ? 'Maternidad' :
                         request.vacationType === 'paternity' ? 'Paternidad' :
                         request.vacationType === 'personal' ? 'Personales' : 'Compensatorias'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{request.startDate}</div>
                      <div className="text-gray-500">al {request.endDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">{request.totalDays} días</div>
                      <div className="text-gray-500">Pagados: {request.paidDays}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {request.status === 'pending' ? 'Pendiente' :
                         request.status === 'approved' ? 'Aprobado' :
                         request.status === 'rejected' ? 'Rechazado' : 'Tomado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(request)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(request.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button
                              onClick={() => updateStatus(request.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        )}
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
                    {editingRequest ? 'Editar Solicitud' : 'Nueva Solicitud de Vacaciones'}
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
                        ID Empleado *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.employeeId}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="EMP001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Empleado *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.employeeName}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre completo"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Departamento *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Departamento"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Posición *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Cargo"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Vacación *
                    </label>
                    <select
                      required
                      value={formData.vacationType}
                      onChange={(e) => setFormData(prev => ({ ...prev, vacationType: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                    >
                      <option value="annual">Vacaciones Anuales</option>
                      <option value="sick">Licencia por Enfermedad</option>
                      <option value="maternity">Licencia de Maternidad</option>
                      <option value="paternity">Licencia de Paternidad</option>
                      <option value="personal">Permiso Personal</option>
                      <option value="compensatory">Días Compensatorios</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Inicio *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
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
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {formData.startDate && formData.endDate && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Total de días solicitados:</strong> {calculateDays(formData.startDate, formData.endDate)} días
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo *
                    </label>
                    <textarea
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe el motivo de la solicitud..."
                    />
                  </div>

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
                      {editingRequest ? 'Actualizar' : 'Crear'} Solicitud
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
