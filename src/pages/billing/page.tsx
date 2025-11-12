import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function BillingPage() {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Reportes de Ventas',
      description: 'Análisis completo de ventas y rendimiento comercial',
      icon: 'ri-bar-chart-line',
      href: '/billing/sales-reports',
      color: 'blue'
    },
    {
      title: 'Facturación',
      description: 'Crear y gestionar facturas de clientes',
      icon: 'ri-file-text-line',
      href: '/billing/invoicing',
      color: 'green'
    },
    {
      title: 'Pre-facturación',
      description: 'Cotizaciones y presupuestos para clientes',
      icon: 'ri-draft-line',
      href: '/billing/pre-invoicing',
      color: 'purple'
    },
    {
      title: 'Facturación Recurrente',
      description: 'Suscripciones y facturación automática',
      icon: 'ri-repeat-line',
      href: '/billing/recurring',
      color: 'orange'
    },
    {
      title: 'Cierre de Caja',
      description: 'Reconciliación diaria de efectivo y ventas',
      icon: 'ri-safe-line',
      href: '/billing/cash-closing',
      color: 'red'
    },
    {
      title: 'Cotizaciones de Ventas',
      description: 'Propuestas comerciales y seguimiento de oportunidades',
      icon: 'ri-file-list-line',
      href: '/billing/quotes',
      color: 'indigo'
    }
  ];

  const salesStats = [
    {
      title: 'Ventas de Hoy',
      value: 'RD$ 185,000',
      change: '+12.5%',
      icon: 'ri-money-dollar-circle-line',
      color: 'green'
    },
    {
      title: 'Facturas Emitidas',
      value: '67',
      change: '+8.2%',
      icon: 'ri-file-text-line',
      color: 'blue'
    },
    {
      title: 'Cotizaciones Pendientes',
      value: '23',
      change: '+15%',
      icon: 'ri-file-list-line',
      color: 'orange'
    },
    {
      title: 'Ingresos Mensuales',
      value: 'RD$ 2,850,000',
      change: '+18.3%',
      icon: 'ri-line-chart-line',
      color: 'purple'
    }
  ];

  const recentInvoices = [
    {
      number: 'FAC-2024-189',
      customer: 'Empresa ABC SRL',
      amount: 'RD$ 45,000',
      status: 'Pagada',
      date: '15/01/2024'
    },
    {
      number: 'FAC-2024-188',
      customer: 'Comercial XYZ EIRL',
      amount: 'RD$ 32,500',
      status: 'Pendiente',
      date: '15/01/2024'
    },
    {
      number: 'FAC-2024-187',
      customer: 'Distribuidora DEF SA',
      amount: 'RD$ 78,000',
      status: 'Pagada',
      date: '14/01/2024'
    },
    {
      number: 'FAC-2024-186',
      customer: 'Servicios GHI SRL',
      amount: 'RD$ 25,000',
      status: 'Vencida',
      date: '13/01/2024'
    }
  ];

  const topProducts = [
    {
      name: 'Laptop Dell Inspiron 15',
      quantity: 25,
      revenue: 'RD$ 875,000',
      margin: '22%'
    },
    {
      name: 'Monitor Samsung 24"',
      quantity: 45,
      revenue: 'RD$ 450,000',
      margin: '18%'
    },
    {
      name: 'Impresora HP LaserJet',
      quantity: 18,
      revenue: 'RD$ 324,000',
      margin: '25%'
    },
    {
      name: 'Teclado Mecánico RGB',
      quantity: 67,
      revenue: 'RD$ 201,000',
      margin: '35%'
    }
  ];

  const pendingQuotes = [
    {
      number: 'COT-2024-045',
      customer: 'Nuevo Cliente SA',
      amount: 'RD$ 125,000',
      validUntil: '25/01/2024',
      status: 'Pendiente'
    },
    {
      number: 'COT-2024-044',
      customer: 'Empresa Potencial SRL',
      amount: 'RD$ 89,000',
      validUntil: '22/01/2024',
      status: 'En Revisión'
    }
  ];

  // Module Access Functions
  const handleAccessModule = (moduleHref: string) => {
    navigate(moduleHref);
  };

  // Quote Management Functions
  const handleConvertQuote = (quoteNumber: string, customer: string, amount: string) => {
    if (confirm(`¿Convertir cotización ${quoteNumber} a factura para ${customer}?`)) {
      alert(`Cotización ${quoteNumber} convertida a factura exitosamente`);
    }
  };

  const handleEditQuote = (quoteNumber: string) => {
    navigate('/billing/quotes');
  };

  // Navigation Functions
  const handleViewAllInvoices = () => {
    navigate('/billing/invoicing');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo de Facturación</h1>
          <p className="text-gray-600">Sistema completo de gestión de ventas y facturación</p>
        </div>

        {/* Sales Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {salesStats.map((stat, index) => (
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
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
                <span className="text-sm text-gray-500 ml-1">vs ayer</span>
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
          {/* Recent Invoices */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Facturas Recientes</h3>
                <button 
                  onClick={handleViewAllInvoices}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap"
                >
                  Ver Todas
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentInvoices.map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.number}</p>
                      <p className="text-sm text-gray-600">{invoice.customer}</p>
                      <p className="text-xs text-gray-500">{invoice.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{invoice.amount}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        invoice.status === 'Pagada' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">Vendidos: {product.quantity} unidades</p>
                      <p className="text-xs text-gray-500">Margen: {product.margin}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{product.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Quotes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Cotizaciones Pendientes</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingQuotes.map((quote, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{quote.number}</p>
                    <p className="text-sm text-gray-600">{quote.customer}</p>
                    <p className="text-xs text-gray-500">Válida hasta: {quote.validUntil}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{quote.amount}</p>
                    <div className="flex space-x-2 mt-2">
                      <button 
                        onClick={() => handleConvertQuote(quote.number, quote.customer, quote.amount)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 whitespace-nowrap"
                      >
                        Convertir
                      </button>
                      <button 
                        onClick={() => handleEditQuote(quote.number)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 whitespace-nowrap"
                      >
                        Editar
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