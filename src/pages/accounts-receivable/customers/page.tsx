import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
}

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Mock data
  const customers: Customer[] = [
    {
      id: '1',
      name: 'Empresa ABC S.R.L.',
      document: '131-12345-6',
      phone: '809-123-4567',
      email: 'contacto@empresaabc.com',
      address: 'Av. 27 de Febrero, Santo Domingo',
      creditLimit: 500000,
      currentBalance: 125000,
      status: 'active'
    },
    {
      id: '2',
      name: 'Comercial XYZ',
      document: '131-23456-7',
      phone: '809-234-5678',
      email: 'ventas@comercialxyz.com',
      address: 'Calle Mercedes, Santiago',
      creditLimit: 300000,
      currentBalance: 85000,
      status: 'active'
    },
    {
      id: '3',
      name: 'Distribuidora DEF',
      document: '131-34567-8',
      phone: '809-345-6789',
      email: 'info@distribuidoradef.com',
      address: 'Av. Independencia, La Vega',
      creditLimit: 200000,
      currentBalance: 45000,
      status: 'active'
    },
    {
      id: '4',
      name: 'Servicios GHI',
      document: '131-45678-9',
      phone: '809-456-7890',
      email: 'servicios@ghi.com',
      address: 'Calle Duarte, San Cristóbal',
      creditLimit: 150000,
      currentBalance: 0,
      status: 'inactive'
    }
  ];

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

  const exportToPDF = () => {
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
    doc.text('Detalle de Clientes', 20, (doc as any).lastAutoTable.finalY + 20);
    
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
      startY: (doc as any).lastAutoTable.finalY + 30,
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

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    alert(selectedCustomer ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente');
    setShowCustomerModal(false);
    setSelectedCustomer(null);
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
                {filteredCustomers.map((customer) => (
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
                      <div>
                        <div className="text-sm text-gray-900">{customer.phone}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
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
                ))}
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
                      defaultValue={selectedCustomer?.status || 'active'}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </div>
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