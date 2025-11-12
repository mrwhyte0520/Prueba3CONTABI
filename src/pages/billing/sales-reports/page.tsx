import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function SalesReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedReport, setSelectedReport] = useState('sales-summary');
  const [showFilters, setShowFilters] = useState(false);

  const reportTypes = [
    { id: 'sales-summary', name: 'Resumen de Ventas', icon: 'ri-bar-chart-line' },
    { id: 'product-sales', name: 'Ventas por Producto', icon: 'ri-shopping-bag-line' },
    { id: 'customer-sales', name: 'Ventas por Cliente', icon: 'ri-user-line' },
    { id: 'payment-methods', name: 'Métodos de Pago', icon: 'ri-bank-card-line' },
    { id: 'tax-summary', name: 'Resumen de Impuestos', icon: 'ri-file-text-line' },
    { id: 'profit-analysis', name: 'Análisis de Rentabilidad', icon: 'ri-line-chart-line' }
  ];

  const periods = [
    { id: 'today', name: 'Hoy' },
    { id: 'yesterday', name: 'Ayer' },
    { id: 'this-week', name: 'Esta Semana' },
    { id: 'last-week', name: 'Semana Pasada' },
    { id: 'this-month', name: 'Este Mes' },
    { id: 'last-month', name: 'Mes Pasado' },
    { id: 'this-year', name: 'Este Año' },
    { id: 'custom', name: 'Personalizado' }
  ];

  const salesSummary = {
    totalSales: 'RD$ 185,450',
    totalInvoices: 67,
    averageTicket: 'RD$ 2,768',
    totalTax: 'RD$ 33,381',
    netSales: 'RD$ 152,069',
    grossProfit: 'RD$ 45,621',
    profitMargin: '30.0%'
  };

  const topProducts = [
    { name: 'Laptop Dell Inspiron 15', quantity: 8, revenue: 'RD$ 280,000', margin: '22%' },
    { name: 'Monitor Samsung 24"', quantity: 15, revenue: 'RD$ 150,000', margin: '18%' },
    { name: 'Impresora HP LaserJet', quantity: 6, revenue: 'RD$ 108,000', margin: '25%' },
    { name: 'Teclado Mecánico RGB', quantity: 25, revenue: 'RD$ 75,000', margin: '35%' },
    { name: 'Mouse Inalámbrico', quantity: 40, revenue: 'RD$ 40,000', margin: '40%' }
  ];

  const topCustomers = [
    { name: 'Empresa ABC SRL', invoices: 12, revenue: 'RD$ 450,000', lastPurchase: '15/01/2024' },
    { name: 'Comercial XYZ EIRL', invoices: 8, revenue: 'RD$ 320,000', lastPurchase: '14/01/2024' },
    { name: 'Distribuidora DEF SA', invoices: 15, revenue: 'RD$ 780,000', lastPurchase: '15/01/2024' },
    { name: 'Servicios GHI SRL', invoices: 6, revenue: 'RD$ 180,000', lastPurchase: '13/01/2024' },
    { name: 'Tecnología JKL SA', invoices: 10, revenue: 'RD$ 520,000', lastPurchase: '15/01/2024' }
  ];

  const paymentMethods = [
    { method: 'Efectivo', amount: 'RD$ 75,200', percentage: '40.6%', transactions: 28 },
    { method: 'Tarjeta de Crédito', amount: 'RD$ 65,150', percentage: '35.1%', transactions: 22 },
    { method: 'Transferencia', amount: 'RD$ 35,100', percentage: '18.9%', transactions: 12 },
    { method: 'Cheque', amount: 'RD$ 10,000', percentage: '5.4%', transactions: 5 }
  ];

  const handleGenerateReport = () => {
    alert(`Generando reporte: ${reportTypes.find(r => r.id === selectedReport)?.name} para el período: ${periods.find(p => p.id === selectedPeriod)?.name}`);
  };

  const handleExportReport = (format: string) => {
    alert(`Exportando reporte en formato ${format.toUpperCase()}`);
  };

  const handlePrintReport = () => {
    alert('Imprimiendo reporte...');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes de Ventas</h1>
            <p className="text-gray-600">Análisis detallado de ventas y rendimiento</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              <i className="ri-filter-line mr-2"></i>
              Filtros
            </button>
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Generar Reporte
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte</label>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                >
                  {reportTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                >
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>{period.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Acciones</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExportReport('pdf')}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm whitespace-nowrap"
                  >
                    <i className="ri-file-pdf-line mr-1"></i>
                    PDF
                  </button>
                  <button
                    onClick={() => handleExportReport('excel')}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                  >
                    <i className="ri-file-excel-line mr-1"></i>
                    Excel
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
                  >
                    <i className="ri-printer-line mr-1"></i>
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{salesSummary.totalSales}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-money-dollar-circle-line text-xl text-blue-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-green-600">+12.5%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Facturas Emitidas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{salesSummary.totalInvoices}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <i className="ri-file-text-line text-xl text-green-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-green-600">+8.2%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{salesSummary.averageTicket}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                <i className="ri-calculator-line text-xl text-purple-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-green-600">+5.1%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Margen de Ganancia</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{salesSummary.profitMargin}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100">
                <i className="ri-line-chart-line text-xl text-orange-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm font-medium text-green-600">+2.3%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">Vendidos: {product.quantity} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{product.revenue}</p>
                      <p className="text-sm text-gray-500">Margen: {product.margin}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Mejores Clientes</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                        <span className="text-sm font-bold text-green-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.invoices} facturas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{customer.revenue}</p>
                      <p className="text-sm text-gray-500">{customer.lastPurchase}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Métodos de Pago</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {paymentMethods.map((method, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <i className="ri-bank-card-line text-2xl text-blue-600"></i>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{method.method}</h4>
                  <p className="text-2xl font-bold text-green-600 mb-1">{method.amount}</p>
                  <p className="text-sm text-gray-600 mb-1">{method.percentage} del total</p>
                  <p className="text-xs text-gray-500">{method.transactions} transacciones</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}