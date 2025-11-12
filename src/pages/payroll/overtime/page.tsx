
import { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

interface OvertimeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  overtimeType: 'regular' | 'night' | 'holiday' | 'sunday';
  hourlyRate: number;
  overtimeRate: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedDate?: string;
  reason: string;
  createdAt: string;
}

const mockOvertimeRecords: OvertimeRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'María González',
    department: 'Producción',
    position: 'Operadora',
    date: '2024-03-15',
    startTime: '18:00',
    endTime: '22:00',
    totalHours: 4,
    overtimeType: 'regular',
    hourlyRate: 250,
    overtimeRate: 1.5,
    totalAmount: 1500,
    status: 'approved',
    approvedBy: 'Carlos Méndez',
    approvedDate: '2024-03-16',
    reason: 'Cumplimiento de pedido urgente',
    createdAt: '2024-03-15'
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'Juan Pérez',
    department: 'Mantenimiento',
    position: 'Técnico',
    date: '2024-03-14',
    startTime: '22:00',
    endTime: '06:00',
    totalHours: 8,
    overtimeType: 'night',
    hourlyRate: 300,
    overtimeRate: 2.0,
    totalAmount: 4800,
    status: 'approved',
    approvedBy: 'Ana Rodríguez',
    approvedDate: '2024-03-15',
    reason: 'Mantenimiento preventivo nocturno',
    createdAt: '2024-03-14'
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'Carmen Jiménez',
    department: 'Ventas',
    position: 'Ejecutiva',
    date: '2024-03-17',
    startTime: '08:00',
    endTime: '14:00',
    totalHours: 6,
    overtimeType: 'sunday',
    hourlyRate: 280,
    overtimeRate: 2.0,
    totalAmount: 3360,
    status: 'pending',
    reason: 'Evento especial de ventas',
    createdAt: '2024-03-17'
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'Roberto Silva',
    department: 'IT',
    position: 'Desarrollador',
    date: '2024-03-25',
    startTime: '08:00',
    endTime: '18:00',
    totalHours: 10,
    overtimeType: 'holiday',
    hourlyRate: 400,
    overtimeRate: 2.5,
    totalAmount: 10000,
    status: 'approved',
    approvedBy: 'Luis Torres',
    approvedDate: '2024-03-26',
    reason: 'Soporte crítico en día feriado',
    createdAt: '2024-03-25'
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'Ana Martínez',
    department: 'Contabilidad',
    position: 'Contadora',
    date: '2024-03-20',
    startTime: '17:00',
    endTime: '20:00',
    totalHours: 3,
    overtimeType: 'regular',
    hourlyRate: 350,
    overtimeRate: 1.5,
    totalAmount: 1575,
    status: 'rejected',
    reason: 'Cierre mensual de contabilidad',
    createdAt: '2024-03-20'
  }
];

