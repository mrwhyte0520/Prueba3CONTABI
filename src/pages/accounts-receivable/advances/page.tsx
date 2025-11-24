import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, invoicesService, customerAdvancesService, bankAccountsService, journalEntriesService } from '../../../services/database';

interface Advance {
  id: string;
  advanceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  appliedAmount: number;
  balance: number;
  paymentMethod: 'cash' | 'check' | 'transfer' | 'card';
  reference: string;
  concept: string;
  status: 'pending' | 'applied' | 'partial' | 'cancelled';
  appliedInvoices: string[];
}

interface BankAccountOption {
  id: string;
  name: string;
  chartAccountId: string | null;
}

export default function AdvancesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showAdvanceDetails, setShowAdvanceDetails] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [invoices, setInvoices] = useState<Array<{ id: string; invoiceNumber: string; totalAmount: number; paidAmount: number }>>([]);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [customerAdvanceAccounts, setCustomerAdvanceAccounts] = useState<Record<string, string>>({});

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
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'applied': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'applied': return 'Aplicado';
      case 'partial': return 'Parcial';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const filteredAdvances = advances.filter(advance => {
    const matchesSearch = advance.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         advance.advanceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         advance.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || advance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const loadSupportData = async () => {
    if (!user?.id) return;
    setLoadingSupport(true);
    try {
      const [custList, invList, bankList] = await Promise.all([
        customersService.getAll(user.id),
        invoicesService.getAll(user.id),
        bankAccountsService.getAll(user.id),
      ]);
      setCustomers(custList.map((c: any) => ({ id: c.id, name: c.name })));
      setInvoices(
        (invList as any[]).map((inv) => ({
          id: String(inv.id),
          invoiceNumber: inv.invoice_number as string,
          totalAmount: Number(inv.total_amount) || 0,
          paidAmount: Number(inv.paid_amount) || 0,
        }))
      );

      // Mapa de cuentas de anticipos por cliente
      const advMap: Record<string, string> = {};
      (custList || []).forEach((c: any) => {
        if (c.id && c.advanceAccountId) {
          advMap[String(c.id)] = String(c.advanceAccountId);
        }
      });
      setCustomerAdvanceAccounts(advMap);

      // Cuentas bancarias para poder generar asientos Banco vs Anticipos
      const mappedBanks: BankAccountOption[] = (bankList || []).map((ba: any) => ({
        id: String(ba.id),
        name: `${ba.bank_name} - ${ba.account_number}`,
        chartAccountId: ba.chart_account_id ? String(ba.chart_account_id) : null,
      }));
      setBankAccounts(mappedBanks);
    } finally {
      setLoadingSupport(false);
    }
  };

  const loadAdvances = async () => {
    if (!user?.id) return;
    setLoadingAdvances(true);
    try {
      const data = await customerAdvancesService.getAll(user.id);
      const mapped: Advance[] = (data as any[]).map((a) => {
        const amount = Number(a.amount) || 0;
        const appliedAmount = Number(a.applied_amount) || 0;
        const balance = Number.isFinite(Number(a.balance_amount))
          ? Number(a.balance_amount)
          : amount - appliedAmount;
        const rawStatus = (a.status as string) || 'pending';
        const status: Advance['status'] = (['pending', 'applied', 'partial', 'cancelled'] as const).includes(
          rawStatus as any
        )
          ? (rawStatus as Advance['status'])
          : 'pending';

        let finalApplied = appliedAmount;
        let finalBalance = balance;
        if (status === 'cancelled') {
          finalApplied = 0;
          finalBalance = 0;
        }

        return {
          id: String(a.id),
          advanceNumber: a.advance_number as string,
          customerId: String(a.customer_id),
          customerName: (a.customers as any)?.name || 'Cliente',
          date: a.advance_date as string,
          amount,
          appliedAmount: finalApplied,
          balance: finalBalance,
          paymentMethod: (a.payment_method as any) || 'cash',
          reference: (a.reference as string) || '',
          concept: (a.concept as string) || '',
          status,
          appliedInvoices: [],
        };
      });
      setAdvances(mapped);
    } finally {
      setLoadingAdvances(false);
    }
  };

  useEffect(() => {
    loadSupportData();
    loadAdvances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Anticipos de Clientes', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Estado: ${statusFilter === 'all' ? 'Todos' : getStatusName(statusFilter)}`, 20, 50);
    
    // Estadísticas
    const activeAdvances = filteredAdvances.filter(a => a.status !== 'cancelled');
    const totalAmount = activeAdvances.reduce((sum, advance) => sum + advance.amount, 0);
    const totalApplied = activeAdvances.reduce((sum, advance) => sum + advance.appliedAmount, 0);
    const totalBalance = activeAdvances.reduce((sum, advance) => sum + advance.balance, 0);
    const pendingAdvances = activeAdvances.filter(a => a.status === 'pending').length;
    
    doc.setFontSize(14);
    doc.text('Resumen de Anticipos', 20, 70);
    
    const summaryData = [
      ['Concepto', 'Valor'],
      ['Total Anticipos', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Aplicado', `RD$ ${totalApplied.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Anticipos Pendientes', pendingAdvances.toString()],
      ['Total de Anticipos', activeAdvances.length.toString()]
    ];
    
    (doc as any).autoTable({
      startY: 80,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Tabla de anticipos
    doc.setFontSize(14);
    doc.text('Detalle de Anticipos', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const advanceData = activeAdvances.map(advance => [
      advance.advanceNumber,
      advance.customerName,
      advance.date,
      `RD$ ${advance.amount.toLocaleString()}`,
      `RD$ ${advance.appliedAmount.toLocaleString()}`,
      `RD$ ${advance.balance.toLocaleString()}`,
      getStatusName(advance.status)
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Anticipo', 'Cliente', 'Fecha', 'Monto', 'Aplicado', 'Saldo', 'Estado']],
      body: advanceData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`anticipos-clientes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const activeAdvances: Advance[] = filteredAdvances.filter(a => a.status !== 'cancelled');
    const totalAmount = activeAdvances.reduce((sum, advance) => sum + advance.amount, 0);
    const totalApplied = activeAdvances.reduce((sum, advance) => sum + advance.appliedAmount, 0);
    const totalBalance = activeAdvances.reduce((sum, advance) => sum + advance.balance, 0);
    const pendingAdvances = activeAdvances.filter(a => a.status === 'pending').length;
    
    const csvContent = [
      ['Reporte de Anticipos de Clientes'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [`Estado: ${statusFilter === 'all' ? 'Todos' : getStatusName(statusFilter)}`],
      [''],
      ['RESUMEN'],
      ['Total Anticipos', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Aplicado', `RD$ ${totalApplied.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Anticipos Pendientes', pendingAdvances.toString()],
      ['Total de Anticipos', activeAdvances.length.toString()],
      [''],
      ['DETALLE DE ANTICIPOS'],
      ['Anticipo', 'Cliente', 'Fecha', 'Monto', 'Aplicado', 'Saldo', 'Método Pago', 'Referencia', 'Estado'],
      ...activeAdvances.map((advance: Advance) => [
        advance.advanceNumber,
        advance.customerName,
        advance.date,
        advance.amount,
        advance.appliedAmount,
        advance.balance,
        getPaymentMethodName(advance.paymentMethod),
        advance.reference,
        getStatusName(advance.status)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `anticipos-clientes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewAdvance = () => {
    setSelectedAdvance(null);
    setShowAdvanceModal(true);
  };

  const handleViewAdvance = (advance: Advance) => {
    setSelectedAdvance(advance);
    setShowAdvanceDetails(true);
  };

  const handleApplyAdvance = (advance: Advance) => {
    setSelectedAdvance(advance);
    setShowApplyModal(true);
  };

  const handleCancelAdvance = async (advanceId: string) => {
    if (!user?.id) {
      alert('Debes iniciar sesión para cancelar anticipos');
      return;
    }
    if (!confirm('¿Está seguro de que desea cancelar este anticipo?')) return;
    try {
      await customerAdvancesService.updateStatus(advanceId, 'cancelled', {
        appliedAmount: 0,
        balanceAmount: 0,
      });
      await loadAdvances();
      alert('Anticipo cancelado exitosamente');
    } catch (error: any) {
      console.error('[Advances] Error al cancelar anticipo', error);
      alert(`Error al cancelar el anticipo: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  const handleSaveAdvance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Debes iniciar sesión para crear anticipos');
      return;
    }
    const formData = new FormData(e.currentTarget);
    const customerId = String(formData.get('customer_id') || '');
    const date = String(formData.get('date') || '');
    const amount = Number(formData.get('amount') || 0);
    const paymentMethod = String(formData.get('payment_method') || '');
    const reference = String(formData.get('reference') || '');
    const concept = String(formData.get('concept') || '');
    const bankAccountId = String(formData.get('bank_account_id') || '');

    if (!customerId || !amount || !paymentMethod) {
      alert('Cliente, monto y método de pago son obligatorios');
      return;
    }

    if (paymentMethod !== 'cash' && !bankAccountId) {
      alert('Debe seleccionar una cuenta de banco para este método de pago');
      return;
    }

    const advanceNumber = `ANT-${Date.now()}`;
    const advanceDate = date || new Date().toISOString().slice(0, 10);

    const payload = {
      customer_id: customerId,
      advance_number: advanceNumber,
      advance_date: advanceDate,
      amount,
      payment_method: paymentMethod,
      reference,
      concept,
      applied_amount: 0,
      balance_amount: amount,
      status: 'pending',
    };

    try {
      const created = await customerAdvancesService.create(user.id, payload);

      // Best-effort: registrar asiento contable del anticipo (Banco/Caja vs Anticipos de cliente)
      try {
        const customerAdvanceAccountId = customerAdvanceAccounts[customerId];

        if (!customerAdvanceAccountId) {
          alert('Anticipo registrado, pero no se pudo crear el asiento: el cliente no tiene configurada una cuenta de Anticipos.');
        } else {
          let bankChartAccountId: string | null = null;
          if (bankAccountId) {
            const bank = bankAccounts.find(b => b.id === bankAccountId);
            bankChartAccountId = bank?.chartAccountId || null;
          }

          if (!bankChartAccountId) {
            if (paymentMethod === 'cash') {
              alert('Anticipo registrado en efectivo sin cuenta de banco/caja configurada; no se generó asiento automático.');
            } else {
              alert('Anticipo registrado, pero no se pudo crear el asiento: la cuenta de banco seleccionada no tiene cuenta contable asociada.');
            }
          } else {
            const entryAmount = Number(created.amount) || amount;

            const lines: any[] = [
              {
                account_id: bankChartAccountId,
                description: 'Anticipo de cliente - Banco',
                debit_amount: entryAmount,
                credit_amount: 0,
                line_number: 1,
              },
              {
                account_id: customerAdvanceAccountId,
                description: 'Anticipo de cliente - Pasivo',
                debit_amount: 0,
                credit_amount: entryAmount,
                line_number: 2,
              },
            ];

            const customerName = customers.find(c => c.id === customerId)?.name || '';
            const descriptionText = customerName
              ? `Anticipo ${created.advance_number || advanceNumber} - ${customerName}`
              : `Anticipo ${created.advance_number || advanceNumber}`;

            const refText = created.reference || reference || '';
            const entryReference = refText
              ? `Anticipo:${created.id} Ref:${refText}`
              : `Anticipo:${created.id}`;

            const entryDate = created.advance_date || advanceDate;

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
        console.error('[Advances] Error creando asiento contable de anticipo:', jeError);
        alert('Anticipo registrado, pero ocurrió un error al crear el asiento contable. Revise el libro diario y la configuración.');
      }

      await loadAdvances();
      alert('Anticipo creado exitosamente');
      setShowAdvanceModal(false);
    } catch (error: any) {
      console.error('[Advances] Error al crear anticipo', error);
      alert(`Error al crear el anticipo: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  const handleSaveApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id || !selectedAdvance) {
      alert('Debes iniciar sesión y seleccionar un anticipo válido');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const invoiceId = String(formData.get('invoice_id') || '');
    const amountToApply = Number(formData.get('amount_to_apply') || 0);

    if (!invoiceId) {
      alert('Debes seleccionar una factura para aplicar el anticipo');
      return;
    }

    if (!amountToApply || amountToApply <= 0) {
      alert('El monto a aplicar debe ser mayor que 0');
      return;
    }

    if (amountToApply > selectedAdvance.balance) {
      alert('El monto a aplicar no puede ser mayor que el saldo disponible del anticipo');
      return;
    }

    const newApplied = selectedAdvance.appliedAmount + amountToApply;
    const newBalance = selectedAdvance.balance - amountToApply;
    const newStatus: Advance['status'] = newBalance > 0 ? 'partial' : 'applied';

    const targetInvoice = invoices.find((inv) => inv.id === invoiceId);
    if (!targetInvoice) {
      alert('La factura seleccionada no es válida');
      return;
    }

    const invoiceBalanceBefore = targetInvoice.totalAmount - targetInvoice.paidAmount;
    if (amountToApply > invoiceBalanceBefore) {
      alert('El monto a aplicar no puede ser mayor que el saldo pendiente de la factura');
      return;
    }

    const newInvoicePaid = targetInvoice.paidAmount + amountToApply;
    const invoiceBalanceAfter = targetInvoice.totalAmount - newInvoicePaid;
    const newInvoiceStatus: 'pending' | 'partial' | 'paid' = invoiceBalanceAfter > 0 ? (newInvoicePaid > 0 ? 'partial' : 'pending') : 'paid';

    try {
      await invoicesService.updatePayment(invoiceId, newInvoicePaid, newInvoiceStatus);

      await customerAdvancesService.updateStatus(selectedAdvance.id, newStatus, {
        appliedAmount: newApplied,
        balanceAmount: newBalance,
      });
      await loadAdvances();
      alert('Anticipo aplicado exitosamente');
      setShowApplyModal(false);
      setSelectedAdvance(null);
    } catch (error: any) {
      console.error('[Advances] Error al aplicar anticipo', error);
      alert(`Error al aplicar el anticipo: ${error?.message || 'revisa la consola para más detalles'}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anticipos de Clientes</h1>
            <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
              <Link to="/accounts-receivable" className="hover:text-blue-600">Cuentas por Cobrar</Link>
              <span>/</span>
              <span>Anticipos</span>
            </nav>
          </div>
          <button 
            onClick={handleNewAdvance}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Anticipo
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Anticipos</p>
                <p className="text-2xl font-bold text-blue-600">
                  RD${filteredAdvances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Disponible</p>
                <p className="text-2xl font-bold text-green-600">
                  RD${filteredAdvances.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-wallet-line text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monto Aplicado</p>
                <p className="text-2xl font-bold text-purple-600">
                  RD${filteredAdvances.reduce((sum, a) => sum + a.appliedAmount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-check-double-line text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Anticipos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredAdvances.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-2xl text-orange-600"></i>
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
                placeholder="Buscar por cliente, número de anticipo o referencia..."
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
              <option value="applied">Aplicados</option>
              <option value="cancelled">Cancelados</option>
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

        {/* Advances Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {(loadingAdvances || loadingSupport) && (
            <div className="px-6 pt-3 text-sm text-gray-500">Cargando datos...</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anticipo
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
                    Aplicado
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
                {filteredAdvances.map((advance) => (
                  <tr key={advance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {advance.advanceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advance.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advance.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${advance.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${advance.appliedAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      RD${advance.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(advance.status)}`}>
                        {getStatusName(advance.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewAdvance(advance)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        {advance.balance > 0 && advance.status !== 'cancelled' && (
                          <button
                            onClick={() => handleApplyAdvance(advance)}
                            className="text-green-600 hover:text-green-900"
                            title="Aplicar anticipo"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                        {advance.status === 'pending' && (
                          <button
                            onClick={() => handleCancelAdvance(advance.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar anticipo"
                          >
                            <i className="ri-close-circle-line"></i>
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

        {/* New Advance Modal */}
        {showAdvanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nuevo Anticipo de Cliente</h3>
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSaveAdvance} className="space-y-4">
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
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha
                    </label>
                    <input
                      type="text"
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
                      Monto del Anticipo
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
                    placeholder="Número de referencia del pago"
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
                    placeholder="Descripción del anticipo recibido..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanceModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Anticipo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Apply Advance Modal */}
        {showApplyModal && selectedAdvance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Aplicar Anticipo</h3>
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setSelectedAdvance(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Anticipo: <span className="font-medium">{selectedAdvance.advanceNumber}</span></p>
                <p className="text-sm text-gray-600">Cliente: <span className="font-medium">{selectedAdvance.customerName}</span></p>
                <p className="text-lg font-semibold text-green-600">Saldo disponible: RD${selectedAdvance.balance.toLocaleString()}</p>
              </div>
              
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
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - RD$ {inv.totalAmount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Aplicar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount_to_apply"
                    required
                    max={selectedAdvance.balance}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Observaciones sobre la aplicación del anticipo..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyModal(false);
                      setSelectedAdvance(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Aplicar Anticipo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Advance Details Modal */}
        {showAdvanceDetails && selectedAdvance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Detalles del Anticipo</h3>
                <button
                  onClick={() => {
                    setShowAdvanceDetails(false);
                    setSelectedAdvance(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Anticipo</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedAdvance.advanceNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cliente</label>
                    <p className="text-gray-900">{selectedAdvance.customerName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha</label>
                    <p className="text-gray-900">{selectedAdvance.date}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto Original</label>
                    <p className="text-2xl font-bold text-blue-600">RD${selectedAdvance.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Método de Pago</label>
                    <p className="text-gray-900">{getPaymentMethodName(selectedAdvance.paymentMethod)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Referencia</label>
                    <p className="text-gray-900">{selectedAdvance.reference}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto Aplicado</label>
                    <p className="text-lg font-semibold text-purple-600">RD${selectedAdvance.appliedAmount.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Saldo Disponible</label>
                    <p className="text-2xl font-bold text-green-600">RD${selectedAdvance.balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Estado</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAdvance.status)} mt-1`}>
                  {getStatusName(selectedAdvance.status)}
                </span>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Concepto</label>
                <p className="text-gray-900 mt-1">{selectedAdvance.concept}</p>
              </div>
              
              {selectedAdvance.appliedInvoices.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-500">Facturas Aplicadas</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedAdvance.appliedInvoices.map((invoice, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {invoice}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 mt-6">
                {selectedAdvance.balance > 0 && selectedAdvance.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setShowAdvanceDetails(false);
                      setShowApplyModal(true);
                    }}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-check-line mr-2"></i>
                    Aplicar Anticipo
                  </button>
                )}
                {selectedAdvance.status === 'pending' && (
                  <button
                    onClick={() => handleCancelAdvance(selectedAdvance.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-close-circle-line mr-2"></i>
                    Cancelar Anticipo
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