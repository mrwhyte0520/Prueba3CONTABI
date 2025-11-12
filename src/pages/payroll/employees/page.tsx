import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';

interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  identification: string;
  department_id: string;
  position_id: string;
  employee_type_id: string;
  salary_type_id: string;
  base_salary: number;
  hire_date: string;
  birth_date: string;
  gender: 'M' | 'F';
  marital_status: 'single' | 'married' | 'divorced' | 'widowed';
  address: string;
  bank_account: string;
  bank_name: string;
  emergency_contact: string;
  emergency_phone: string;
  status: 'active' | 'inactive' | 'suspended';
  photo_url?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  title: string;
  department_id: string;
}

interface EmployeeType {
  id: string;
  name: string;
  description: string;
}

interface SalaryType {
  id: string;
  name: string;
  description: string;
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [salaryTypes, setSalaryTypes] = useState<SalaryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    // Mock data
    const mockDepartments: Department[] = [
      { id: '1', name: 'Recursos Humanos' },
      { id: '2', name: 'Contabilidad' },
      { id: '3', name: 'Ventas' },
      { id: '4', name: 'Tecnología' },
      { id: '5', name: 'Administración' }
    ];

    const mockPositions: Position[] = [
      { id: '1', title: 'Gerente de RRHH', department_id: '1' },
      { id: '2', title: 'Especialista en RRHH', department_id: '1' },
      { id: '3', title: 'Contador Senior', department_id: '2' },
      { id: '4', title: 'Asistente Contable', department_id: '2' },
      { id: '5', title: 'Gerente de Ventas', department_id: '3' },
      { id: '6', title: 'Ejecutivo de Ventas', department_id: '3' },
      { id: '7', title: 'Desarrollador Senior', department_id: '4' },
      { id: '8', title: 'Analista de Sistemas', department_id: '4' },
      { id: '9', title: 'Asistente Administrativo', department_id: '5' }
    ];

    const mockEmployeeTypes: EmployeeType[] = [
      { id: '1', name: 'Tiempo Completo', description: 'Empleado de tiempo completo' },
      { id: '2', name: 'Medio Tiempo', description: 'Empleado de medio tiempo' },
      { id: '3', name: 'Temporal', description: 'Empleado temporal' },
      { id: '4', name: 'Contratista', description: 'Contratista independiente' }
    ];

    const mockSalaryTypes: SalaryType[] = [
      { id: '1', name: 'Salario Fijo', description: 'Salario mensual fijo' },
      { id: '2', name: 'Por Horas', description: 'Pago por horas trabajadas' },
      { id: '3', name: 'Comisión', description: 'Pago por comisiones' },
      { id: '4', name: 'Mixto', description: 'Salario base más comisiones' }
    ];

