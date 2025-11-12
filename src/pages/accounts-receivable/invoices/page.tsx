import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  daysOverdue: number;
}

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Mock data
  const invoices: Invoice[] = [
    {
      id: '1',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      invoiceNumber: 'FAC-001',
      date: '2024-01-01',
      dueDate: '2024-01-31',
      amount: 100000,
      paidAmount: 50000,
      balance: 50000,
      status: 'partial',
      daysOverdue: 0
    },
    {
      id: '2',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      invoiceNumber: 'FAC-002',
      date: '2023-12-15',
      dueDate: '2024-01-14',
      amount: 75000,
      paidAmount: 0,
      balance: 75000,
      status: 'overdue',
      daysOverdue: 15
    },
    {
      id: '3',
      customerId: '2',
      customerName: 'Comercial XYZ',
      invoiceNumber: 'FAC-003',
      date: '2024-01-10',
      dueDate: '2024-02-09',
      amount: 85000,
      paidAmount: 0,
      balance: 85000,
      status: 'pending',
      daysOverdue: 0
    },
    {
      id: '4',
      customerId: '3',
      customerName: 'Distribuidora DEF',
      invoiceNumber: 'FAC-004',
      date: '2024-01-05',
      dueDate: '2024-02-04',
      amount: 45000,
      paidAmount: 0,
      balance: 45000,
      status: 'pending',
      daysOverdue: 0
    },
    {
      id: '5',
      customerId: '2',
      customerName: 'Comercial XYZ',
      invoiceNumber: 'FAC-005',
      date: '2023-12-20',
      dueDate: '2024-01-19',
      amount: 120000,
      paidAmount: 120000,
      balance: 0,
      status: 'paid',
      daysOverdue: 0
    }
  ];

  const customers = [
    { id: '1', name: 'Empresa ABC S.R.L.' },
    { id: '2', name: 'Comercial XYZ' },
    { id: '3', name: 'Distribuidora DEF' },
    { id: '4', name: 'Servicios GHI' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'partial': return 'Parcial';
      case 'pending': return 'Pendiente';
      case 'overdue': return 'Vencida';
      default: return 'Desconocido';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Facturas por Cobrar', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Estado: ${statusFilter === 'all' ? 'Todos' : statusFilter}`, 20, 50);
    
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalBalance = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    
    doc.setFontSize(14);
    doc.text('Resumen Financiero', 20, 70);
    
    const summaryData = [
      ['Concepto', 'Monto'],
      ['Total Facturado', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Pagado', `RD$ ${totalPaid.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Número de Facturas', filteredInvoices.length.toString()]
    ];
    
    (doc as any).autoTable({
      startY: 80,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });
    
    doc.setFontSize(14);
    doc.text('Detalle de Facturas', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const invoiceData = filteredInvoices.map(invoice => [
      invoice.invoiceNumber,
      invoice.customerName,
      invoice.date,
      invoice.dueDate,
      `RD$ ${invoice.amount.toLocaleString()}`,
      `RD$ ${invoice.paidAmount.toLocaleString()}`,
      `RD$ ${invoice.balance.toLocaleString()}`,
      getStatusName(invoice.status)
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Factura', 'Cliente', 'Fecha', 'Vencimiento', 'Monto', 'Pagado', 'Saldo', 'Estado']],
      body: invoiceData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 }
    });
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${pageCount}`, 20, doc.internal.pageSize.height - 10);
      doc.text('Sistema de Gestión Empresarial', doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`facturas-por-cobrar-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalBalance = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    
    const csvContent = [
      ['Reporte de Facturas por Cobrar'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [`Estado: ${statusFilter === 'all' ? 'Todos' : statusFilter}`],
      [''],
      ['RESUMEN FINANCIERO'],
      ['Total Facturado', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Pagado', `RD$ ${totalPaid.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Número de Facturas', filteredInvoices.length.toString()],
      [''],
      ['DETALLE DE FACTURAS'],
      ['Factura', 'Cliente', 'Fecha', 'Vencimiento', 'Monto', 'Pagado', 'Saldo', 'Estado', 'Días Vencido'],
      ...filteredInvoices.map(invoice => [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.date,
        invoice.dueDate,
        invoice.amount,
        invoice.paidAmount,
        invoice.balance,
        getStatusName(invoice.status),
        invoice.daysOverdue
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facturas-por-cobrar-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewInvoice = () => {
    setSelectedInvoice(null);
    setShowInvoiceModal(true);
  };

  const handleRegisterPayment = (invoice?: Invoice) => {
    setSelectedInvoice(invoice || null);
    setShowPaymentModal(true);
  };

  const handleViewInvoice = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      alert(`Detalles de la factura ${invoice.invoiceNumber}:\n\nCliente: ${invoice.customerName}\nMonto: RD$ ${invoice.amount.toLocaleString()}\nSaldo: RD$ ${invoice.balance.toLocaleString()}\nEstado: ${getStatusName(invoice.status)}`);
    }
  };

  const handlePrintInvoice = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      alert(`Imprimiendo factura ${invoice.invoiceNumber}...`);
    }
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Factura creada exitosamente');
    setShowInvoiceModal(false);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Pago registrado exitosamente');
    setShowPaymentModal(false);
    setSelectedInvoice(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Facturas por Cobrar</h1>
          <div className="flex space-x-3">
            <button 
              onClick={handleNewInvoice}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Factura
            </button>
            <button 
              onClick={() => handleRegisterPayment()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-money-dollar-circle-line mr-2"></i>
              Registrar Pago
            </button>
          </div>
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
                placeholder="Buscar por cliente o número de factura..."
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
              <option value="pending">Pendientes</option>
              <option value="partial">Parciales</option>
              <option value="paid">Pagadas</option>
              <option value="overdue">Vencidas</option>
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

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
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
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.dueDate}
                      {invoice.daysOverdue > 0 && (
                        <span className="ml-2 text-red-600 text-xs">
                          ({invoice.daysOverdue} días)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${invoice.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${invoice.paidAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${invoice.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusName(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRegisterPayment(invoice)}
                          className="text-green-600 hover:text-green-900"
                          title="Registrar Pago"
                        >
                          <i className="ri-money-dollar-circle-line"></i>
                        </button>
                        <button 
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="text-blue-600 hover:text-blue-900" 
                          title="Ver Detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button 
                          onClick={() => handlePrintInvoice(invoice.id)}
                          className="text-purple-600 hover:text-purple-900" 
                          title="Imprimir"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Invoice Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nueva Factura</h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSaveInvoice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente
                    </label>
                    <select 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Seleccionar cliente</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción de los productos o servicios..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Factura
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Registrar Pago</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              {selectedInvoice && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Factura: <span className="font-medium">{selectedInvoice.invoiceNumber}</span></p>
                  <p className="text-sm text-gray-600">Cliente: <span className="font-medium">{selectedInvoice.customerName}</span></p>
                  <p className="text-lg font-semibold text-blue-600">Saldo: RD${selectedInvoice.balance.toLocaleString()}</p>
                </div>
              )}
              
              <form onSubmit={handleSavePayment} className="space-y-4">
                {!selectedInvoice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Factura
                    </label>
                    <select 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Seleccionar factura</option>
                      {invoices.filter(inv => inv.balance > 0).map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - {invoice.customerName} (RD${invoice.balance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Pagar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    max={selectedInvoice?.balance || undefined}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="check">Cheque</option>
                    <option value="transfer">Transferencia</option>
                    <option value="card">Tarjeta</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Número de referencia"
                  />
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedInvoice(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Registrar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}