export default function OvertimePage() {
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>(mockOvertimeRecords);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    date: '',
    startTime: '',
    endTime: '',
    overtimeType: 'regular' as const,
    hourlyRate: 0,
    reason: ''
  });

  const filteredRecords = overtimeRecords.filter(record => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    const matchesType = filterType === 'all' || record.overtimeType === filterType;
    const matchesDepartment = filterDepartment === 'all' || record.department === filterDepartment;
    
    return matchesSearch && matchesStatus && matchesType && matchesDepartment;
  });

  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2024-01-01T${startTime}:00`);
    let end = new Date(`2024-01-01T${endTime}:00`);
    
    // Si la hora de fin es menor que la de inicio, asumimos que es del día siguiente
    if (end < start) {
      end = new Date(`2024-01-02T${endTime}:00`);
    }
    
    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const getOvertimeRate = (type: string): number => {
    switch (type) {
      case 'regular': return 1.5;
      case 'night': return 2.0;
      case 'holiday': return 2.5;
      case 'sunday': return 2.0;
      default: return 1.5;
    }
  };

  const calculateAmount = (hours: number, hourlyRate: number, overtimeRate: number): number => {
    return hours * hourlyRate * overtimeRate;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalHours = calculateHours(formData.startTime, formData.endTime);
    const overtimeRate = getOvertimeRate(formData.overtimeType);
    const totalAmount = calculateAmount(totalHours, formData.hourlyRate, overtimeRate);
    
    const newRecord: OvertimeRecord = {
      id: editingRecord?.id || Date.now().toString(),
      ...formData,
      totalHours,
      overtimeRate,
      totalAmount,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (editingRecord) {
      setOvertimeRecords(prev => prev.map(record => 
        record.id === editingRecord.id ? newRecord : record
      ));
    } else {
      setOvertimeRecords(prev => [...prev, newRecord]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      position: '',
      date: '',
      startTime: '',
      endTime: '',
      overtimeType: 'regular',
      hourlyRate: 0,
      reason: ''
    });
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleEdit = (record: OvertimeRecord) => {
    setEditingRecord(record);
    setFormData({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      department: record.department,
      position: record.position,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      overtimeType: record.overtimeType,
      hourlyRate: record.hourlyRate,
      reason: record.reason
    });
    setShowForm(true);
  };

  const updateStatus = (id: string, status: 'approved' | 'rejected') => {
    setOvertimeRecords(prev => prev.map(record =>
      record.id === id ? { 
        ...record, 
        status,
        approvedBy: status === 'approved' ? 'Sistema' : undefined,
        approvedDate: status === 'approved' ? new Date().toISOString().split('T')[0] : undefined
      } : record
    ));
  };

  const exportToCSV = () => {
    const headers = ['Empleado', 'Departamento', 'Fecha', 'Horas', 'Tipo', 'Tasa', 'Total', 'Estado'];
    const csvData = filteredRecords.map(record => [
      record.employeeName,
      record.department,
      record.date,
      record.totalHours.toString(),
      record.overtimeType === 'regular' ? 'Regular' : 
      record.overtimeType === 'night' ? 'Nocturno' : 
      record.overtimeType === 'holiday' ? 'Feriado' : 'Domingo',
      `${record.overtimeRate}x`,
      `$${record.totalAmount.toLocaleString()}`,
      record.status === 'pending' ? 'Pendiente' : 
      record.status === 'approved' ? 'Aprobado' : 
      record.status === 'rejected' ? 'Rechazado' : 'Pagado'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'horas_extras.csv';
    link.click();
  };

  const pendingRecords = overtimeRecords.filter(r => r.status === 'pending').length;
  const approvedRecords = overtimeRecords.filter(r => r.status === 'approved').length;
  const totalHours = overtimeRecords.reduce((sum, r) => sum + r.totalHours, 0);
  const totalAmount = overtimeRecords.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.totalAmount, 0);
  const departments = [...new Set(overtimeRecords.map(r => r.department))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Horas Extras</h1>
            <p className="text-gray-600">Administra el registro y aprobación de horas extras</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Registrar Horas
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-time-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Registros</p>
                <p className="text-2xl font-bold text-gray-900">{overtimeRecords.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <i className="ri-hourglass-line text-yellow-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{pendingRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Horas</p>
                <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <i className="ri-money-dollar-circle-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Aprobado</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
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
                <option value="paid">Pagado</option>
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
                <option value="regular">Regular</option>
                <option value="night">Nocturno</option>
                <option value="holiday">Feriado</option>
                <option value="sunday">Domingo</option>
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

        {/* Overtime Records Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Horario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo/Horas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cálculo
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
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                        <div className="text-sm text-gray-500">{record.employeeId} - {record.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.date}</div>
                      <div className="text-sm text-gray-500">{record.startTime} - {record.endTime}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.overtimeType === 'regular' ? 'bg-blue-100 text-blue-800' :
                          record.overtimeType === 'night' ? 'bg-purple-100 text-purple-800' :
                          record.overtimeType === 'holiday' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {record.overtimeType === 'regular' ? 'Regular' :
                           record.overtimeType === 'night' ? 'Nocturno' :
                           record.overtimeType === 'holiday' ? 'Feriado' : 'Domingo'}
                        </span>
                        <div className="text-sm text-gray-500 mt-1">{record.totalHours.toFixed(1)} horas</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${record.totalAmount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">${record.hourlyRate} × {record.overtimeRate}x</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        record.status === 'approved' ? 'bg-green-100 text-green-800' :
                        record.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {record.status === 'pending' ? 'Pendiente' :
                         record.status === 'approved' ? 'Aprobado' :
                         record.status === 'rejected' ? 'Rechazado' : 'Pagado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        {record.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(record.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button
                              onClick={() => updateStatus(record.id, 'rejected')}
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
                    {editingRecord ? 'Editar Registro' : 'Registrar Horas Extras'}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora Inicio *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora Fin *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Hora Extra *
                      </label>
                      <select
                        required
                        value={formData.overtimeType}
                        onChange={(e) => setFormData(prev => ({ ...prev, overtimeType: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                      >
                        <option value="regular">Regular (1.5x)</option>
                        <option value="night">Nocturno (2.0x)</option>
                        <option value="holiday">Feriado (2.5x)</option>
                        <option value="sunday">Domingo (2.0x)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tarifa por Hora ($) *
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="250.00"
                      />
                    </div>
                  </div>

                  {formData.startTime && formData.endTime && formData.hourlyRate > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-800">Horas:</span>
                          <p className="text-blue-600">{calculateHours(formData.startTime, formData.endTime).toFixed(1)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">Multiplicador:</span>
                          <p className="text-blue-600">{getOvertimeRate(formData.overtimeType)}x</p>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">Total:</span>
                          <p className="text-blue-600">
                            ${calculateAmount(
                              calculateHours(formData.startTime, formData.endTime),
                              formData.hourlyRate,
                              getOvertimeRate(formData.overtimeType)
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
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
                      placeholder="Describe el motivo de las horas extras..."
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
                      {editingRecord ? 'Actualizar' : 'Registrar'} Horas
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