    const mockEmployees: Employee[] = [
      {
        id: '1',
        employee_code: 'EMP001',
        first_name: 'María',
        last_name: 'González',
        email: 'maria.gonzalez@empresa.com',
        phone: '809-555-0101',
        identification: '001-1234567-8',
        department_id: '1',
        position_id: '1',
        employee_type_id: '1',
        salary_type_id: '1',
        base_salary: 95000,
        hire_date: '2022-01-15',
        birth_date: '1985-03-20',
        gender: 'F',
        marital_status: 'married',
        address: 'Av. 27 de Febrero #123, Santo Domingo',
        bank_account: '1234567890',
        bank_name: 'Banco Popular',
        emergency_contact: 'Juan González',
        emergency_phone: '809-555-0102',
        status: 'active'
      },
      {
        id: '2',
        employee_code: 'EMP002',
        first_name: 'Carlos',
        last_name: 'Rodríguez',
        email: 'carlos.rodriguez@empresa.com',
        phone: '809-555-0201',
        identification: '001-2345678-9',
        department_id: '2',
        position_id: '3',
        employee_type_id: '1',
        salary_type_id: '1',
        base_salary: 75000,
        hire_date: '2021-03-10',
        birth_date: '1980-07-15',
        gender: 'M',
        marital_status: 'single',
        address: 'Calle Mercedes #456, Santiago',
        bank_account: '2345678901',
        bank_name: 'Banco BHD',
        emergency_contact: 'Ana Rodríguez',
        emergency_phone: '809-555-0202',
        status: 'active'
      },
      {
        id: '3',
        employee_code: 'EMP003',
        first_name: 'Ana',
        last_name: 'Martínez',
        email: 'ana.martinez@empresa.com',
        phone: '809-555-0301',
        identification: '001-3456789-0',
        department_id: '3',
        position_id: '5',
        employee_type_id: '1',
        salary_type_id: '4',
        base_salary: 60000,
        hire_date: '2020-06-20',
        birth_date: '1988-11-08',
        gender: 'F',
        marital_status: 'divorced',
        address: 'Av. Independencia #789, Santo Domingo',
        bank_account: '3456789012',
        bank_name: 'Banco Reservas',
        emergency_contact: 'Pedro Martínez',
        emergency_phone: '809-555-0302',
        status: 'active'
      },
      {
        id: '4',
        employee_code: 'EMP004',
        first_name: 'Luis',
        last_name: 'Fernández',
        email: 'luis.fernandez@empresa.com',
        phone: '809-555-0401',
        identification: '001-4567890-1',
        department_id: '4',
        position_id: '7',
        employee_type_id: '1',
        salary_type_id: '1',
        base_salary: 80000,
        hire_date: '2021-09-05',
        birth_date: '1990-02-14',
        gender: 'M',
        marital_status: 'married',
        address: 'Calle El Conde #321, Santo Domingo',
        bank_account: '4567890123',
        bank_name: 'Banco Popular',
        emergency_contact: 'Carmen Fernández',
        emergency_phone: '809-555-0402',
        status: 'active'
      },
      {
        id: '5',
        employee_code: 'EMP005',
        first_name: 'Carmen',
        last_name: 'López',
        email: 'carmen.lopez@empresa.com',
        phone: '809-555-0501',
        identification: '001-5678901-2',
        department_id: '1',
        position_id: '2',
        employee_type_id: '2',
        salary_type_id: '2',
        base_salary: 25,
        hire_date: '2022-11-12',
        birth_date: '1992-09-30',
        gender: 'F',
        marital_status: 'single',
        address: 'Av. Máximo Gómez #654, Santo Domingo',
        bank_account: '5678901234',
        bank_name: 'Banco BHD',
        emergency_contact: 'Miguel López',
        emergency_phone: '809-555-0502',
        status: 'active'
      }
    ];

