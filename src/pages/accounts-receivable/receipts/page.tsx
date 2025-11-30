import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, receiptsService, invoicesService, receiptApplicationsService, bankAccountsService, accountingSettingsService, journalEntriesService } from '../../../services/database';

interface Receipt {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'transfer' | 'card';
  reference: string;
  concept: string;
  status: 'active' | 'cancelled';
  invoiceNumbers: string[];
}

interface BankAccountOption {
  id: string;
  name: string;
  chartAccountId: string | null;
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [applyInvoices, setApplyInvoices] = useState<Array<{ id: string; invoiceNumber: string; totalAmount: number; paidAmount: number; balance: number }>>([]);
  const [loadingApplyInvoices, setLoadingApplyInvoices] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [customerArAccounts, setCustomerArAccounts] = useState<Record<string, string>>({});

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'check': return 'Cheque';
      case 'transfer': return 'Transferencia';
      case 'card': return 'Tarjeta';
      default: return 'Otro';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'cancelled': return 'Anulado';
      default: return 'Desconocido';
    }
  };

  const enrichReceiptWithInvoices = async (receipt: Receipt): Promise<Receipt> => {
    if (!user?.id) return receipt;
    try {
      const apps = await receiptApplicationsService.getByReceipt(user.id, receipt.id);
      const invoiceNumbers = ((apps || []) as any[])
        .map((app) => (app.invoices as any)?.invoice_number as string | undefined)
        .filter((num) => !!num) as string[];
      return { ...receipt, invoiceNumbers };
    } catch {
      return receipt;
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || receipt.paymentMethod === paymentMethodFilter;
    return matchesSearch && matchesStatus && matchesPaymentMethod;
  });

  const loadCustomers = async () => {
    if (!user?.id) return;
    setLoadingCustomers(true);
    try {
      const list = await customersService.getAll(user.id);
      setCustomers((list || []).map((c: any) => ({ id: String(c.id), name: String(c.name) })));

      // Mapa de cuentas por cobrar específicas por cliente
      const arMap: Record<string, string> = {};
      (list || []).forEach((c: any) => {
        if (c.id && c.ar_account_id) {
          arMap[String(c.id)] = String(c.ar_account_id);
        }
      });
      setCustomerArAccounts(arMap);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cargar cuentas bancarias para poder generar asientos Banco vs CxC
  useEffect(() => {
    const loadBankAccounts = async () => {
      if (!user?.id) return;
      try {
        const data = await bankAccountsService.getAll(user.id);
        const mapped: BankAccountOption[] = (data || []).map((ba: any) => ({
          id: String(ba.id),
          name: `${ba.bank_name} - ${ba.account_number}`,
          chartAccountId: ba.chart_account_id ? String(ba.chart_account_id) : null,
        }));
        setBankAccounts(mapped);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Receipts] Error loading bank accounts', error);
      }
    };

    loadBankAccounts();
  }, [user?.id]);

  const loadReceipts = async () => {
    if (!user?.id) return;
    setLoadingReceipts(true);
    try {
      const data = await receiptsService.getAll(user.id);
      const mapped: Receipt[] = (data as any[]).map((r) => ({
        id: String(r.id),
        receiptNumber: r.receipt_number as string,
        customerId: String(r.customer_id),
        customerName: (r.customers as any)?.name || 'Cliente',
        date: r.receipt_date as string,
        amount: Number(r.amount) || 0,
        paymentMethod: (r.payment_method as Receipt['paymentMethod']) || 'cash',
        reference: (r.reference as string) || '',
        concept: (r.concept as string) || '',
        status: (r.status as Receipt['status']) || 'active',
        invoiceNumbers: [],
      }));
      setReceipts(mapped);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Recibos de Cobro', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Estado: ${statusFilter === 'all' ? 'Todos' : statusFilter}`, 20, 50);
    doc.text(`Método de pago: ${paymentMethodFilter === 'all' ? 'Todos' : getPaymentMethodName(paymentMethodFilter)}`, 20, 60);
    
    // Estadísticas
    const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const activeReceipts = filteredReceipts.filter(r => r.status === 'active').length;
    const cancelledReceipts = filteredReceipts.filter(r => r.status === 'cancelled').length;
    
    doc.setFontSize(14);
    doc.text('Resumen de Recibos', 20, 80);
    
    const summaryData = [
      ['Concepto', 'Valor'],
      ['Total Recibido', `RD$ ${totalAmount.toLocaleString()}`],
      ['Recibos Activos', activeReceipts.toString()],
      ['Recibos Anulados', cancelledReceipts.toString()],
      ['Total de Recibos', filteredReceipts.length.toString()]
    ];
    
    (doc as any).autoTable({
      startY: 90,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Tabla de recibos
    doc.setFontSize(14);
    doc.text('Detalle de Recibos', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const receiptData = filteredReceipts.map(receipt => [
      receipt.receiptNumber,
      receipt.customerName,
      receipt.date,
      `RD$ ${receipt.amount.toLocaleString()}`,
      getPaymentMethodName(receipt.paymentMethod),
      receipt.reference,
      getStatusName(receipt.status)
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Recibo', 'Cliente', 'Fecha', 'Monto', 'Método', 'Referencia', 'Estado']],
      body: receiptData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`recibos-cobro-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const activeReceipts = filteredReceipts.filter(r => r.status === 'active').length;
    const cancelledReceipts = filteredReceipts.filter(r => r.status === 'cancelled').length;
    
    const csvContent = [
      ['Reporte de Recibos de Cobro'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [`Estado: ${statusFilter === 'all' ? 'Todos' : statusFilter}`],
      [`Método de pago: ${paymentMethodFilter === 'all' ? 'Todos' : getPaymentMethodName(paymentMethodFilter)}`],
      [''],
      ['RESUMEN'],
      ['Total Recibido', `RD$ ${totalAmount.toLocaleString()}`],
      ['Recibos Activos', activeReceipts.toString()],
      ['Recibos Anulados', cancelledReceipts.toString()],
      ['Total de Recibos', filteredReceipts.length.toString()],
      [''],
      ['DETALLE DE RECIBOS'],
      ['Recibo', 'Cliente', 'Fecha', 'Monto', 'Método', 'Referencia', 'Concepto', 'Estado'],
      ...filteredReceipts.map(receipt => [
        receipt.receiptNumber,
        receipt.customerName,
        receipt.date,
        receipt.amount,
        getPaymentMethodName(receipt.paymentMethod),
        receipt.reference,
        receipt.concept,
        getStatusName(receipt.status)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recibos-cobro-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewReceipt = () => {
    setSelectedReceipt(null);
    setShowReceiptModal(true);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptDetails(true);
  };

  const loadInvoicesForReceipt = async (receipt: Receipt) => {
    if (!user?.id) return;
    setLoadingApplyInvoices(true);
    try {
      const data = await invoicesService.getAll(user.id);
      const base = (data as any[])
        .filter((inv) => String(inv.customer_id) === receipt.customerId && inv.status !== 'Cancelada')
        .map((inv) => {
          const total = Number(inv.total_amount) || 0;
          const paid = Number(inv.paid_amount) || 0;
          const balance = total - paid;
          return {
            id: String(inv.id),
            invoiceNumber: inv.invoice_number as string,
            totalAmount: total,
            paidAmount: paid,
            balance,
          };
        });

      const fullyPaid = base.filter((inv) => inv.totalAmount > 0 && inv.balance <= 0);

      const withReceiptInfo = await Promise.all(
        fullyPaid.map(async (inv) => {
          const apps = await receiptApplicationsService.getByInvoice(user.id, inv.id);
          const hasReceipt = (apps || []).length > 0;
          return { ...inv, hasReceipt };
        }),
      );

      const eligibleInvoices = withReceiptInfo
        .filter((inv) => !inv.hasReceipt)
        .map(({ hasReceipt, ...rest }) => rest);

      setApplyInvoices(eligibleInvoices);
    } finally {
      setLoadingApplyInvoices(false);
    }
  };

  const handleApplyReceipt = async (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    await loadInvoicesForReceipt(receipt);
    setShowApplyModal(true);
  };

  const handlePrintReceipt = async (receipt: Receipt) => {
    const enriched = await enrichReceiptWithInvoices(receipt);
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('RECIBO DE COBRO', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Recibo No: ${enriched.receiptNumber}`, 20, 50);
    doc.text(`Fecha: ${enriched.date}`, 20, 60);
    
    doc.text(`Cliente: ${enriched.customerName}`, 20, 80);
    doc.text(`Concepto: ${enriched.concept}`, 20, 90);
    doc.text(`Método de Pago: ${getPaymentMethodName(enriched.paymentMethod)}`, 20, 100);
    doc.text(`Referencia: ${enriched.reference}`, 20, 110);
    
    doc.setFontSize(16);
    doc.text(`Monto: RD$ ${enriched.amount.toLocaleString()}`, 20, 130);
    
    if (enriched.invoiceNumbers.length > 0) {
      doc.setFontSize(12);
      doc.text('Facturas aplicadas:', 20, 150);
      enriched.invoiceNumbers.forEach((invoice, index) => {
        doc.text(`- ${invoice}`, 30, 160 + (index * 10));
      });
    }
    
    doc.save(`recibo-${receipt.receiptNumber}.pdf`);
  };

  const handleSaveApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id || !selectedReceipt) {
      alert('Debes iniciar sesión y seleccionar un recibo válido');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const invoiceId = String(formData.get('invoice_id') || '');
    const amountToApply = Number(formData.get('amount_to_apply') || 0);
    const notes = String(formData.get('notes') || '');

    if (!invoiceId) {
      alert('Debes seleccionar una factura');
      return;
    }
    if (!amountToApply || amountToApply <= 0) {
      alert('El monto a aplicar debe ser mayor que 0');
      return;
    }

    const targetInvoice = applyInvoices.find((inv) => inv.id === invoiceId);
    if (!targetInvoice) {
      alert('La factura seleccionada no es válida');
      return;
    }
    if (amountToApply > targetInvoice.totalAmount) {
      alert('El monto a aplicar no puede ser mayor que el monto de la factura');
      return;
    }

    try {
      await receiptApplicationsService.create(user.id, {
        receipt_id: selectedReceipt.id,
        invoice_id: invoiceId,
        amount_applied: amountToApply,
        notes: notes || null,
      });

      alert('Recibo aplicado exitosamente a la factura');
      setShowApplyModal(false);
      setSelectedReceipt(null);
    } catch (error: any) {
      console.error('[Receipts] Error al aplicar recibo', error);
      alert(`Error al aplicar el recibo: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  const handleCancelReceipt = async (receiptId: string) => {
    if (!user?.id) {
      alert('Debes iniciar sesión para anular recibos');
      return;
    }
    if (!confirm('¿Está seguro de que desea anular este recibo?')) return;
    try {
      await receiptsService.updateStatus(receiptId, 'cancelled');
      await loadReceipts();
      alert('Recibo anulado exitosamente');
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[Receipts] Error al anular recibo', error);
      alert(`Error al anular el recibo: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  const handleReactivateReceipt = async (receiptId: string) => {
    if (!user?.id) {
      alert('Debes iniciar sesión para reactivar recibos');
      return;
    }
    if (!confirm('¿Desea reactivar este recibo anulado?')) return;
    try {
      await receiptsService.updateStatus(receiptId, 'active');
      await loadReceipts();
      alert('Recibo reactivado exitosamente');
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[Receipts] Error al reactivar recibo', error);
      alert(`Error al reactivar el recibo: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  const handleSaveReceipt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Debes iniciar sesión para crear recibos');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const customerId = String(formData.get('customer_id') || '');
    const date = String(formData.get('date') || '');
    const amount = Number(formData.get('amount') || 0);
    const paymentMethod = String(formData.get('payment_method') || 'cash');
    const reference = String(formData.get('reference') || '');
    const concept = String(formData.get('concept') || '');
    const bankAccountId = String(formData.get('bank_account_id') || '');

    if (!customerId || !amount) {
      alert('Cliente y monto son obligatorios');
      return;
    }

    if (paymentMethod !== 'cash' && !bankAccountId) {
      alert('Debe seleccionar una cuenta de banco para este método de pago');
      return;
    }

    const todayStr = date || new Date().toISOString().slice(0, 10);
    const receiptNumber = `RC-${Date.now()}`;

    const payload = {
      customer_id: customerId,
      receipt_number: receiptNumber,
      receipt_date: todayStr,
      amount,
      payment_method: paymentMethod,
      reference: reference || null,
      concept: concept || null,
      status: 'active',
    };

    try {
      const created = await receiptsService.create(user.id, payload);

      // Best-effort: registrar asiento contable del recibo (Banco/Caja vs CxC)
      try {
        const settings = await accountingSettingsService.get(user.id);

        // Preferir cuenta de CxC específica del cliente, si existe
        const customerSpecificArId = customerArAccounts[customerId];
        const arAccountId = customerSpecificArId || settings?.ar_account_id;

        if (!arAccountId) {
          alert('Recibo registrado, pero no se pudo crear el asiento: falta configurar la Cuenta de Cuentas por Cobrar en Ajustes Contables o en el cliente.');
        } else {
          // Determinar cuenta contable del banco si se seleccionó uno
          let bankChartAccountId: string | null = null;
          if (bankAccountId) {
            const bank = bankAccounts.find(b => b.id === bankAccountId);
            bankChartAccountId = bank?.chartAccountId || null;
          }

          if (!bankChartAccountId) {
            if (paymentMethod === 'cash') {
              alert('Recibo registrado en efectivo sin cuenta de banco/caja configurada; no se generó asiento automático.');
            } else {
              alert('Recibo registrado, pero no se pudo crear el asiento: la cuenta de banco seleccionada no tiene cuenta contable asociada.');
            }
          } else {
            const entryAmount = Number(created.amount) || amount;

            const lines: any[] = [
              {
                account_id: bankChartAccountId,
                description: 'Cobro de cliente - Banco/Recibo',
                debit_amount: entryAmount,
                credit_amount: 0,
                line_number: 1,
              },
              {
                account_id: arAccountId,
                description: 'Cobro de cliente - Cuentas por Cobrar (Recibo)',
                debit_amount: 0,
                credit_amount: entryAmount,
                line_number: 2,
              },
            ];

            const customerName = customers.find(c => c.id === customerId)?.name || '';
            const descriptionText = customerName
              ? `Recibo ${created.receipt_number || receiptNumber} - ${customerName}`
              : `Recibo ${created.receipt_number || receiptNumber}`;

            const refText = created.reference || reference || '';
            const entryReference = refText
              ? `Recibo:${created.id} Ref:${refText}`
              : `Recibo:${created.id}`;

            const entryDate = created.receipt_date || todayStr;

            const entryPayload = {
              entry_number: created.id,
              entry_date: entryDate,
              description: descriptionText,
              reference: entryReference,
              total_debit: entryAmount,
              total_credit: entryAmount,
              status: 'posted' as const,
            };

            await journalEntriesService.createWithLines(user.id, entryPayload, lines);
          }
        }
      } catch (jeError) {
        // eslint-disable-next-line no-console
        console.error('[Receipts] Error creando asiento contable de recibo:', jeError);
        alert('Recibo registrado, pero ocurrió un error al crear el asiento contable. Revise el libro diario y la configuración.');
      }

      await loadReceipts();
      alert('Recibo creado exitosamente');
      setShowReceiptModal(false);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[Receipts] Error al crear recibo', error);
      alert(`Error al crear el recibo: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recibos de Cobro</h1>
            <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
              <Link to="/accounts-receivable" className="hover:text-blue-600">Cuentas por Cobrar</Link>
              <span>/</span>
              <span>Recibos de Cobro</span>
            </nav>
          </div>
          <button 
            onClick={handleNewReceipt}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Recibo
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recibido</p>
                <p className="text-2xl font-bold text-green-600">
                  RD${filteredReceipts.filter(r => r.status === 'active').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recibos Activos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredReceipts.filter(r => r.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-file-list-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recibos Anulados</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredReceipts.filter(r => r.status === 'cancelled').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-close-circle-line text-2xl text-red-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio por Recibo</p>
                <p className="text-2xl font-bold text-purple-600">
                  RD${filteredReceipts.length > 0 ? Math.round(filteredReceipts.reduce((sum, r) => sum + r.amount, 0) / filteredReceipts.length).toLocaleString() : '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-bar-chart-line text-2xl text-purple-600"></i>
              </div>
            </div>
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
                placeholder="Buscar por cliente, número de recibo o referencia..."
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
              <option value="cancelled">Anulados</option>
            </select>
          </div>

          <div className="w-full md:w-48">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
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

        {/* Receipts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {(loadingCustomers || loadingReceipts) && (
            <div className="px-6 pt-3 text-sm text-gray-500">Cargando datos...</div>
          )}

        {/* Apply Receipt Modal */}
        {showApplyModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Aplicar Recibo a Factura</h3>
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setSelectedReceipt(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Recibo: <span className="font-medium">{selectedReceipt.receiptNumber}</span></p>
                <p className="text-sm text-gray-600">Cliente: <span className="font-medium">{selectedReceipt.customerName}</span></p>
                <p className="text-lg font-semibold text-green-600">Monto del recibo: RD${selectedReceipt.amount.toLocaleString()}</p>
              </div>

              {loadingApplyInvoices && (
                <p className="text-sm text-gray-500 mb-2">Cargando facturas pendientes...</p>
              )}

              <form onSubmit={handleSaveApplication} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factura a Aplicar
                  </label>
                  <select
                    required
                    name="invoice_id"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar factura</option>
                    {applyInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - Saldo RD$ {inv.balance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Aplicar
                  </label>
                  <input
                    type="number" min="0"
                    step="0.01"
                    name="amount_to_apply"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notas sobre la aplicación del recibo..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyModal(false);
                      setSelectedReceipt(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Aplicar Recibo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recibo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
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
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.receiptNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${receipt.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodName(receipt.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                        {getStatusName(receipt.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewReceipt(receipt)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(receipt)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Imprimir recibo"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        {receipt.status === 'active' && (
                          <button
                            onClick={() => handleApplyReceipt(receipt)}
                            className="text-green-600 hover:text-green-900"
                            title="Aplicar a factura"
                          >
                            <i className="ri-arrow-down-circle-line"></i>
                          </button>
                        )}
                        {receipt.status === 'active' && (
                          <button
                            onClick={() => handleCancelReceipt(receipt.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Anular recibo"
                          >
                            <i className="ri-close-circle-line"></i>
                          </button>
                        )}
                        {receipt.status === 'cancelled' && (
                          <button
                            onClick={() => handleReactivateReceipt(receipt.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Reactivar recibo"
                          >
                            <i className="ri-arrow-go-back-line"></i>
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

        {/* New Receipt Modal */}
        {showReceiptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nuevo Recibo de Cobro</h3>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSaveReceipt} className="space-y-4">
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
                      Fecha
                    </label>
                    <input
                      type="date"
                      required
                      name="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concepto
                  </label>
                  <textarea
                    rows={3}
                    required
                    name="concept"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción del pago recibido..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Recibo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receipt Details Modal */}
        {showReceiptDetails && selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Detalles del Recibo</h3>
                <button
                  onClick={() => {
                    setShowReceiptDetails(false);
                    setSelectedReceipt(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Recibo</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedReceipt.receiptNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cliente</label>
                    <p className="text-gray-900">{selectedReceipt.customerName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha</label>
                    <p className="text-gray-900">{selectedReceipt.date}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto</label>
                    <p className="text-2xl font-bold text-green-600">RD${selectedReceipt.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Método de Pago</label>
                    <p className="text-gray-900">{getPaymentMethodName(selectedReceipt.paymentMethod)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Referencia</label>
                    <p className="text-gray-900">{selectedReceipt.reference}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Estado</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReceipt.status)}`}>
                      {getStatusName(selectedReceipt.status)}
                    </span>
                  </div>
                  
                  {selectedReceipt.invoiceNumbers.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Facturas Aplicadas</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedReceipt.invoiceNumbers.map((invoice, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {invoice}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Concepto</label>
                <p className="text-gray-900 mt-1">{selectedReceipt.concept}</p>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-printer-line mr-2"></i>
                  Imprimir Recibo
                </button>
                {selectedReceipt.status === 'active' && (
                  <button
                    onClick={() => handleCancelReceipt(selectedReceipt.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-close-circle-line mr-2"></i>
                    Anular Recibo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}