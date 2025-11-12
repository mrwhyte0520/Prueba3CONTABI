
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function AccountsReceivablePage() {
  // Mock data para estadísticas del dashboard
  const totalReceivables = 435000;
  const overdueAmount = 125000;
  const currentAmount = 310000;
  const activeCustomers = 15;

  const modules = [
    {
      title: 'Facturas por Cobrar',
      description: 'Gestión de facturas pendientes de cobro',
      icon: 'ri-file-list-3-line',
      path: '/accounts-receivable/invoices',
      color: 'bg-blue-500',
      stats: 'RD$ 435,000'
    },
    {
      title: 'Gestión de Clientes',
      description: 'Administración de información de clientes',
      icon: 'ri-user-line',
      path: '/accounts-receivable/customers',
      color: 'bg-purple-500',
      stats: '15 Activos'
    },
    {
      title: 'Pagos Recibidos',
      description: 'Registro y seguimiento de pagos',
      icon: 'ri-money-dollar-circle-line',
      path: '/accounts-receivable/payments',
      color: 'bg-green-500',
      stats: 'RD$ 285,000'
    },
    {
      title: 'Recibos de Cobro',
      description: 'Emisión y gestión de recibos',
      icon: 'ri-receipt-line',
      path: '/accounts-receivable/receipts',
      color: 'bg-indigo-500',
      stats: '24 Emitidos'
    },
    {
      title: 'Anticipos de Clientes',
      description: 'Gestión de anticipos recibidos',
      icon: 'ri-wallet-line',
      path: '/accounts-receivable/advances',
      color: 'bg-orange-500',
      stats: 'RD$ 150,000'
    },
    {
      title: 'Notas de Crédito',
      description: 'Gestión de notas de crédito',
      icon: 'ri-file-reduce-line',
      path: '/accounts-receivable/credit-notes',
      color: 'bg-emerald-500',
      stats: 'RD$ 45,000'
    },
    {
      title: 'Notas de Débito',
      description: 'Gestión de notas de débito',
      icon: 'ri-file-add-line',
      path: '/accounts-receivable/debit-notes',
      color: 'bg-red-500',
      stats: 'RD$ 25,000'
    },
    {
      title: 'Reportes CxC',
      description: 'Reportes y análisis de cuentas por cobrar',
      icon: 'ri-bar-chart-line',
      path: '/accounts-receivable/reports',
      color: 'bg-cyan-500',
      stats: '8 Disponibles'
    }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cuentas por Cobrar</h1>
            <p className="text-gray-600 mt-1">Gestión integral de cuentas por cobrar y clientes</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total por Cobrar</p>
                <p className="text-2xl font-bold text-gray-900">RD${totalReceivables.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">RD${overdueAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-alarm-warning-line text-2xl text-red-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Corrientes</p>
                <p className="text-2xl font-bold text-green-600">RD${currentAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                <p className="text-2xl font-bold text-gray-900">{activeCustomers}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-user-line text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module, index) => (
            <Link
              key={index}
              to={module.path}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <i className={`${module.icon} text-2xl text-white`}></i>
                </div>
                <span className="text-sm font-medium text-gray-500">{module.stats}</span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {module.title}
              </h3>
              
              <p className="text-gray-600 text-sm">
                {module.description}
              </p>
              
              <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                <span>Acceder</span>
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform duration-200"></i>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/accounts-receivable/invoices"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <i className="ri-add-line text-2xl text-blue-600 mr-3"></i>
              <div>
                <p className="font-medium text-blue-900">Nueva Factura</p>
                <p className="text-sm text-blue-600">Crear factura por cobrar</p>
              </div>
            </Link>
            
            <Link
              to="/accounts-receivable/payments"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <i className="ri-money-dollar-circle-line text-2xl text-green-600 mr-3"></i>
              <div>
                <p className="font-medium text-green-900">Registrar Pago</p>
                <p className="text-sm text-green-600">Registrar pago recibido</p>
              </div>
            </Link>
            
            <Link
              to="/accounts-receivable/customers"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <i className="ri-user-add-line text-2xl text-purple-600 mr-3"></i>
              <div>
                <p className="font-medium text-purple-900">Nuevo Cliente</p>
                <p className="text-sm text-purple-600">Agregar nuevo cliente</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
