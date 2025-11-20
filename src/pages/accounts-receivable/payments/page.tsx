import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../../hooks/useAuth';
import { customerPaymentsService, invoicesService, bankAccountsService, accountingSettingsService, journalEntriesService } from '../../../services/database';

interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'transfer' | 'card';
  date: string;
  reference: string;
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  customerName: string;
  balance: number;
  customerId: string;
}

interface BankAccountOption {
  id: string;
  name: string;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [paymentsData, invoicesData, bankAccountsData] = await Promise.all([
          customerPaymentsService.getAll(user.id),
          invoicesService.getAll(user.id),
          bankAccountsService.getAll(user.id),
        ]);

        const mappedPayments: Payment[] = (paymentsData || []).map((p: any) => ({
          id: p.id,
          customerId: p.customer_id,
          customerName: p.customers?.name || '',
          invoiceId: p.invoice_id,
          invoiceNumber: p.invoices?.invoice_number || '',
          amount: Number(p.amount) || 0,
          paymentMethod: p.payment_method,
          date: p.payment_date,
          reference: p.reference || '',
        }));
        setPayments(mappedPayments);

        const mappedInvoices: InvoiceOption[] = (invoicesData || [])
          .filter((inv: any) => inv.status !== 'Cancelada')
          .map((inv: any) => {
            const total = Number(inv.total_amount) || 0;
            const paid = Number(inv.paid_amount) || 0;
            return {
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              customerName: inv.customers?.name || '',
              customerId: inv.customer_id,
              balance: Math.max(total - paid, 0),
            };
          });
        setInvoices(mappedInvoices);

