
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { exportToExcelStyled } from '../../../utils/exportImportUtils';
import { employeesService, vacationsService } from '../../../services/database';

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

interface EmployeeOption {
  id: string;
  code: string;
  name: string;
  department: string;
  position: string;
}

export default function VacationsPage() {
  const { user } = useAuth();
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
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
    vacationType: 'annual' as VacationRequest['vacationType'],
    reason: ''
  });

  useEffect(() => {
    const loadEmployees = async () => {
      if (!user) return;
      try {
        const data = await employeesService.getAll(user.id);
        const mapped: EmployeeOption[] = (data || []).map((e: any) => ({
          id: e.id,
          code: e.employee_code || e.identification || '',
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          department: e.departments?.name || '',
          position: e.positions?.title || '',
        }));
        setEmployees(mapped);
      } catch (error) {
        console.error('Error loading employees for vacations:', error);
      }
    };

    const loadRequests = async () => {
      if (!user) return;
      try {
        const data = await vacationsService.getAll(user.id);
        const mapped: VacationRequest[] = (data || []).map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          employeeName: r.employee_name,
          department: r.department,
          position: r.position,
          startDate: r.start_date,
          endDate: r.end_date,
          totalDays: r.total_days,
          vacationType: r.vacation_type,
          status: r.status,
          reason: r.reason,
          approvedBy: r.approved_by || undefined,
          approvedDate: r.approved_date || undefined,
          requestDate: r.request_date,
          remainingDays: r.remaining_days ?? 0,
          paidDays: r.paid_days ?? 0,
        }));
        setVacationRequests(mapped);
      } catch (error) {
        console.error('Error loading vacation requests:', error);
      }
    };

    loadEmployees();
    loadRequests();
  }, [user]);

  // Reactivar automáticamente empleados cuando termina el período de vacaciones
  useEffect(() => {
    if (!user) return;
    if (!vacationRequests.length) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const finished = vacationRequests.filter(r => r.status === 'approved' && r.endDate < todayStr);
    if (!finished.length) return;

    const processFinished = async () => {
      for (const req of finished) {
        try {
          await vacationsService.update(req.id, { status: 'taken' });
          const employee = employees.find(e => e.code === req.employeeId);
          if (employee) {
            await employeesService.setStatus(employee.id, 'active');
          }
        } catch (error) {
          console.error('Error auto-updating finished vacation:', error);
        }
      }

      setVacationRequests(prev => prev.map(r =>
        finished.some(f => f.id === r.id)
          ? { ...r, status: 'taken' }
          : r
      ));
    };

    processFinished();
  }, [user, vacationRequests, employees]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Debe iniciar sesión para gestionar vacaciones.');
      return;
    }

    const totalDays = calculateDays(formData.startDate, formData.endDate);

    const payload: any = {
      employee_id: formData.employeeId,
      employee_name: formData.employeeName,
      department: formData.department,
      position: formData.position,
      start_date: formData.startDate,
      end_date: formData.endDate,
      total_days: totalDays,
      vacation_type: formData.vacationType,
      status: editingRequest?.status ?? 'pending',
      reason: formData.reason,
      request_date: editingRequest?.requestDate ?? new Date().toISOString().split('T')[0],
      remaining_days: editingRequest?.remainingDays ?? 20,
      paid_days: editingRequest?.paidDays ?? 0,
      approved_by: editingRequest?.approvedBy ?? null,
      approved_date: editingRequest?.approvedDate ?? null,
    };

    try {
      if (editingRequest) {
        const updated = await vacationsService.update(editingRequest.id, payload);
        setVacationRequests(prev => prev.map(request =>
          request.id === editingRequest.id
            ? {
                id: updated.id,
                employeeId: updated.employee_id,
                employeeName: updated.employee_name,
                department: updated.department,
                position: updated.position,
                startDate: updated.start_date,
                endDate: updated.end_date,
                totalDays: updated.total_days,
                vacationType: updated.vacation_type,
                status: updated.status,
                reason: updated.reason,
                approvedBy: updated.approved_by || undefined,
                approvedDate: updated.approved_date || undefined,
                requestDate: updated.request_date,
                remainingDays: updated.remaining_days ?? 0,
                paidDays: updated.paid_days ?? 0,
              }
            : request
        ));
      } else {
        const created = await vacationsService.create(user.id, payload);
        const newRequest: VacationRequest = {
          id: created.id,
          employeeId: created.employee_id,
          employeeName: created.employee_name,
          department: created.department,
          position: created.position,
          startDate: created.start_date,
          endDate: created.end_date,
          totalDays: created.total_days,
          vacationType: created.vacation_type,
          status: created.status,
          reason: created.reason,
          approvedBy: created.approved_by || undefined,
          approvedDate: created.approved_date || undefined,
          requestDate: created.request_date,
          remainingDays: created.remaining_days ?? 0,
          paidDays: created.paid_days ?? 0,
        };
        setVacationRequests(prev => [...prev, newRequest]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving vacation request:', error);
      alert('Error al guardar la solicitud de vacaciones');
    }
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
    setSelectedEmployeeId('');
    setShowForm(false);
    setEditingRequest(null);
  };

  const handleEdit = (request: VacationRequest) => {
    setEditingRequest(request);
    const emp = employees.find(e => e.code === request.employeeId && e.name === request.employeeName);
    setSelectedEmployeeId(emp?.id || '');
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

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const current = vacationRequests.find(r => r.id === id);
    if (!current) return;

    const approvedBy = status === 'approved' ? 'Sistema' : null;
    const approvedDate = status === 'approved' ? new Date().toISOString().split('T')[0] : null;
    const paidDays = status === 'approved' ? current.totalDays : 0;

    try {
      await vacationsService.update(id, {
        status,
        approved_by: approvedBy,
        approved_date: approvedDate,
        paid_days: paidDays,
      });

      // Si se aprueba la solicitud, marcar al empleado como inactivo
      if (status === 'approved') {
        const employee = employees.find(e => e.code === current.employeeId);
        if (employee) {
          await employeesService.setStatus(employee.id, 'inactive');
        }
      }

      setVacationRequests(prev => prev.map(request =>
        request.id === id
          ? {
              ...request,
              status,
              approvedBy: approvedBy || undefined,
              approvedDate: approvedDate || undefined,
              paidDays,
            }
          : request
      ));
    } catch (error) {
      console.error('Error updating vacation status:', error);
      alert('Error al actualizar el estado de la solicitud');
    }
  };

  const exportToCSV = async () => {
    const today = new Date().toISOString().split('T')[0];

    const rows = filteredRequests.map(request => ({
      employee: request.employeeName,
      department: request.department,
      type:
        request.vacationType === 'annual' ? 'Anuales' :
        request.vacationType === 'sick' ? 'Enfermedad' :
        request.vacationType === 'maternity' ? 'Maternidad' :
        request.vacationType === 'paternity' ? 'Paternidad' :
        request.vacationType === 'personal' ? 'Personales' : 'Compensatorias',
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      status:
        request.status === 'pending' ? 'Pendiente' :
        request.status === 'approved' ? 'Aprobado' :
        request.status === 'rejected' ? 'Rechazado' : 'Tomado',
      reason: request.reason,
    }));

    if (!rows.length) {
      alert('No hay solicitudes para exportar.');
      return;
    }

    await exportToExcelStyled(
      rows,
      [
        { key: 'employee', title: 'Empleado', width: 26 },
        { key: 'department', title: 'Departamento', width: 22 },
        { key: 'type', title: 'Tipo', width: 18 },
        { key: 'startDate', title: 'Fecha Inicio', width: 16 },
        { key: 'endDate', title: 'Fecha Fin', width: 16 },
        { key: 'totalDays', title: 'Días', width: 10 },
        { key: 'status', title: 'Estado', width: 14 },
        { key: 'reason', title: 'Motivo', width: 40 },
      ],
      `solicitudes_vacaciones_${today}`,
      'Vacaciones'
    );
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar <span className="text-red-500">*</span></label>
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
                        Empleado *
                      </label>
                      <select
                        required
                        value={selectedEmployeeId}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedEmployeeId(value);
                          const emp = employees.find(emp => emp.id === value);
                          if (emp) {
                            setFormData(prev => ({
                              ...prev,
                              employeeId: emp.code,
                              employeeName: emp.name,
                              department: emp.department,
                              position: emp.position,
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar empleado...</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.code ? `${emp.code} - ${emp.name}` : emp.name}
                            {emp.department ? ` - ${emp.department}` : ''}
                            {emp.position ? ` / ${emp.position}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Empleado
                      </label>
                      <input
                        type="text"
                        value={formData.employeeId}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="EMP001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Departamento
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="Departamento"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Posición
                      </label>
                      <input
                        type="text"
                        value={formData.position}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
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
