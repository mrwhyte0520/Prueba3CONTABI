import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, invoicesService } from '../../../services/database';

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
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const loadCustomers = async () => {
    if (!user?.id) return;
    setLoadingCustomers(true);
    try {
      const list = await customersService.getAll(user.id);
      setCustomers(list.map(c => ({ id: c.id, name: c.name })));
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadInvoices = async () => {
    if (!user?.id) return;
    setLoadingInvoices(true);
    try {
      const data = await invoicesService.getAll(user.id as string);
      const mapped: Invoice[] = (data as any[]).map((inv) => {
        const total = Number(inv.total_amount) || 0;
        const paid = Number(inv.paid_amount) || 0;
        const balance = total - paid;
        const today = new Date();
        const due = inv.due_date ? new Date(inv.due_date) : null;
        let daysOverdue = 0;
        if (due && balance > 0) {
          const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          daysOverdue = diff > 0 ? diff : 0;
        }
        return {
          id: String(inv.id),
          customerId: String(inv.customer_id),
          customerName: (inv.customers as any)?.name || 'Cliente',
          invoiceNumber: inv.invoice_number as string,
          date: inv.invoice_date as string,
          dueDate: inv.due_date as string,
          amount: total,
          paidAmount: paid,
          balance,
          status: (inv.status as Invoice['status']) || 'pending',
          daysOverdue,
        };
      });
      setInvoices(mapped);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Debes iniciar sesión para crear facturas');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const customerId = String(formData.get('customer_id') || '');
    const dueDate = String(formData.get('due_date') || '');
    const description = String(formData.get('description') || '');
    const amount = Number(formData.get('amount') || 0);

    if (!customerId || !amount) {
      alert('Cliente y monto son obligatorios');
      return;
    }

    // Debug trace
    // eslint-disable-next-line no-console
    console.log('[Invoices] handleSaveInvoice payload', { customerId, dueDate, description, amount });

    const todayStr = new Date().toISOString().slice(0, 10);
    const invoiceNumber = `FAC-${Date.now()}`;

    const invoicePayload = {
      customer_id: customerId,
      invoice_number: invoiceNumber,
      invoice_date: todayStr,
      due_date: dueDate || null,
      currency: 'DOP',
      subtotal: amount,
      tax_amount: 0,
      total_amount: amount,
      paid_amount: 0,
      status: 'pending',
      notes: description,
    };

    const linesPayload = [
      {
        description: description || 'Servicio/Producto',
        quantity: 1,
        unit_price: amount,
        line_total: amount,
      },
    ];

    try {
      await invoicesService.create(user.id, invoicePayload, linesPayload);
      await loadInvoices();
      alert('Factura creada exitosamente');
      setShowInvoiceModal(false);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[Invoices] Error al crear factura', error);
      alert(`Error al crear la factura: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user?.id) {
      alert('Debes iniciar sesión para registrar pagos');
      return;
    }

    const formData = new FormData(e.currentTarget);

    // Si se abrió desde una fila, usamos esa factura; si no, tomamos la del select
    const invoiceId = selectedInvoice
      ? selectedInvoice.id
      : String(formData.get('invoice_id') || '');

    const amountToPay = Number(formData.get('amount_to_pay') || 0);

    if (!invoiceId) {
      alert('Debes seleccionar una factura');
      return;
    }

    if (!amountToPay || amountToPay <= 0) {
      alert('El monto a pagar debe ser mayor que 0');
      return;
    }

    const currentInvoice = invoices.find((inv) => inv.id === invoiceId);
    if (!currentInvoice) {
      alert('La factura seleccionada no es válida');
      return;
    }

    if (amountToPay > currentInvoice.balance) {
      alert('El monto a pagar no puede ser mayor que el saldo de la factura');
      return;
    }

    const newPaid = currentInvoice.paidAmount + amountToPay;
    const newBalance = currentInvoice.amount - newPaid;
    const newStatus: Invoice['status'] = newBalance > 0 ? 'partial' : 'paid';

    try {
      await invoicesService.updatePayment(invoiceId, newPaid, newStatus);
      await loadInvoices();
      alert('Pago registrado exitosamente');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[Invoices] Error al registrar pago', error);
      alert(`Error al registrar el pago: ${error?.message || 'revisa la consola para más detalles'}`);
    }
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
          {(loadingCustomers || loadingInvoices) && (
            <div className="px-6 pt-3 text-sm text-gray-500">Cargando datos...</div>
          )}
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
                      name="customer_id"
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
                      name="due_date"
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
                    name="description"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción de los productos o servicios..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto
                  </label>
                  <input
                    type="number" min="0"
                    step="0.01"
                    required
                    name="amount"
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
                      name="invoice_id"
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
                    type="number" min="0"
                    step="0.01"
                    required
                    name="amount_to_pay"
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
                    name="payment_method"
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
                    name="reference"
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