        const mappedBankAccounts: BankAccountOption[] = (bankAccountsData || []).map((ba: any) => ({
          id: ba.id,
          name: `${ba.bank_name} - ${ba.account_number}`,
        }));
        setBankAccounts(mappedBankAccounts);
      } catch (error) {
        console.error('Error loading customer payments:', error);
      }
    };

    loadData();
  }, [user]);

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'check': return 'Cheque';
      case 'transfer': return 'Transferencia';
      case 'card': return 'Tarjeta';
      default: return 'Otro';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'check': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'card': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Pagos Recibidos', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    
    const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const paymentsByMethod = filteredPayments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);
    
    doc.setFontSize(14);
    doc.text('Resumen de Pagos', 20, 60);
    
    const summaryData = [
      ['Concepto', 'Monto'],
      ['Total Recibido', `RD$ ${totalPayments.toLocaleString()}`],
      ['Número de Pagos', filteredPayments.length.toString()],
      ['Efectivo', `RD$ ${(paymentsByMethod.cash || 0).toLocaleString()}`],
      ['Transferencias', `RD$ ${(paymentsByMethod.transfer || 0).toLocaleString()}`],
      ['Cheques', `RD$ ${(paymentsByMethod.check || 0).toLocaleString()}`],
      ['Tarjetas', `RD$ ${(paymentsByMethod.card || 0).toLocaleString()}`]
    ];
    
    (doc as any).autoTable({
      startY: 70,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }
    });
    
    doc.setFontSize(14);
    doc.text('Detalle de Pagos', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const paymentData = filteredPayments.map(payment => [
      payment.date,
      payment.customerName,
      payment.invoiceNumber,
      `RD$ ${payment.amount.toLocaleString()}`,
      getPaymentMethodName(payment.paymentMethod),
      payment.reference
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Fecha', 'Cliente', 'Factura', 'Monto', 'Método', 'Referencia']],
      body: paymentData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9 }
    });
    
    doc.save(`pagos-recibidos-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const paymentsByMethod = filteredPayments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const csvContent = [
      ['Reporte de Pagos Recibidos'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [''],
      ['RESUMEN DE PAGOS'],
      ['Total Recibido', `RD$ ${totalPayments.toLocaleString()}`],
      ['Número de Pagos', filteredPayments.length.toString()],
      ['Efectivo', `RD$ ${(paymentsByMethod.cash || 0).toLocaleString()}`],
      ['Transferencias', `RD$ ${(paymentsByMethod.transfer || 0).toLocaleString()}`],
      ['Cheques', `RD$ ${(paymentsByMethod.check || 0).toLocaleString()}`],
      ['Tarjetas', `RD$ ${(paymentsByMethod.card || 0).toLocaleString()}`],
      [''],
      ['DETALLE DE PAGOS'],
      ['Fecha', 'Cliente', 'Factura', 'Monto', 'Método', 'Referencia'],
      ...filteredPayments.map(payment => [
        payment.date,
        payment.customerName,
        payment.invoiceNumber,
        payment.amount,
        getPaymentMethodName(payment.paymentMethod),
        payment.reference
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagos-recibidos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewPayment = () => {
    setSelectedPayment(null);
    setShowPaymentModal(true);
  };

  const handleViewPayment = (paymentId: string) => {
    const payment = payments.find(pay => pay.id === paymentId);
    if (payment) {
      alert(`Detalles del pago:\n\nCliente: ${payment.customerName}\nFactura: ${payment.invoiceNumber}\nMonto: RD$ ${payment.amount.toLocaleString()}\nMétodo: ${getPaymentMethodName(payment.paymentMethod)}\nReferencia: ${payment.reference}`);
    }
  };

  const handlePrintPayment = (paymentId: string) => {
    const payment = payments.find(pay => pay.id === paymentId);
    if (payment) {
      alert(`Imprimiendo recibo de pago ${payment.reference}...`);
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const invoiceId = String(formData.get('invoiceId') || '');
    const bankAccountId = String(formData.get('bankAccountId') || '');
    const amount = Number(formData.get('amount') || 0) || 0;
    const paymentMethod = String(formData.get('paymentMethod') || 'cash') as Payment['paymentMethod'];
    const reference = String(formData.get('reference') || '').trim();
    const paymentDate = String(formData.get('paymentDate') || '') || new Date().toISOString().split('T')[0];

    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      alert('Debe seleccionar una factura válida');
      return;
    }

    const bankAccount = bankAccounts.find(b => b.id === bankAccountId);
    if (!bankAccount) {
      alert('Debe seleccionar una cuenta de banco');
      return;
    }

    const payload: any = {
      customer_id: invoice.customerId,
      invoice_id: invoiceId,
      bank_account_id: bankAccountId,
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      reference,
    };

    try {
      const created = await customerPaymentsService.create(user.id, payload);
      const mapped: Payment = {
        id: created.id,
        customerId: created.customer_id,
        customerName: created.customers?.name || invoice.customerName,
        invoiceId: created.invoice_id,
        invoiceNumber: created.invoices?.invoice_number || invoice.invoiceNumber,
        amount: Number(created.amount) || amount,
        paymentMethod: created.payment_method,
        date: created.payment_date,
        reference: created.reference || reference,
      };
      setPayments(prev => [mapped, ...prev]);

      setShowPaymentModal(false);
      setSelectedPayment(null);
      form.reset();

      // Best-effort: registrar asiento contable del pago (Banco vs CxC)
      try {
        const settings = await accountingSettingsService.get(user.id);
        const arAccountId = settings?.ar_account_id;

        // Necesitamos la cuenta contable del banco (chart_account_id)
        const { chart_account_id: bankAccountAccountId } = created.bank_accounts || {};

        if (arAccountId && bankAccountAccountId) {
          const paymentAmount = Number(created.amount) || amount;

          const lines: any[] = [
            {
              account_id: bankAccountAccountId,
              description: 'Cobro de cliente - Banco',
              debit_amount: paymentAmount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              account_id: arAccountId,
              description: 'Cobro de cliente - Cuentas por Cobrar',
              debit_amount: 0,
              credit_amount: paymentAmount,
              line_number: 2,
            },
          ];

          const entryPayload = {
            entry_number: created.id,
            entry_date: created.payment_date || paymentDate,
            description: `Pago factura ${mapped.invoiceNumber}`,
            reference: created.id,
            total_debit: paymentAmount,
            total_credit: paymentAmount,
            status: 'posted',
          };

          await journalEntriesService.createWithLines(user.id, entryPayload, lines);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error posting customer payment to ledger:', err);
      }
    } catch (error) {
      console.error('Error saving customer payment:', error);
      alert('Error al registrar el pago');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pagos Recibidos</h1>
          <button 
            onClick={handleNewPayment}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-money-dollar-circle-line mr-2"></i>
            Registrar Pago
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
                placeholder="Buscar por cliente, factura o referencia..."
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
            >
              <option value="all">Todos los Métodos</option>
              <option value="cash">Efectivo</option>
              <option value="check">Cheque</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
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

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodColor(payment.paymentMethod)}`}>
                        {getPaymentMethodName(payment.paymentMethod)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewPayment(payment.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button 
                          onClick={() => handlePrintPayment(payment.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Imprimir recibo"
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

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Registrar Pago</h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSavePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factura
                  </label>
                  <select 
                    required
                    name="invoiceId"
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de Banco
                  </label>
                  <select 
                    required
                    name="bankAccountId"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {bankAccounts.map((ba) => (
                      <option key={ba.id} value={ba.id}>
                        {ba.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Pagar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    name="amount"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
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
                    required
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
                      setSelectedPayment(null);
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