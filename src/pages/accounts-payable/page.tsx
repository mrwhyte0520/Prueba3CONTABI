import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function AccountsPayablePage() {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Reportes CxP',
      description: 'Reportes de cuentas por pagar con filtros avanzados',
      icon: 'ri-file-chart-line',
      href: '/accounts-payable/reports',
      color: 'blue'
    },
    {
      title: 'Gestión de Proveedores',
      description: 'Base de datos y mantenimiento de proveedores',
      icon: 'ri-truck-line',
      href: '/accounts-payable/suppliers',
      color: 'green'
    },
    {
      title: 'Procesamiento de Pagos',
      description: 'Pagos por cheque, transferencia y efectivo',
      icon: 'ri-bank-card-line',
      href: '/accounts-payable/payments',
      color: 'purple'
    },
    {
      title: 'Órdenes de Compra',
      description: 'Gestión y seguimiento de órdenes de compra',
      icon: 'ri-shopping-cart-line',
      href: '/accounts-payable/purchase-orders',
      color: 'orange'
    },
    {
      title: 'Solicitudes de Cotización',
      description: 'Solicitudes de cotización y comparaciones',
      icon: 'ri-file-list-line',
      href: '/accounts-payable/quotes',
      color: 'red'
    },
    {
      title: 'Anticipos CxP',
      description: 'Pagos anticipados a proveedores',
      icon: 'ri-money-dollar-circle-line',
      href: '/accounts-payable/advances',
      color: 'indigo'
    }
  ];

  const apStats = [
    {
      title: 'Balance total CxP',
      value: 'RD$ 0',
      change: '0%',
      icon: 'ri-file-list-3-line',
      color: 'red'
    },
    {
      title: 'Vence esta semana',
      value: 'RD$ 0',
      change: '0%',
      icon: 'ri-calendar-line',
      color: 'orange'
    },
    {
      title: 'Pagos vencidos',
      value: 'RD$ 0',
      change: '0%',
      icon: 'ri-alert-line',
      color: 'red'
    },
    {
      title: 'Proveedores activos',
      value: '0',
      change: '0',
      icon: 'ri-truck-line',
      color: 'blue'
    }
  ];

  const topSuppliers: Array<{ name: string; rnc: string; balance: string; dueDate: string; status: string; }> = [];

  const recentPurchases: Array<{ type: string; supplier: string; amount: string; reference: string; date: string; }> = [];

  const pendingApprovals: Array<{ type: string; supplier: string; amount: string; requestedBy: string; date: string; }> = [];

  // Module Access Functions
  const handleAccessModule = (moduleHref: string) => {
    navigate(moduleHref);
  };

  // Approval Functions
  const handleApproveRequest = (type: string, supplier: string, amount: string) => {
    if (confirm(`¿Aprobar ${type} para ${supplier} por ${amount}?`)) {
      alert(`${type} approved successfully for ${supplier}`);
    }
  };

  const handleRejectRequest = (type: string, supplier: string, amount: string) => {
    if (confirm(`¿Rechazar ${type} para ${supplier} por ${amount}?`)) {
      alert(`${type} rejected for ${supplier}`);
    }
  };

  // Navigation Functions
  const handleViewAll = (section: string) => {
    alert(`Viewing all ${section}...`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo de Cuentas por Pagar</h1>
          <p className="text-gray-600">Sistema completo de gestión de proveedores y pagos</p>
        </div>

        {/* A/P Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {apStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                  <i className={`${stat.icon} text-xl text-${stat.color}-600`}></i>
                </div>
              </div>
              <div className="mt-4">
                <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
              </div>
            </div>
          ))}
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${module.color}-100 mr-4`}>
                  <i className={`${module.icon} text-xl text-${module.color}-600`}></i>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
              <p className="text-gray-600 mb-4 text-sm">{module.description}</p>
              <button 
                onClick={() => handleAccessModule(module.href)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Acceder
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Suppliers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Principales proveedores por balance</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topSuppliers.map((supplier, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{supplier.name}</p>
                      <p className="text-sm text-gray-600">RNC: {supplier.rnc}</p>
                      <p className="text-xs text-gray-500">Vence: {supplier.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{supplier.balance}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        supplier.status === 'Current' ? 'bg-green-100 text-green-800' :
                        supplier.status === 'Due Soon' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {supplier.status === 'Current' ? 'Actual' : supplier.status === 'Due Soon' ? 'Próximo vencimiento' : 'Vencido'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Actividad reciente</h3>
                <button 
                  onClick={() => handleViewAll('actividad reciente')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap"
                >
                  Ver todo
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentPurchases.map((purchase, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                        purchase.type === 'Payment' ? 'bg-green-100' :
                        purchase.type === 'Purchase Order' ? 'bg-blue-100' : 'bg-orange-100'
                      }`}>
                        <i className={`${
                          purchase.type === 'Payment' ? 'ri-bank-card-line text-green-600' :
                          purchase.type === 'Purchase Order' ? 'ri-shopping-cart-line text-blue-600' :
                          'ri-file-text-line text-orange-600'
                        }`}></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{purchase.supplier}</p>
                        <p className="text-sm text-gray-600">{purchase.reference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        purchase.type === 'Payment' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {purchase.amount}
                      </p>
                      <p className="text-xs text-gray-500">{purchase.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Aprobaciones pendientes</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovals.map((approval, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{approval.type}</p>
                    <p className="text-sm text-gray-600">{approval.supplier}</p>
                    <p className="text-xs text-gray-500">Solicitado por: {approval.requestedBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{approval.amount}</p>
                    <div className="flex space-x-2 mt-2">
                      <button 
                        onClick={() => handleApproveRequest(approval.type, approval.supplier, approval.amount)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 whitespace-nowrap"
                      >
                        Aprobar
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(approval.type, approval.supplier, approval.amount)}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 whitespace-nowrap"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}