    setDepartments(mockDepartments);
    setPositions(mockPositions);
    setEmployeeTypes(mockEmployeeTypes);
    setSalaryTypes(mockSalaryTypes);
    setEmployees(mockEmployees);
  };

  const handleOpenModal = (type: string, employee: Employee | null = null) => {
    setModalType(type);
    setSelectedEmployee(employee);
    setFormData(employee || {
      gender: 'M',
      marital_status: 'single',
      status: 'active',
      employee_type_id: '1',
      salary_type_id: '1'
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedEmployee(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedEmployee) {
        setEmployees(prev => prev.map(emp => 
          emp.id === selectedEmployee.id ? { ...emp, ...formData } : emp
        ));
      } else {
        const newEmployee: Employee = {
          ...formData,
          id: Date.now().toString(),
          employee_code: `EMP${String(employees.length + 1).padStart(3, '0')}`
        };
        setEmployees(prev => [...prev, newEmployee]);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este empleado?')) return;
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.identification.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === '' || employee.department_id === filterDepartment;
    const matchesStatus = filterStatus === '' || employee.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getDepartmentName = (id: string) => {
    return departments.find(dept => dept.id === id)?.name || 'N/A';
  };

  const getPositionTitle = (id: string) => {
    return positions.find(pos => pos.id === id)?.title || 'N/A';
  };

  const getEmployeeTypeName = (id: string) => {
    return employeeTypes.find(type => type.id === id)?.name || 'N/A';
  };

  const getSalaryTypeName = (id: string) => {
    return salaryTypes.find(type => type.id === id)?.name || 'N/A';
  };

  const exportToExcel = () => {
    const csvContent = [
      'Listado de Empleados',
      `Generado: ${new Date().toLocaleDateString()}`,
      '',
      'Código,Nombre,Email,Teléfono,Identificación,Departamento,Posición,Tipo Empleado,Tipo Salario,Salario Base,Fecha Contratación,Estado',
      ...filteredEmployees.map(emp => [
        emp.employee_code,
        `"${emp.first_name} ${emp.last_name}"`,
        emp.email,
        emp.phone,
        emp.identification,
        `"${getDepartmentName(emp.department_id)}"`,
        `"${getPositionTitle(emp.position_id)}"`,
        `"${getEmployeeTypeName(emp.employee_type_id)}"`,
        `"${getSalaryTypeName(emp.salary_type_id)}"`,
        emp.base_salary,
        emp.hire_date,
        emp.status
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `empleados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleBulkAction = (action: string) => {
    if (selectedEmployees.length === 0) {
      alert('Seleccione al menos un empleado');
      return;
    }

    if (!confirm(`¿Está seguro de que desea ${action} ${selectedEmployees.length} empleado(s)?`)) return;

    if (action === 'activar') {
      setEmployees(prev => prev.map(emp => 
        selectedEmployees.includes(emp.id) ? { ...emp, status: 'active' } : emp
      ));
    } else if (action === 'desactivar') {
      setEmployees(prev => prev.map(emp => 
        selectedEmployees.includes(emp.id) ? { ...emp, status: 'inactive' } : emp
      ));
    } else if (action === 'suspender') {
      setEmployees(prev => prev.map(emp => 
        selectedEmployees.includes(emp.id) ? { ...emp, status: 'suspended' } : emp
      ));
    }

    setSelectedEmployees([]);
  };

  const renderModal = () => {
    if (!showModal) return null;

    if (modalType === 'details') {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Detalles del Empleado</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {selectedEmployee && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Personal</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Código</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.employee_code}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Estado</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedEmployee.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedEmployee.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedEmployee.status === 'active' ? 'Activo' :
                         selectedEmployee.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.first_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Apellido</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Identificación</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.identification}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
                      <p className="text-sm text-gray-900">{new Date(selectedEmployee.birth_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Género</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.gender === 'M' ? 'Masculino' : 'Femenino'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Estado Civil</label>
                      <p className="text-sm text-gray-900">
                        {selectedEmployee.marital_status === 'single' ? 'Soltero(a)' :
                         selectedEmployee.marital_status === 'married' ? 'Casado(a)' :
                         selectedEmployee.marital_status === 'divorced' ? 'Divorciado(a)' : 'Viudo(a)'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                    <p className="text-sm text-gray-900">{selectedEmployee.address}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Laboral</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Departamento</label>
                      <p className="text-sm text-gray-900">{getDepartmentName(selectedEmployee.department_id)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Posición</label>
                      <p className="text-sm text-gray-900">{getPositionTitle(selectedEmployee.position_id)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipo de Empleado</label>
                      <p className="text-sm text-gray-900">{getEmployeeTypeName(selectedEmployee.employee_type_id)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipo de Salario</label>
                      <p className="text-sm text-gray-900">{getSalaryTypeName(selectedEmployee.salary_type_id)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Salario Base</label>
                      <p className="text-sm text-gray-900">
                        {selectedEmployee.salary_type_id === '2' ? 
                          `RD$${selectedEmployee.base_salary}/hora` : 
                          `RD$${selectedEmployee.base_salary.toLocaleString()}`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Contratación</label>
                      <p className="text-sm text-gray-900">{new Date(selectedEmployee.hire_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2 mt-6">Información de Contacto</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contacto de Emergencia</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.emergency_contact}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono de Emergencia</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.emergency_phone}</p>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2 mt-6">Información Bancaria</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Banco</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.bank_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Número de Cuenta</label>
                      <p className="text-sm text-gray-900">{selectedEmployee.bank_account}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {selectedEmployee ? 'Editar' : 'Agregar'} Empleado
            </h3>
            <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Personal</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                    <input
                      type="text"
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Identificación *</label>
                    <input
                      type="text"
                      value={formData.identification || ''}
                      onChange={(e) => setFormData({...formData, identification: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="001-1234567-8"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={formData.birth_date || ''}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                    <select
                      value={formData.gender || 'M'}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                    <select
                      value={formData.marital_status || 'single'}
                      onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single">Soltero(a)</option>
                      <option value="married">Casado(a)</option>
                      <option value="divorced">Divorciado(a)</option>
                      <option value="widowed">Viudo(a)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>

              {/* Información Laboral */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Laboral</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
                    <select
                      value={formData.department_id || ''}
                      onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar departamento</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Posición *</label>
                    <select
                      value={formData.position_id || ''}
                      onChange={(e) => setFormData({...formData, position_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar posición</option>
                      {positions.filter(pos => !formData.department_id || pos.department_id === formData.department_id).map(pos => (
                        <option key={pos.id} value={pos.id}>{pos.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Empleado *</label>
                    <select
                      value={formData.employee_type_id || ''}
                      onChange={(e) => setFormData({...formData, employee_type_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar tipo</option>
                      {employeeTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Salario *</label>
                    <select
                      value={formData.salary_type_id || ''}
                      onChange={(e) => setFormData({...formData, salary_type_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccionar tipo</option>
                      {salaryTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salario Base * {formData.salary_type_id === '2' ? '(por hora)' : '(mensual)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_salary || ''}
                      onChange={(e) => setFormData({...formData, base_salary: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Contratación *</label>
                    <input
                      type="date"
                      value={formData.hire_date || ''}
                      onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información de Contacto</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de Emergencia</label>
                    <input
                      type="text"
                      value={formData.emergency_contact || ''}
                      onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Emergencia</label>
                    <input
                      type="tel"
                      value={formData.emergency_phone || ''}
                      onChange={(e) => setFormData({...formData, emergency_phone: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Bancaria</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                    <select
                      value={formData.bank_name || ''}
                      onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar banco</option>
                      <option value="Banco Popular">Banco Popular</option>
                      <option value="Banco BHD">Banco BHD</option>
                      <option value="Banco Reservas">Banco Reservas</option>
                      <option value="Banco León">Banco León</option>
                      <option value="Banco Promerica">Banco Promerica</option>
                      <option value="Banco Santa Cruz">Banco Santa Cruz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                    <input
                      type="text"
                      value={formData.bank_account || ''}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {loading ? 'Guardando...' : (selectedEmployee ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Empleados</h1>
          <p className="text-gray-600">Administrar información completa de empleados</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Volver a Nóminas</span>
          </button>
          <button
            onClick={() => handleOpenModal('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Agregar Empleado
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="Buscar empleados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los departamentos</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
          <div>
            <button
              onClick={exportToExcel}
              className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-download-line mr-2"></i>
              Exportar
            </button>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Mostrando {filteredEmployees.length} de {employees.length} empleados
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedEmployees.length} empleado(s) seleccionado(s)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('activar')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Activar
              </button>
              <button
                onClick={() => handleBulkAction('suspender')}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Suspender
              </button>
              <button
                onClick={() => handleBulkAction('desactivar')}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees(filteredEmployees.map(emp => emp.id));
                      } else {
                        setSelectedEmployees([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees(prev => [...prev, employee.id]);
                        } else {
                          setSelectedEmployees(prev => prev.filter(id => id !== employee.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.employee_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.identification}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.email}</div>
                    <div className="text-sm text-gray-500">{employee.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getDepartmentName(employee.department_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPositionTitle(employee.position_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.salary_type_id === '2' ? 
                      `RD$${employee.base_salary}/h` : 
                      `RD$${employee.base_salary.toLocaleString()}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 'active' ? 'bg-green-100 text-green-800' :
                      employee.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employee.status === 'active' ? 'Activo' :
                       employee.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleOpenModal('edit', employee)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button
                      onClick={() => handleOpenModal('details', employee)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <i className="ri-eye-line"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
}