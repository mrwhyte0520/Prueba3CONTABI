import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, chartAccountsService, salesRepsService } from '../../../services/database';

interface Customer {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  currentBalance: number;
  status: 'active' | 'inactive' | 'blocked';
  arAccountId?: string | null;
  advanceAccountId?: string | null;
  documentType?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  customerType?: string | null;
  paymentTerms?: string | null;
  invoiceType?: string | null;
  ncfType?: string | null;
  salesperson?: string | null;
  salesRepId?: string | null;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);

  const loadCustomers = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await customersService.getAll(user.id);
      setCustomers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      await loadCustomers();
      if (!user?.id) return;
      const [accs, reps] = await Promise.all([
        chartAccountsService.getAll(user.id),
        salesRepsService.getAll(user.id),
      ]);
      setAccounts(accs || []);
      setSalesReps((reps || []).filter((r: any) => r.is_active));
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cuentas por cobrar permitidas para clientes: cuentas de activo posteables que contengan "Cuentas por Cobrar" en el nombre
  const receivableAccounts = accounts.filter((acc) => {
    if (!acc.allowPosting) return false;
    if (acc.type !== 'asset') return false;
    const name = String(acc.name || '').toLowerCase();
    return name.includes('cuentas por cobrar');
  });

  // Cuentas de anticipos de clientes: cuentas de pasivo posteables (opcionalmente que contengan "anticipo" en el nombre)
  const advanceAccounts = accounts.filter((acc) => {
    if (!acc.allowPosting) return false;
    if (acc.type !== 'liability') return false;
    const name = String(acc.name || '').toLowerCase();
    // Si el catálogo tiene nombres específicos, esto ayuda a filtrar; si no, al menos se limita a pasivos posteables
    return name.includes('anticipo') || name.includes('anticipos') || true;
  });

  const getCustomerStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerStatusName = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'blocked': return 'Bloqueado';
      default: return 'Desconocido';
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.document.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Clientes', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalBalance = customers.reduce((sum, c) => sum + c.currentBalance, 0);
    
    doc.setFontSize(14);
    doc.text('Estadísticas de Clientes', 20, 60);
    
    const statsData = [
      ['Concepto', 'Valor'],
      ['Total de Clientes', customers.length.toString()],
      ['Clientes Activos', activeCustomers.toString()],
      ['Límite de Crédito Total', `RD$ ${totalCreditLimit.toLocaleString()}`],
      ['Saldo Total Pendiente', `RD$ ${totalBalance.toLocaleString()}`]
    ];
    
    (doc as any).autoTable({
      startY: 70,
      head: [statsData[0]],
      body: statsData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.setFontSize(14);
    doc.text('Detalle de Clientes', 20, (((doc as any).lastAutoTable?.finalY) ?? 70) + 20);
    
    const customerData = filteredCustomers.map(customer => [
      customer.name,
      customer.document,
      customer.phone,
      customer.email,
      `RD$ ${customer.creditLimit.toLocaleString()}`,
      `RD$ ${customer.currentBalance.toLocaleString()}`,
      getCustomerStatusName(customer.status)
    ]);
    
    (doc as any).autoTable({
      startY: ((((doc as any).lastAutoTable?.finalY) ?? 70) + 30),
      head: [['Cliente', 'Documento', 'Teléfono', 'Email', 'Límite Crédito', 'Saldo Actual', 'Estado']],
      body: customerData,
      theme: 'striped',
      headStyles: { fillColor: [168, 85, 247] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`clientes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalBalance = customers.reduce((sum, c) => sum + c.currentBalance, 0);
    
    const csvContent = [
      ['Reporte de Clientes'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [''],
      ['ESTADÍSTICAS'],
      ['Total de Clientes', customers.length.toString()],
      ['Clientes Activos', activeCustomers.toString()],
      ['Límite de Crédito Total', `RD$ ${totalCreditLimit.toLocaleString()}`],
      ['Saldo Total Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      [''],
      ['DETALLE DE CLIENTES'],
      ['Cliente', 'Documento', 'Teléfono', 'Email', 'Dirección', 'Límite Crédito', 'Saldo Actual', 'Estado'],
      ...filteredCustomers.map(customer => [
        customer.name,
        customer.document,
        customer.phone,
        customer.email,
        customer.address,
        customer.creditLimit,
        customer.currentBalance,
        getCustomerStatusName(customer.status)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  const handleCustomerStatement = (customer: Customer) => {
    alert(`Estado de cuenta para ${customer.name}:\n\nSaldo actual: RD$ ${customer.currentBalance.toLocaleString()}\nLímite de crédito: RD$ ${customer.creditLimit.toLocaleString()}`);
  };

  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Debes iniciar sesión para guardar clientes');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get('name') || ''),
      document: String(formData.get('document') || ''),
      phone: String(formData.get('phone') || ''),
      email: String(formData.get('email') || ''),
      address: String(formData.get('address') || ''),
      creditLimit: Number(formData.get('creditLimit') || 0),
      status: String(formData.get('status') || 'active') as Customer['status'],
      arAccountId: String(formData.get('arAccountId') || ''),
      advanceAccountId: String(formData.get('advanceAccountId') || ''),
      documentType: String(formData.get('documentType') || ''),
      contactName: String(formData.get('contactName') || ''),
      contactPhone: String(formData.get('contactPhone') || ''),
      contactEmail: String(formData.get('contactEmail') || ''),
      customerType: String(formData.get('customerType') || ''),
      paymentTerms: String(formData.get('paymentTerms') || ''),
      invoiceType: String(formData.get('invoiceType') || ''),
      ncfType: String(formData.get('ncfType') || ''),
      salesperson: String(formData.get('salesperson') || ''),
      salesRepId: String(formData.get('salesRepId') || '') || null,
    };
    try {
      if (selectedCustomer) {
        await customersService.update(selectedCustomer.id, payload);
      } else {
        await customersService.create(user.id, payload);
      }
      await loadCustomers();
      alert(selectedCustomer ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente');
      setShowCustomerModal(false);
      setSelectedCustomer(null);
    } catch {
      alert('Error al guardar el cliente');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
          <button 
            onClick={handleNewCustomer}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-user-add-line mr-2"></i>
            Nuevo Cliente
          </button>
        </div>

        {/* Filters and Export */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Buscar por nombre o documento..."
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="blocked">Bloqueados</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={exportToPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>PDF
            </button>
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>Excel
            </button>
          </div>
        </div>

        {/* Customers Table */}
        {loading && (
          <div className="mb-2 text-sm text-gray-500">Cargando clientes...</div>
        )}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Límite Crédito
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Actual
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
                {filteredCustomers.map((customer) => {
                  const rep = salesReps.find((r) => r.id === customer.salesRepId);
                  return (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.address}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.document}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.contactName || customer.phone}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer.contactPhone || ''}{customer.contactPhone && customer.contactEmail ? ' / ' : ''}{customer.contactEmail || customer.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rep ? rep.name : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${customer.creditLimit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${customer.currentBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCustomerStatusColor(customer.status)}`}>
                        {getCustomerStatusName(customer.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar cliente"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button 
                          onClick={() => handleViewCustomer(customer)}
                          className="text-green-600 hover:text-green-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button 
                          onClick={() => handleCustomerStatement(customer)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Estado de cuenta"
                        >
                          <i className="ri-file-list-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Modal */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setSelectedCustomer(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre/Razón Social
                    </label>
                    <input
                      type="text"
                      required
                      name="name"
                      defaultValue={selectedCustomer?.name || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del cliente"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RNC/Cédula
                    </label>
                    <input
                      type="text"
                      required
                      name="document"
                      defaultValue={selectedCustomer?.document || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="000-0000000-0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      required
                      name="phone"
                      defaultValue={selectedCustomer?.phone || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="809-000-0000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      name="email"
                      defaultValue={selectedCustomer?.email || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="cliente@email.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <textarea
                    rows={2}
                    name="address"
                    defaultValue={selectedCustomer?.address || ''}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Dirección completa del cliente"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Límite de Crédito
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="creditLimit"
                      defaultValue={selectedCustomer?.creditLimit || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select 
                      name="status"
                      defaultValue={selectedCustomer?.status || 'active'}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Cliente
                    </label>
                    <select
                      name="customerType"
                      defaultValue={(selectedCustomer as any)?.customerType || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">No especificado</option>
                      <option value="retail">Detalle</option>
                      <option value="wholesale">Mayorista</option>
                      <option value="government">Gobierno</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condición de Pago
                    </label>
                    <select
                      name="paymentTerms"
                      defaultValue={(selectedCustomer as any)?.paymentTerms || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">No especificada</option>
                      <option value="contado">Contado</option>
                      <option value="15">15 días</option>
                      <option value="30">30 días</option>
                      <option value="45">45 días</option>
                      <option value="60">60 días</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Factura
                    </label>
                    <select
                      name="invoiceType"
                      defaultValue={(selectedCustomer as any)?.invoiceType || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">No especificado</option>
                      <option value="credit">Crédito</option>
                      <option value="cash">Contado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de NCF por defecto
                    </label>
                    <select
                      name="ncfType"
                      defaultValue={(selectedCustomer as any)?.ncfType || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">No especificado</option>
                      <option value="consumo">Consumidor final</option>
                      <option value="credito_fiscal">Crédito fiscal</option>
                      <option value="gubernamental">Gubernamental</option>
                      <option value="especial">Régimen especial</option>
                      <option value="exportacion">Exportación</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendedor asignado (opcional)
                  </label>
                  <select
                    name="salesRepId"
                    defaultValue={(selectedCustomer as any)?.salesRepId || ''}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Sin vendedor asignado</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>{rep.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del vendedor (texto opcional)
                  </label>
                  <input
                    type="text"
                    name="salesperson"
                    defaultValue={(selectedCustomer as any)?.salesperson || ''}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Por ejemplo, para comentarios internos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta por Cobrar (opcional)
                  </label>
                  <select
                    name="arAccountId"
                    defaultValue={(selectedCustomer as any)?.arAccountId || ''}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Usar cuenta por defecto</option>
                    {receivableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Si no seleccionas una cuenta, se usará la cuenta por cobrar configurada por defecto.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de Anticipos de Cliente (opcional)
                  </label>
                  <select
                    name="advanceAccountId"
                    defaultValue={selectedCustomer?.advanceAccountId || ''}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Sin cuenta de anticipos específica</option>
                    {advanceAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Si no seleccionas una cuenta, los anticipos del cliente usarán solo la configuración global o generarán alertas al registrar el anticipo.
                  </p>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerModal(false);
                      setSelectedCustomer(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    {selectedCustomer ? 'Actualizar' : 'Crear'} Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Customer Details Modal */}
        {showCustomerDetails && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Detalles del Cliente</h3>
                <button
                  onClick={() => {
                    setShowCustomerDetails(false);
                    setSelectedCustomer(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nombre/Razón Social</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedCustomer.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">RNC/Cédula</label>
                    <p className="text-gray-900">{selectedCustomer.document}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Teléfono</label>
                    <p className="text-gray-900">{selectedCustomer.phone}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedCustomer.email}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Dirección</label>
                    <p className="text-gray-900">{selectedCustomer.address}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Límite de Crédito</label>
                    <p className="text-lg font-semibold text-blue-600">RD${selectedCustomer.creditLimit.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Saldo Actual</label>
                    <p className="text-lg font-semibold text-red-600">RD${selectedCustomer.currentBalance.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Estado</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCustomerStatusColor(selectedCustomer.status)}`}>
                      {getCustomerStatusName(selectedCustomer.status)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCustomerDetails(false);
                    setShowCustomerModal(true);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-edit-line mr-2"></i>
                  Editar Cliente
                </button>
                <button
                  onClick={() => handleCustomerStatement(selectedCustomer)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-file-list-line mr-2"></i>
                  Estado de Cuenta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}