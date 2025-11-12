import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function RecurringBillingPage() {
  const [showNewSubscriptionModal, setShowNewSubscriptionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const subscriptions = [
    {
      id: 'SUB-2024-001',
      customer: 'Empresa ABC SRL',
      customerEmail: 'contacto@empresaabc.com',
      service: 'Licencias de Software Mensual',
      amount: 15000,
      frequency: 'monthly',
      status: 'active',
      startDate: '2024-01-01',
      nextBilling: '2024-02-01',
      lastInvoice: 'FAC-2024-189',
      totalInvoices: 12
    },
    {
      id: 'SUB-2024-002',
      customer: 'Comercial XYZ EIRL',
      customerEmail: 'ventas@comercialxyz.com',
      service: 'Mantenimiento Trimestral',
      amount: 45000,
      frequency: 'quarterly',
      status: 'active',
      startDate: '2024-01-15',
      nextBilling: '2024-04-15',
      lastInvoice: 'FAC-2024-185',
      totalInvoices: 4
    },
    {
      id: 'SUB-2024-003',
      customer: 'Distribuidora DEF SA',
      customerEmail: 'compras@distribuidoradef.com',
      service: 'Hosting y Dominio Anual',
      amount: 120000,
      frequency: 'yearly',
      status: 'active',
      startDate: '2024-01-01',
      nextBilling: '2025-01-01',
      lastInvoice: 'FAC-2024-001',
      totalInvoices: 1
    },
    {
      id: 'SUB-2024-004',
      customer: 'Servicios GHI SRL',
      customerEmail: 'admin@serviciosghi.com',
      service: 'Soporte Técnico Mensual',
      amount: 8000,
      frequency: 'monthly',
      status: 'paused',
      startDate: '2023-12-01',
      nextBilling: '2024-02-01',
      lastInvoice: 'FAC-2023-456',
      totalInvoices: 2
    },
    {
      id: 'SUB-2024-005',
      customer: 'Tecnología JKL SA',
      customerEmail: 'info@tecnologiajkl.com',
      service: 'Backup en la Nube Semanal',
      amount: 3500,
      frequency: 'weekly',
      status: 'cancelled',
      startDate: '2023-11-01',
      nextBilling: null,
      lastInvoice: 'FAC-2024-012',
      totalInvoices: 8
    }
  ];

  const customers = [
    { id: '1', name: 'Empresa ABC SRL', email: 'contacto@empresaabc.com' },
    { id: '2', name: 'Comercial XYZ EIRL', email: 'ventas@comercialxyz.com' },
    { id: '3', name: 'Distribuidora DEF SA', email: 'compras@distribuidoradef.com' },
    { id: '4', name: 'Servicios GHI SRL', email: 'admin@serviciosghi.com' },
    { id: '5', name: 'Tecnología JKL SA', email: 'info@tecnologiajkl.com' }
  ];

  const services = [
    { id: '1', name: 'Licencias de Software', price: 15000 },
    { id: '2', name: 'Mantenimiento de Equipos', price: 45000 },
    { id: '3', name: 'Hosting y Dominio', price: 120000 },
    { id: '4', name: 'Soporte Técnico', price: 8000 },
    { id: '5', name: 'Backup en la Nube', price: 3500 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'paused': return 'Pausada';
      case 'cancelled': return 'Cancelada';
      case 'expired': return 'Expirada';
      default: return 'Desconocido';
    }
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensual';
      case 'quarterly': return 'Trimestral';
      case 'yearly': return 'Anual';
      default: return 'Desconocido';
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubscription = () => {
    setShowNewSubscriptionModal(true);
  };

  const handleViewSubscription = (subscriptionId: string) => {
    alert(`Visualizando suscripción: ${subscriptionId}`);
  };

  const handleEditSubscription = (subscriptionId: string) => {
    alert(`Editando suscripción: ${subscriptionId}`);
  };

  const handlePauseSubscription = (subscriptionId: string) => {
    if (confirm(`¿Pausar suscripción ${subscriptionId}?`)) {
      alert(`Suscripción ${subscriptionId} pausada`);
    }
  };

  const handleResumeSubscription = (subscriptionId: string) => {
    if (confirm(`¿Reanudar suscripción ${subscriptionId}?`)) {
      alert(`Suscripción ${subscriptionId} reanudada`);
    }
  };

  const handleCancelSubscription = (subscriptionId: string) => {
    if (confirm(`¿Cancelar suscripción ${subscriptionId}? Esta acción no se puede deshacer.`)) {
      alert(`Suscripción ${subscriptionId} cancelada`);
    }
  };

  const handleGenerateInvoice = (subscriptionId: string) => {
    if (confirm(`¿Generar factura para suscripción ${subscriptionId}?`)) {
      alert(`Factura generada para suscripción ${subscriptionId}`);
    }
  };

  const handleViewInvoices = (subscriptionId: string) => {
    alert(`Visualizando facturas de suscripción: ${subscriptionId}`);
  };

  const handleProcessPendingBilling = () => {
    if (confirm('¿Procesar todas las facturaciones pendientes?')) {
      alert('Procesando facturaciones pendientes...');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturación Recurrente</h1>
            <p className="text-gray-600">Gestión de suscripciones y facturación automática</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleProcessPendingBilling}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Procesar Pendientes
            </button>
            <button
              onClick={handleCreateSubscription}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Suscripción
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suscripciones Activas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {subscriptions.filter(s => s.status === 'active').length}
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
                <p className="text-sm font-medium text-gray-600">Ingresos Mensuales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  RD$ {subscriptions
                    .filter(s => s.status === 'active' && s.frequency === 'monthly')
                    .reduce((sum, s) => sum + s.amount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-money-dollar-circle-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Próximas Facturas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {subscriptions.filter(s => s.status === 'active' && s.nextBilling).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100">
                <i className="ri-calendar-line text-xl text-yellow-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Suscripciones</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{subscriptions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                <i className="ri-repeat-line text-xl text-purple-600"></i>
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
                  placeholder="Buscar por cliente, servicio o ID..."
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
                <option value="active">Activas</option>
                <option value="paused">Pausadas</option>
                <option value="cancelled">Canceladas</option>
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

        {/* Subscriptions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Suscripciones ({filteredSubscriptions.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frecuencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Próxima Factura
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
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subscription.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subscription.customer}</div>
                      <div className="text-sm text-gray-500">{subscription.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subscription.service}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD$ {subscription.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getFrequencyText(subscription.frequency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.nextBilling ? new Date(subscription.nextBilling).toLocaleDateString('es-DO') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subscription.status)}`}>
                        {getStatusText(subscription.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewSubscription(subscription.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver suscripción"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button
                          onClick={() => handleEditSubscription(subscription.id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Editar suscripción"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handleViewInvoices(subscription.id)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Ver facturas"
                        >
                          <i className="ri-file-list-line"></i>
                        </button>
                        {subscription.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleGenerateInvoice(subscription.id)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Generar factura"
                            >
                              <i className="ri-file-add-line"></i>
                            </button>
                            <button
                              onClick={() => handlePauseSubscription(subscription.id)}
                              className="text-yellow-600 hover:text-yellow-900 p-1"
                              title="Pausar suscripción"
                            >
                              <i className="ri-pause-line"></i>
                            </button>
                          </>
                        )}
                        {subscription.status === 'paused' && (
                          <button
                            onClick={() => handleResumeSubscription(subscription.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Reanudar suscripción"
                          >
                            <i className="ri-play-line"></i>
                          </button>
                        )}
                        {subscription.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelSubscription(subscription.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Cancelar suscripción"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Subscription Modal */}
        {showNewSubscriptionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Nueva Suscripción</h3>
                  <button
                    onClick={() => setShowNewSubscriptionModal(false)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Servicio</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8">
                      <option value="">Seleccionar servicio...</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8">
                      <option value="">Seleccionar frecuencia...</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Inicio</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Fin (Opcional)</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del Servicio</label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción detallada del servicio..."
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewSubscriptionModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert('Creando nueva suscripción...');
                    setShowNewSubscriptionModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Crear Suscripción
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}