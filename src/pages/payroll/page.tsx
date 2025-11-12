
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_id: string;
  position_id: string;
  salary: number;
  hire_date: string;
  status: 'active' | 'inactive';
  bank_account?: string;
  identification?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
  budget?: number;
  manager_id?: string;
}

interface Position {
  id: string;
  title: string;
  description: string;
  department_id: string;
  min_salary?: number;
  max_salary?: number;
  is_active: boolean;
}

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: 'open' | 'processing' | 'closed' | 'paid';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
}

interface PayrollEntry {
  id: string;
  employee_id: string;
  period_id: string;
  gross_salary: number;
  overtime_hours: number;
  overtime_amount: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
}

export default function PayrollPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    // Mock Departments
    const mockDepartments: Department[] = [
      { id: '1', name: 'Recursos Humanos', description: 'Gestión del talento humano', budget: 150000 },
      { id: '2', name: 'Contabilidad', description: 'Gestión financiera y contable', budget: 200000 },
      { id: '3', name: 'Ventas', description: 'Equipo comercial y ventas', budget: 300000 },
      { id: '4', name: 'Tecnología', description: 'Desarrollo y soporte técnico', budget: 250000 },
      { id: '5', name: 'Administración', description: 'Gestión administrativa general', budget: 120000 }
    ];

    // Mock Positions
    const mockPositions: Position[] = [
      { id: '1', title: 'Gerente de RRHH', description: 'Líder del departamento', department_id: '1', min_salary: 80000, max_salary: 120000, is_active: true },
      { id: '2', title: 'Especialista en RRHH', description: 'Especialista en recursos humanos', department_id: '1', min_salary: 45000, max_salary: 65000, is_active: true },
      { id: '3', title: 'Contador Senior', description: 'Contador principal', department_id: '2', min_salary: 60000, max_salary: 85000, is_active: true },
      { id: '4', title: 'Asistente Contable', description: 'Apoyo contable', department_id: '2', min_salary: 30000, max_salary: 45000, is_active: true },
      { id: '5', title: 'Gerente de Ventas', description: 'Líder del equipo comercial', department_id: '3', min_salary: 70000, max_salary: 100000, is_active: true },
      { id: '6', title: 'Ejecutivo de Ventas', description: 'Vendedor especializado', department_id: '3', min_salary: 35000, max_salary: 55000, is_active: true },
      { id: '7', title: 'Desarrollador Senior', description: 'Programador experimentado', department_id: '4', min_salary: 65000, max_salary: 95000, is_active: true },
      { id: '8', title: 'Analista de Sistemas', description: 'Análisis y diseño de sistemas', department_id: '4', min_salary: 50000, max_salary: 70000, is_active: true },
      { id: '9', title: 'Asistente Administrativo', description: 'Apoyo administrativo', department_id: '5', min_salary: 25000, max_salary: 35000, is_active: true }
    ];

    // Mock Employees
    const mockEmployees: Employee[] = [
      {
        id: '1', employee_code: 'EMP001', first_name: 'María', last_name: 'González',
        email: 'maria.gonzalez@empresa.com', phone: '809-555-0101', department_id: '1', position_id: '1',
        salary: 95000, hire_date: '2022-01-15', status: 'active',
        bank_account: '1234567890', identification: '001-1234567-8', address: 'Av. 27 de Febrero #123, Santo Domingo',
        emergency_contact: 'Juan González', emergency_phone: '809-555-0102'
      },
      {
        id: '2', employee_code: 'EMP002', first_name: 'Carlos', last_name: 'Rodríguez',
        email: 'carlos.rodriguez@empresa.com', phone: '809-555-0201', department_id: '2', position_id: '3',
        salary: 75000, hire_date: '2021-03-10', status: 'active',
        bank_account: '2345678901', identification: '001-2345678-9', address: 'Calle Mercedes #456, Santiago',
        emergency_contact: 'Ana Rodríguez', emergency_phone: '809-555-0202'
      },
      {
        id: '3', employee_code: 'EMP003', first_name: 'Ana', last_name: 'Martínez',
        email: 'ana.martinez@empresa.com', phone: '809-555-0301', department_id: '3', position_id: '5',
        salary: 85000, hire_date: '2020-06-20', status: 'active',
        bank_account: '3456789012', identification: '001-3456789-0', address: 'Av. Independencia #789, Santo Domingo',
        emergency_contact: 'Pedro Martínez', emergency_phone: '809-555-0302'
      },
      {
        id: '4', employee_code: 'EMP004', first_name: 'Luis', last_name: 'Fernández',
        email: 'luis.fernandez@empresa.com', phone: '809-555-0401', department_id: '4', position_id: '7',
        salary: 80000, hire_date: '2021-09-05', status: 'active',
        bank_account: '4567890123', identification: '001-4567890-1', address: 'Calle El Conde #321, Santo Domingo',
        emergency_contact: 'Carmen Fernández', emergency_phone: '809-555-0402'
      },
      {
        id: '5', employee_code: 'EMP005', first_name: 'Carmen', last_name: 'López',
        email: 'carmen.lopez@empresa.com', phone: '809-555-0501', department_id: '1', position_id: '2',
        salary: 55000, hire_date: '2022-11-12', status: 'active',
        bank_account: '5678901234', identification: '001-5678901-2', address: 'Av. Máximo Gómez #654, Santo Domingo',
        emergency_contact: 'Miguel López', emergency_phone: '809-555-0502'
      },
      {
        id: '6', employee_code: 'EMP006', first_name: 'Roberto', last_name: 'Jiménez',
        email: 'roberto.jimenez@empresa.com', phone: '809-555-0601', department_id: '3', position_id: '6',
        salary: 45000, hire_date: '2023-02-28', status: 'active',
        bank_account: '6789012345', identification: '001-6789012-3', address: 'Calle Duarte #987, Santiago',
        emergency_contact: 'Rosa Jiménez', emergency_phone: '809-555-0602'
      },
      {
        id: '7', employee_code: 'EMP007', first_name: 'Patricia', last_name: 'Herrera',
        email: 'patricia.herrera@empresa.com', phone: '809-555-0701', department_id: '2', position_id: '4',
        salary: 38000, hire_date: '2023-05-15', status: 'active',
        bank_account: '7890123456', identification: '001-7890123-4', address: 'Av. Bolívar #147, Santo Domingo',
        emergency_contact: 'José Herrera', emergency_phone: '809-555-0702'
      },
      {
        id: '8', employee_code: 'EMP008', first_name: 'Miguel', last_name: 'Vargas',
        email: 'miguel.vargas@empresa.com', phone: '809-555-0801', department_id: '4', position_id: '8',
        salary: 62000, hire_date: '2022-08-03', status: 'active',
        bank_account: '8901234567', identification: '001-8901234-5', address: 'Calle Mella #258, Santiago',
        emergency_contact: 'Elena Vargas', emergency_phone: '809-555-0802'
      }
    ];

    // Mock Payroll Periods
    const mockPeriods: PayrollPeriod[] = [
      {
        id: '1', period_name: 'Enero 2024', start_date: '2024-01-01', end_date: '2024-01-31',
        pay_date: '2024-02-05', status: 'paid', total_gross: 535000, total_deductions: 89250,
        total_net: 445750, employee_count: 8
      },
      {
        id: '2', period_name: 'Febrero 2024', start_date: '2024-02-01', end_date: '2024-02-29',
        pay_date: '2024-03-05', status: 'paid', total_gross: 535000, total_deductions: 89250,
        total_net: 445750, employee_count: 8
      },
      {
        id: '3', period_name: 'Marzo 2024', start_date: '2024-03-01', end_date: '2024-03-31',
        pay_date: '2024-04-05', status: 'closed', total_gross: 535000, total_deductions: 89250,
        total_net: 445750, employee_count: 8
      },
      {
        id: '4', period_name: 'Abril 2024', start_date: '2024-04-01', end_date: '2024-04-30',
        pay_date: '2024-05-05', status: 'processing', total_gross: 535000, total_deductions: 89250,
        total_net: 445750, employee_count: 8
      },
      {
        id: '5', period_name: 'Mayo 2024', start_date: '2024-05-01', end_date: '2024-05-31',
        pay_date: '2024-06-05', status: 'open', total_gross: 0, total_deductions: 0,
        total_net: 0, employee_count: 0
      }
    ];

    setDepartments(mockDepartments);
    setPositions(mockPositions);
    setEmployees(mockEmployees);
    setPayrollPeriods(mockPeriods);
  };

  const handleOpenModal = (type: string, item: any = null) => {
    setModalType(type);
    setSelectedItem(item);
    setFormData(item || {});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedItem(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalType === 'employee') {
        if (selectedItem) {
          setEmployees(prev => prev.map(emp => 
            emp.id === selectedItem.id ? { ...emp, ...formData } : emp
          ));
        } else {
          const newEmployee: Employee = {
            ...formData,
            id: Date.now().toString(),
            employee_code: `EMP${String(employees.length + 1).padStart(3, '0')}`,
            status: 'active'
          };
          setEmployees(prev => [...prev, newEmployee]);
        }
      } else if (modalType === 'department') {
        if (selectedItem) {
          setDepartments(prev => prev.map(dept => 
            dept.id === selectedItem.id ? { ...dept, ...formData } : dept
          ));
        } else {
          const newDepartment: Department = {
            ...formData,
            id: Date.now().toString()
          };
          setDepartments(prev => [...prev, newDepartment]);
        }
      } else if (modalType === 'position') {
        if (selectedItem) {
          setPositions(prev => prev.map(pos => 
            pos.id === selectedItem.id ? { ...pos, ...formData } : pos
          ));
        } else {
          const newPosition: Position = {
            ...formData,
            id: Date.now().toString(),
            is_active: true
          };
          setPositions(prev => [...prev, newPosition]);
        }
      } else if (modalType === 'payroll-period') {
        const newPeriod: PayrollPeriod = {
          ...formData,
          id: Date.now().toString(),
          status: 'open',
          total_gross: 0,
          total_deductions: 0,
          total_net: 0,
          employee_count: 0
        };
        setPayrollPeriods(prev => [...prev, newPeriod]);
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, type: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este elemento?')) return;

    if (type === 'employee') {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    } else if (type === 'department') {
      setDepartments(prev => prev.filter(dept => dept.id !== id));
    } else if (type === 'position') {
      setPositions(prev => prev.filter(pos => pos.id !== id));
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const calculateDashboardStats = () => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.status === 'active').length;
    const totalSalaries = employees.reduce((sum, emp) => sum + emp.salary, 0);
    const avgSalary = totalEmployees > 0 ? totalSalaries / totalEmployees : 0;
    const openPeriods = payrollPeriods.filter(period => period.status === 'open').length;
    const processingPeriods = payrollPeriods.filter(period => period.status === 'processing').length;

    return {
      totalEmployees,
      activeEmployees,
      totalSalaries,
      avgSalary,
      openPeriods,
      processingPeriods
    };
  };

  const exportToExcel = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleBulkAction = (action: string) => {
    if (selectedEmployees.length === 0) {
      alert('Seleccione al menos un empleado');
      return;
    }

    if (!confirm(`¿Está seguro de que desea ${action} ${selectedEmployees.length} empleado(s)?`)) return;

    if (action === 'activate') {
      setEmployees(prev => prev.map(emp => 
        selectedEmployees.includes(emp.id) ? { ...emp, status: 'active' } : emp
      ));
    } else if (action === 'deactivate') {
      setEmployees(prev => prev.map(emp => 
        selectedEmployees.includes(emp.id) ? { ...emp, status: 'inactive' } : emp
      ));
    }

    setSelectedEmployees([]);
  };

  const processPayroll = (periodId: string) => {
    if (!confirm('¿Está seguro de que desea procesar esta nómina?')) return;

    setPayrollPeriods(prev => prev.map(period => 
      period.id === periodId 
        ? { 
            ...period, 
            status: 'processing',
            total_gross: employees.reduce((sum, emp) => sum + emp.salary, 0),
            total_deductions: employees.reduce((sum, emp) => sum + (emp.salary * 0.1667), 0),
            total_net: employees.reduce((sum, emp) => sum + (emp.salary * 0.8333), 0),
            employee_count: employees.filter(emp => emp.status === 'active').length
          }
        : period
    ));
  };

  const renderDashboard = () => {
    const stats = calculateDashboardStats();

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard de Nómina</h2>
            <p className="text-gray-600">Resumen general del sistema de nómina</p>
          </div>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Volver al Inicio</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <i className="ri-user-line text-2xl text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Empleados</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <i className="ri-user-check-line text-2xl text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Empleados Activos</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <i className="ri-money-dollar-circle-line text-2xl text-yellow-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Nómina Total</p>
                <p className="text-2xl font-semibold text-gray-900">RD${stats.totalSalaries.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <i className="ri-calculator-line text-2xl text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Salario Promedio</p>
                <p className="text-2xl font-semibold text-gray-900">RD${Math.round(stats.avgSalary).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Departamentos */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Empleados por Departamento</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {departments.map(dept => {
                  const deptEmployees = employees.filter(emp => emp.department_id === dept.id);
                  const deptSalaries = deptEmployees.reduce((sum, emp) => sum + emp.salary, 0);
                  return (
                    <div key={dept.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{dept.name}</p>
                        <p className="text-sm text-gray-500">{deptEmployees.length} empleados</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">RD${deptSalaries.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Nómina mensual</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Períodos Recientes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Períodos de Nómina Recientes</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {payrollPeriods.slice(0, 5).map(period => (
                  <div key={period.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{period.period_name}</p>
                      <p className="text-sm text-gray-500">{period.employee_count} empleados</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        period.status === 'paid' ? 'bg-green-100 text-green-800' :
                        period.status === 'closed' ? 'bg-blue-100 text-blue-800' :
                        period.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {period.status === 'paid' ? 'Pagado' :
                         period.status === 'closed' ? 'Cerrado' :
                         period.status === 'processing' ? 'Procesando' : 'Abierto'}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">RD${period.total_net.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleOpenModal('employee')}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="ri-user-add-line"></i>
              <span>Agregar Empleado</span>
            </button>
            <button
              onClick={() => handleOpenModal('payroll-period')}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <i className="ri-calendar-line"></i>
              <span>Nuevo Período</span>
            </button>
            <button
              onClick={() => exportToExcel(employees.map(emp => ({
                Código: emp.employee_code,
                Nombre: `${emp.first_name} ${emp.last_name}`,
                Departamento: getDepartmentName(emp.department_id),
                Posición: getPositionTitle(emp.position_id),
                Salario: emp.salary,
                Estado: emp.status
              })), 'empleados')}
              className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <i className="ri-download-line"></i>
              <span>Exportar Empleados</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEmployees = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gestión de Empleados</h3>
        <button
          onClick={() => handleOpenModal('employee')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Agregar Empleado
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => exportToExcel(filteredEmployees.map(emp => ({
                Código: emp.employee_code,
                Nombre: `${emp.first_name} ${emp.last_name}`,
                Email: emp.email,
                Teléfono: emp.phone,
                Departamento: getDepartmentName(emp.department_id),
                Posición: getPositionTitle(emp.position_id),
                Salario: emp.salary,
                'Fecha Contratación': emp.hire_date,
                Estado: emp.status
              })), 'empleados_filtrados')}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-download-line"></i>
            </button>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Mostrando {filteredEmployees.length} de {employees.length} empleados
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
                onClick={() => handleBulkAction('activate')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Activar
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
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
                        Contratado: {new Date(employee.hire_date).toLocaleDateString()}
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
                    RD${employee.salary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleOpenModal('employee', employee)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button
                      onClick={() => handleOpenModal('employee-details', employee)}
                      className="text-green-600 hover:text-green-900"
                    >
                      <i className="ri-eye-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDepartments = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Departamentos</h3>
        <button
          onClick={() => handleOpenModal('department')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Agregar Departamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => {
          const deptEmployees = employees.filter(emp => emp.department_id === department.id);
          const deptSalaries = deptEmployees.reduce((sum, emp) => sum + emp.salary, 0);
          
          return (
            <div key={department.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-semibold text-gray-900">{department.name}</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenModal('department', department)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <i className="ri-edit-line"></i>
                  </button>
                </div>
              </div>
              <p className="text-gray-600 mb-4">{department.description}</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Empleados:</span>
                  <span className="text-sm font-medium">{deptEmployees.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Nómina mensual:</span>
                  <span className="text-sm font-medium">RD${deptSalaries.toLocaleString()}</span>
                </div>
                {department.budget && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Presupuesto:</span>
                    <span className="text-sm font-medium">RD${department.budget.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPositions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Posiciones</h3>
        <button
          onClick={() => handleOpenModal('position')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Agregar Posición
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleados</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rango Salarial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.map((position) => {
                const posEmployees = employees.filter(emp => emp.position_id === position.id);
                
                return (
                  <tr key={position.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{position.title}</div>
                        <div className="text-sm text-gray-500">{position.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDepartmentName(position.department_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {posEmployees.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {position.min_salary && position.max_salary ? (
                        `RD$${position.min_salary.toLocaleString()} - RD$${position.max_salary.toLocaleString()}`
                      ) : 'No definido'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        position.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {position.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleOpenModal('position', position)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPayroll = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Períodos de Nómina</h3>
        <button
          onClick={() => handleOpenModal('payroll-period')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nuevo Período
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {payrollPeriods.map((period) => (
          <div key={period.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-900">{period.period_name}</h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                period.status === 'paid' ? 'bg-green-100 text-green-800' :
                period.status === 'closed' ? 'bg-blue-100 text-blue-800' :
                period.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {period.status === 'paid' ? 'Pagado' :
                 period.status === 'closed' ? 'Cerrado' :
                 period.status === 'processing' ? 'Procesando' : 'Abierto'}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Inicio: {new Date(period.start_date).toLocaleDateString()}</p>
              <p>Fin: {new Date(period.end_date).toLocaleDateString()}</p>
              <p>Pago: {new Date(period.pay_date).toLocaleDateString()}</p>
              <p>Empleados: {period.employee_count}</p>
              {period.total_net > 0 && (
                <>
                  <p className="font-semibold text-gray-900">
                    Bruto: RD${period.total_gross.toLocaleString()}
                  </p>
                  <p className="text-red-600">
                    Deducciones: RD${period.total_deductions.toLocaleString()}
                  </p>
                  <p className="font-semibold text-green-600">
                    Neto: RD${period.total_net.toLocaleString()}
                  </p>
                </>
              )}
            </div>
            <div className="mt-4 flex space-x-2">
              <button className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors whitespace-nowrap">
                Ver Detalles
              </button>
              <button 
                onClick={() => exportToExcel([{
                  Período: period.period_name,
                  'Fecha Inicio': period.start_date,
                  'Fecha Fin': period.end_date,
                  'Fecha Pago': period.pay_date,
                  Estado: period.status,
                  'Total Bruto': period.total_gross,
                  'Total Deducciones': period.total_deductions,
                  'Total Neto': period.total_net,
                  'Empleados': period.employee_count
                }], `nomina_${period.period_name.replace(' ', '_')}`)}
                className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
              >
                <i className="ri-download-line"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Reportes de Nómina</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Reporte de Empleados */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <i className="ri-user-line text-2xl text-blue-600"></i>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-gray-900">Reporte de Empleados</h4>
              <p className="text-sm text-gray-500">Lista completa de empleados</p>
            </div>
          </div>
          <button
            onClick={() => exportToExcel(employees.map(emp => ({
              Código: emp.employee_code,
              Nombre: `${emp.first_name} ${emp.last_name}`,
              Email: emp.email,
              Teléfono: emp.phone,
              Departamento: getDepartmentName(emp.department_id),
              Posición: getPositionTitle(emp.position_id),
              Salario: emp.salary,
              'Fecha Contratación': emp.hire_date,
              Estado: emp.status,
              'Cuenta Bancaria': emp.bank_account || '',
              Identificación: emp.identification || '',
              Dirección: emp.address || ''
            })), 'reporte_empleados')}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-download-line mr-2"></i>
            Descargar Reporte
          </button>
        </div>

        {/* Reporte de Nómina por Departamento */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-green-100">
              <i className="ri-building-line text-2xl text-green-600"></i>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-gray-900">Nómina por Departamento</h4>
              <p className="text-sm text-gray-500">Resumen por departamentos</p>
            </div>
          </div>
          <button
            onClick={() => exportToExcel(departments.map(dept => {
              const deptEmployees = employees.filter(emp => emp.department_id === dept.id);
              const totalSalaries = deptEmployees.reduce((sum, emp) => sum + emp.salary, 0);
              return {
                Departamento: dept.name,
                Descripción: dept.description,
                'Número de Empleados': deptEmployees.length,
                'Nómina Total': totalSalaries,
                'Salario Promedio': deptEmployees.length > 0 ? Math.round(totalSalaries / deptEmployees.length) : 0,
                Presupuesto: dept.budget || 0
              };
            }), 'nomina_por_departamento')}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <i className="ri-download-line mr-2"></i>
            Descargar Reporte
          </button>
        </div>

        {/* Reporte de Períodos de Nómina */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-purple-100">
              <i className="ri-calendar-line text-2xl text-purple-600"></i>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-gray-900">Períodos de Nómina</h4>
              <p className="text-sm text-gray-500">Historial de períodos</p>
            </div>
          </div>
          <button
            onClick={() => exportToExcel(payrollPeriods.map(period => ({
              Período: period.period_name,
              'Fecha Inicio': period.start_date,
              'Fecha Fin': period.end_date,
              'Fecha Pago': period.pay_date,
              Estado: period.status,
              'Empleados': period.employee_count,
              'Total Bruto': period.total_gross,
              'Total Deducciones': period.total_deductions,
              'Total Neto': period.total_net
            })), 'periodos_nomina')}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <i className="ri-download-line mr-2"></i>
            Descargar Reporte
          </button>
        </div>

        {/* Reporte de Análisis Salarial */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-yellow-100">
              <i className="ri-bar-chart-line text-2xl text-yellow-600"></i>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-gray-900">Análisis Salarial</h4>
              <p className="text-sm text-gray-500">Estadísticas salariales</p>
            </div>
          </div>
          <button
            onClick={() => {
              const stats = calculateDashboardStats();
              const salaryRanges = {
                'Menos de 30,000': employees.filter(emp => emp.salary < 30000).length,
                '30,000 - 50,000': employees.filter(emp => emp.salary >= 30000 && emp.salary < 50000).length,
                '50,000 - 70,000': employees.filter(emp => emp.salary >= 50000 && emp.salary < 70000).length,
                '70,000 - 90,000': employees.filter(emp => emp.salary >= 70000 && emp.salary < 90000).length,
                'Más de 90,000': employees.filter(emp => emp.salary >= 90000).length
              };
              
              exportToExcel([
                { Métrica: 'Total de Empleados', Valor: stats.totalEmployees },
                { Métrica: 'Empleados Activos', Valor: stats.activeEmployees },
                { Métrica: 'Nómina Total Mensual', Valor: stats.totalSalaries },
                { Métrica: 'Salario Promedio', Valor: Math.round(stats.avgSalary) },
                ...Object.entries(salaryRanges).map(([rango, cantidad]) => ({
                  Métrica: `Empleados con salario ${rango}`,
                  Valor: cantidad
                }))
              ], 'analisis_salarial');
            }}
            className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <i className="ri-download-line mr-2"></i>
            Descargar Análisis
          </button>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {selectedItem ? 'Editar' : 'Agregar'} {
                modalType === 'employee' ? 'Empleado' :
                modalType === 'department' ? 'Departamento' :
                modalType === 'position' ? 'Posición' :
                modalType === 'employee-details' ? 'Detalles del Empleado' :
                'Período de Nómina'
              }
            </h3>
            <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {modalType === 'employee-details' && selectedItem ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Código de Empleado</label>
                  <p className="text-sm text-gray-900">{selectedItem.employee_code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedItem.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedItem.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                  <p className="text-sm text-gray-900">{selectedItem.first_name} {selectedItem.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedItem.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <p className="text-sm text-gray-900">{selectedItem.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Identificación</label>
                  <p className="text-sm text-gray-900">{selectedItem.identification || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Departamento</label>
                  <p className="text-sm text-gray-900">{getDepartmentName(selectedItem.department_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Posición</label>
                  <p className="text-sm text-gray-900">{getPositionTitle(selectedItem.position_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salario</label>
                  <p className="text-sm text-gray-900">RD${selectedItem.salary.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Contratación</label>
                  <p className="text-sm text-gray-900">{new Date(selectedItem.hire_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cuenta Bancaria</label>
                  <p className="text-sm text-gray-900">{selectedItem.bank_account || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contacto de Emergencia</label>
                  <p className="text-sm text-gray-900">{selectedItem.emergency_contact || 'No especificado'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                <p className="text-sm text-gray-900">{selectedItem.address || 'No especificado'}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === 'employee' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Identificación</label>
                    <input
                      type="text"
                      value={formData.identification || ''}
                      onChange={(e) => setFormData({...formData, identification: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="001-1234567-8"
                    />
                  </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salario *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salary || ''}
                      onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value)})}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Bancaria</label>
                    <input
                      type="text"
                      value={formData.bank_account || ''}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {modalType === 'department' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Departamento *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.budget || ''}
                      onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {modalType === 'position' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título de la Posición *</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salario Mínimo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.min_salary || ''}
                        onChange={(e) => setFormData({...formData, min_salary: parseFloat(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salario Máximo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.max_salary || ''}
                        onChange={(e) => setFormData({...formData, max_salary: parseFloat(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType !== 'employee-details' && (
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
                    {loading ? 'Guardando...' : (selectedItem ? 'Actualizar' : 'Crear')}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Nómina</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: 'ri-dashboard-line' },
            { id: 'employees', name: 'Empleados', icon: 'ri-user-line' },
            { id: 'departments', name: 'Departamentos', icon: 'ri-building-line' },
            { id: 'positions', name: 'Posiciones', icon: 'ri-briefcase-line' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={`${tab.icon} mr-2`}></i>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Navigation Buttons for Other Modules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Otros Módulos de Nómina</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/configuration')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-settings-line"></i>
            <span>Configuración</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/employee-types')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-user-settings-line"></i>
            <span>Tipos de Empleados</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/salary-types')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-money-dollar-box-line"></i>
            <span>Tipos de Salario</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/concepts')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-list-check"></i>
            <span>Conceptos</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/periods')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-calendar-line"></i>
            <span>Períodos</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/commission-types')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-percent-line"></i>
            <span>Tipos de Comisión</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/vacations')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-plane-line"></i>
            <span>Vacaciones</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/overtime')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-time-line"></i>
            <span>Horas Extras</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/holidays')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-calendar-event-line"></i>
            <span>Días Feriados</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/bonuses')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-gift-line"></i>
            <span>Bonificaciones</span>
          </button>
          <button
            onClick={() => window.REACT_APP_NAVIGATE('/payroll/royalties')}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
          >
            <i className="ri-award-line"></i>
            <span>Regalías</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'employees' && renderEmployees()}
        {activeTab === 'departments' && renderDepartments()}
        {activeTab === 'positions' && renderPositions()}
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
}
