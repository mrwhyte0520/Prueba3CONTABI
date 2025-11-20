import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, invoicesService, recurringSubscriptionsService } from '../../../services/database';

export default function RecurringBillingPage() {
  const { user } = useAuth();
  const [showNewSubscriptionModal, setShowNewSubscriptionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  const [formErrors, setFormErrors] = useState<{ customer?: string; service?: string; amount?: string; frequency?: string; startDate?: string }>({});

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [subs, custs] = await Promise.all([
        recurringSubscriptionsService.getAll(user.id),
        customersService.getAll(user.id),
      ]);

      setSubscriptions(subs);
      setCustomers(custs.map((c: any) => ({ id: c.id, name: c.name, email: c.email })));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading recurring billing data:', error);
      toast.error('Error al cargar las suscripciones recurrentes');
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    const customerName = customers.find(c => c.id === subscription.customer_id)?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(subscription.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (subscription.service_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubscription = () => {
    setEditingSubscriptionId(null);
    setSelectedCustomerId('');
    setServiceName('');
    setAmount('');
    setFrequency('');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setFormErrors({});
    setShowNewSubscriptionModal(true);
  };

  const handleViewSubscription = (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return;

    setEditingSubscriptionId(subscriptionId);
    setSelectedCustomerId(sub.customer_id || '');
    setServiceName(sub.service_name || '');
    setAmount(Number(sub.amount) || '');
    setFrequency(sub.frequency || '');
    setStartDate(sub.start_date || '');
    setEndDate(sub.end_date || '');
    setDescription(sub.description || '');
    setFormErrors({});
    setShowNewSubscriptionModal(true);
  };

  const handleEditSubscription = (subscriptionId: string) => {
    handleViewSubscription(subscriptionId);
  };

  const handlePauseSubscription = async (subscriptionId: string) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para pausar suscripciones');
      return;
    }
    if (!confirm(`¿Pausar suscripción ${subscriptionId}?`)) return;
    try {
      await recurringSubscriptionsService.update(subscriptionId, { status: 'paused' });
      await loadData();
      toast.success(`Suscripción ${subscriptionId} pausada`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error pausing subscription:', error);
      toast.error('Error al pausar la suscripción');
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para reanudar suscripciones');
      return;
    }
    if (!confirm(`¿Reanudar suscripción ${subscriptionId}?`)) return;
    try {
      await recurringSubscriptionsService.update(subscriptionId, { status: 'active' });
      await loadData();
      toast.success(`Suscripción ${subscriptionId} reanudada`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error resuming subscription:', error);
      toast.error('Error al reanudar la suscripción');
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para cancelar suscripciones');
      return;
    }
    if (!confirm(`¿Cancelar suscripción ${subscriptionId}? Esta acción no se puede deshacer.`)) return;
    try {
      await recurringSubscriptionsService.update(subscriptionId, { status: 'cancelled' });
      await loadData();
      toast.success(`Suscripción ${subscriptionId} cancelada`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cancelling subscription:', error);
      toast.error('Error al cancelar la suscripción');
    }
  };

  const handleGenerateInvoice = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return;
    if (!user?.id) {
      toast.error('Debes iniciar sesión para generar facturas');
      return;
    }
    if (!sub.customer_id) {
      toast.error('La suscripción no tiene un cliente válido');
      return;
    }

    if (!confirm(`¿Generar factura para suscripción ${subscriptionId}?`)) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const amt = Number(sub.amount) || 0;
      const invoicePayload = {
        customer_id: sub.customer_id,
        invoice_number: `SUB-${Date.now()}`,
        invoice_date: today,
        due_date: today,
        currency: 'DOP',
        subtotal: amt,
        tax_amount: 0,
        total_amount: amt,
        paid_amount: 0,
        status: 'pending',
        notes: `Factura recurrente para: ${sub.service_name || 'Suscripción'}`,
      };

      const linesPayload = [
        {
          description: sub.service_name || 'Servicio recurrente',
          quantity: 1,
          unit_price: amt,
          line_total: amt,
          line_number: 1,
        },
      ];

      const { invoice } = await invoicesService.create(user.id, invoicePayload, linesPayload);

      // Avanzar próxima fecha usando el helper de processPending (aquí lo calculamos manualmente)
      let nextDate: string | null = null;
      if (sub.next_billing_date) {
        const d = new Date(sub.next_billing_date as string);
        if (sub.frequency === 'weekly') d.setDate(d.getDate() + 7);
        else if (sub.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (sub.frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
        else if (sub.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
        nextDate = d.toISOString().slice(0, 10);
      }

      await recurringSubscriptionsService.update(subscriptionId, {
        last_invoice_id: invoice.id,
        next_billing_date: nextDate,
      });

      await loadData();
      toast.success(`Factura generada para suscripción ${subscriptionId}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating invoice for subscription:', error);
      toast.error('Error al generar la factura de la suscripción');
    }
  };

  const handleViewInvoices = async (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    if (!sub) return;
    if (!user?.id) {
      toast.error('Debes iniciar sesión para ver facturas');
      return;
    }

    try {
      const allInvoices = await invoicesService.getAll(user.id);
      const customerInvoices = allInvoices.filter((inv: any) => inv.customer_id === sub.customer_id);

      if (customerInvoices.length === 0) {
        toast.info('No hay facturas registradas para esta suscripción (cliente)');
        return;
      }

      const total = customerInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
      toast.info(`Facturas para este cliente/suscripción: ${customerInvoices.length} | Total: RD$ ${total.toLocaleString()}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading invoices for subscription:', error);
      toast.error('Error al cargar las facturas de la suscripción');
    }
  };

  const handleProcessPendingBilling = async () => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para procesar facturaciones');
      return;
    }
    if (!confirm('¿Procesar todas las facturaciones pendientes?')) return;
    try {
      const result = await recurringSubscriptionsService.processPending(user.id);
      await loadData();
      toast.success(`Facturaciones procesadas: ${result?.processed ?? 0}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error processing pending recurring billing:', error);
      toast.error('Error al procesar las facturaciones pendientes');
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
                    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
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
                  {subscriptions.filter(s => s.status === 'active' && s.next_billing_date).length}
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
                {filteredSubscriptions.map((subscription) => {
                  const customer = customers.find(c => c.id === subscription.customer_id);
                  const customerName = customer?.name || '';
                  const customerEmail = customer?.email || '';

                  return (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subscription.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customerName}</div>
                      <div className="text-sm text-gray-500">{customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{subscription.service_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD$ {Number(subscription.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getFrequencyText(subscription.frequency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.next_billing_date ? new Date(subscription.next_billing_date).toLocaleDateString('es-DO') : 'N/A'}
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
                );
                })}
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
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Seleccionar cliente...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                    {formErrors.customer && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.customer}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Servicio</label>
                    <input
                      type="text"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="Nombre del servicio"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formErrors.service && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.service}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                    <input
                      type="number"
                      value={amount === '' ? '' : amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formErrors.amount && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Seleccionar frecuencia...</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                    </select>
                    {formErrors.frequency && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.frequency}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formErrors.startDate && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.startDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Fin (Opcional)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del Servicio</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  onClick={async () => {
                    if (!user?.id) {
                      toast.error('Debes iniciar sesión para crear suscripciones');
                      return;
                    }

                    const errors: typeof formErrors = {};
                    if (!selectedCustomerId) errors.customer = 'Selecciona un cliente';
                    if (!serviceName.trim()) errors.service = 'Ingresa el nombre del servicio';
                    if (amount === '' || Number(amount) <= 0) errors.amount = 'Ingresa un monto mayor que 0';
                    if (!frequency) errors.frequency = 'Selecciona la frecuencia';
                    if (!startDate) errors.startDate = 'Selecciona la fecha de inicio';

                    setFormErrors(errors);
                    if (Object.keys(errors).length > 0) return;

                    try {
                      if (editingSubscriptionId) {
                        await recurringSubscriptionsService.update(editingSubscriptionId, {
                          customer_id: selectedCustomerId,
                          service_name: serviceName,
                          amount: Number(amount) || 0,
                          frequency,
                          start_date: startDate,
                          end_date: endDate || null,
                          description: description || null,
                        });
                      } else {
                        await recurringSubscriptionsService.create(user.id, {
                          customer_id: selectedCustomerId,
                          service_name: serviceName,
                          amount: Number(amount) || 0,
                          frequency,
                          start_date: startDate,
                          end_date: endDate || null,
                          next_billing_date: startDate,
                          status: 'active',
                          description: description || null,
                        });
                      }

                      await loadData();
                      setShowNewSubscriptionModal(false);
                      toast.success(editingSubscriptionId ? 'Suscripción actualizada correctamente' : 'Suscripción creada correctamente');
                    } catch (error) {
                      // eslint-disable-next-line no-console
                      console.error('Error saving subscription:', error);
                      toast.error('Error al guardar la suscripción');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  {editingSubscriptionId ? 'Guardar Cambios' : 'Crear Suscripción'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}