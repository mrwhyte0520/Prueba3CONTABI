import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function PreInvoicingPage() {
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const quotes = [
    {
      id: 'COT-2024-045',
      customer: 'Nuevo Cliente SA',
      customerEmail: 'contacto@nuevocliente.com',
      amount: 125000,
      tax: 22500,
      total: 147500,
      status: 'pending',
      date: '2024-01-15',
      validUntil: '2024-01-25',
      items: [
        { description: 'Servidor Dell PowerEdge R740', quantity: 1, price: 85000, total: 85000 },
        { description: 'Licencias Windows Server', quantity: 2, price: 20000, total: 40000 }
      ]
    },
    {
      id: 'COT-2024-044',
      customer: 'Empresa Potencial SRL',
      customerEmail: 'compras@empresapotencial.com',
      amount: 89000,
      tax: 16020,
      total: 105020,
      status: 'under_review',
      date: '2024-01-14',
      validUntil: '2024-01-22',
      items: [
        { description: 'Sistema de Videoconferencia', quantity: 1, price: 65000, total: 65000 },
        { description: 'Instalación y Configuración', quantity: 1, price: 24000, total: 24000 }
      ]
    },
    {
      id: 'COT-2024-043',
      customer: 'Comercial ABC EIRL',
      customerEmail: 'ventas@comercialabc.com',
      amount: 45000,
      tax: 8100,
      total: 53100,
      status: 'approved',
      date: '2024-01-13',
      validUntil: '2024-01-20',
      items: [
        { description: 'Laptops HP EliteBook', quantity: 3, price: 15000, total: 45000 }
      ]
    },
    {
      id: 'COT-2024-042',
      customer: 'Servicios XYZ SA',
      customerEmail: 'admin@serviciosxyz.com',
      amount: 78000,
      tax: 14040,
      total: 92040,
      status: 'rejected',
      date: '2024-01-12',
      validUntil: '2024-01-19',
      items: [
        { description: 'Software de Gestión Empresarial', quantity: 1, price: 78000, total: 78000 }
      ]
    },
    {
      id: 'COT-2024-041',
      customer: 'Distribuidora DEF SA',
      customerEmail: 'compras@distribuidoradef.com',
      amount: 156000,
      tax: 28080,
      total: 184080,
      status: 'expired',
      date: '2024-01-10',
      validUntil: '2024-01-17',
      items: [
        { description: 'Equipos de Red Cisco', quantity: 5, price: 25000, total: 125000 },
        { description: 'Servicios de Implementación', quantity: 1, price: 31000, total: 31000 }
      ]
    }
  ];

  const customers = [
    { id: '1', name: 'Nuevo Cliente SA', email: 'contacto@nuevocliente.com', phone: '809-555-0201' },
    { id: '2', name: 'Empresa Potencial SRL', email: 'compras@empresapotencial.com', phone: '809-555-0202' },
    { id: '3', name: 'Comercial ABC EIRL', email: 'ventas@comercialabc.com', phone: '809-555-0203' },
    { id: '4', name: 'Servicios XYZ SA', email: 'admin@serviciosxyz.com', phone: '809-555-0204' },
    { id: '5', name: 'Distribuidora DEF SA', email: 'compras@distribuidoradef.com', phone: '809-555-0205' }
  ];

  const products = [
    { id: '1', name: 'Servidor Dell PowerEdge R740', price: 85000, stock: 5 },
    { id: '2', name: 'Sistema de Videoconferencia', price: 65000, stock: 8 },
    { id: '3', name: 'Laptops HP EliteBook', price: 15000, stock: 25 },
    { id: '4', name: 'Software de Gestión Empresarial', price: 78000, stock: 1 },
    { id: '5', name: 'Equipos de Red Cisco', price: 25000, stock: 12 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'under_review': return 'En Revisión';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      case 'expired': return 'Expirada';
      default: return 'Desconocido';
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateQuote = () => {
    setShowNewQuoteModal(true);
  };

  const handleViewQuote = (quoteId: string) => {
    alert(`Visualizando cotización: ${quoteId}`);
  };

  const handleEditQuote = (quoteId: string) => {
    alert(`Editando cotización: ${quoteId}`);
  };

  const handleDeleteQuote = (quoteId: string) => {
    if (confirm(`¿Está seguro de eliminar la cotización ${quoteId}?`)) {
      alert(`Cotización ${quoteId} eliminada`);
    }
  };

  const handleSendQuote = (quoteId: string, customerEmail: string) => {
    alert(`Enviando cotización ${quoteId} a ${customerEmail}`);
  };

  const handlePrintQuote = (quoteId: string) => {
    alert(`Imprimiendo cotización: ${quoteId}`);
  };

  const handleConvertToInvoice = (quoteId: string) => {
    if (confirm(`¿Convertir cotización ${quoteId} en factura?`)) {
      alert(`Cotización ${quoteId} convertida en factura`);
    }
  };

  const handleDuplicateQuote = (quoteId: string) => {
    alert(`Duplicando cotización: ${quoteId}`);
  };

  const handleApproveQuote = (quoteId: string) => {
    if (confirm(`¿Aprobar cotización ${quoteId}?`)) {
      alert(`Cotización ${quoteId} aprobada`);
    }
  };

  const handleRejectQuote = (quoteId: string) => {
    if (confirm(`¿Rechazar cotización ${quoteId}?`)) {
      alert(`Cotización ${quoteId} rechazada`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pre-facturación</h1>
            <p className="text-gray-600">Gestión de cotizaciones y presupuestos</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => alert('Exportando cotizaciones en PDF...')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>
              Exportar PDF
            </button>
            <button
              onClick={handleCreateQuote}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Cotización
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cotizaciones</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{quotes.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-file-list-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {quotes.filter(q => q.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100">
                <i className="ri-time-line text-xl text-yellow-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {quotes.filter(q => q.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Revisión</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {quotes.filter(q => q.status === 'under_review').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-search-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiradas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {quotes.filter(q => q.status === 'expired').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100">
                <i className="ri-calendar-line text-xl text-gray-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por cliente o número de cotización..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="under_review">En Revisión</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="expired">Expiradas</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Cotizaciones ({filteredQuotes.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Válida Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
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
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{quote.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{quote.customer}</div>
                      <div className="text-sm text-gray-500">{quote.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(quote.date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(quote.validUntil).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD$ {quote.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
                        {getStatusText(quote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewQuote(quote.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver cotización"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button
                          onClick={() => handleEditQuote(quote.id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Editar cotización"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handlePrintQuote(quote.id)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Imprimir cotización"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        <button
                          onClick={() => handleSendQuote(quote.id, quote.customerEmail)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Enviar por email"
                        >
                          <i className="ri-mail-line"></i>
                        </button>
                        {quote.status === 'approved' && (
                          <button
                            onClick={() => handleConvertToInvoice(quote.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Convertir a factura"
                          >
                            <i className="ri-file-transfer-line"></i>
                          </button>
                        )}
                        {quote.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveQuote(quote.id)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Aprobar cotización"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button
                              onClick={() => handleRejectQuote(quote.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Rechazar cotización"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDuplicateQuote(quote.id)}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Duplicar cotización"
                        >
                          <i className="ri-file-copy-line"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Eliminar cotización"
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

        {/* New Quote Modal */}
        {showNewQuoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Nueva Cotización</h3>
                  <button
                    onClick={() => setShowNewQuoteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8">
                      <option value="">Seleccionar cliente...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Válida Hasta</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Productos/Servicios</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3">
                            <select className="w-full px-2 py-1 border border-gray-300 rounded text-sm pr-8">
                              <option value="">Seleccionar producto...</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" min="1" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium">RD$ 0.00</span>
                          </td>
                          <td className="px-4 py-3">
                            <button className="text-red-600 hover:text-red-800">
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">
                    <i className="ri-add-line mr-2"></i>
                    Agregar Producto
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Términos y Condiciones</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Términos y condiciones de la cotización..."
                    ></textarea>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium">RD$ 0.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">ITBIS (18%):</span>
                        <span className="text-sm font-medium">RD$ 0.00</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold">Total:</span>
                          <span className="text-base font-semibold">RD$ 0.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewQuoteModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert('Guardando cotización como borrador...');
                    setShowNewQuoteModal(false);
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors whitespace-nowrap"
                >
                  Guardar Borrador
                </button>
                <button
                  onClick={() => {
                    alert('Creando y enviando cotización...');
                    setShowNewQuoteModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Crear Cotización
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}