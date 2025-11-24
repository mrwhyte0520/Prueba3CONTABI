import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { apInvoicesService, apInvoiceLinesService, suppliersService, paymentTermsService, chartAccountsService } from '../../../services/database';

interface APInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  documentType: string;
  taxId: string;
  legalName: string;
  invoiceDate: string;
  dueDate: string | null;
  paymentTermsId: string | null;
  currency: string;
  totalGross: number;
  totalItbis: number;
  totalIsrWithheld: number;
  totalToPay: number;
  status: string;
}

interface LineFormRow {
  description: string;
  expenseAccountId: string;
  quantity: string;
  unitPrice: string;
}

export default function APInvoicesPage() {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<APInvoice | null>(null);

  const [headerForm, setHeaderForm] = useState({
    supplierId: '',
    documentType: 'B01',
    taxId: '',
    legalName: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    paymentTermsId: '',
    currency: 'DOP',
  });

  const [lines, setLines] = useState<LineFormRow[]>([
    { description: '', expenseAccountId: '', quantity: '1', unitPrice: '0' },
  ]);

  const loadLookups = async () => {
    if (!user?.id) return;
    try {
      const [supRows, termRows, accounts] = await Promise.all([
        suppliersService.getAll(user.id),
        paymentTermsService.getAll(user.id),
        chartAccountsService.getAll(user.id),
      ]);

      setSuppliers(supRows || []);

      setPaymentTerms(termRows || []);

      const expense = (accounts || []).filter((acc: any) => {
        if (!acc.allow_posting && !acc.allowPosting) return false;
        const type = acc.type || acc.account_type;
        if (!type) return false;
        return String(type).toLowerCase().includes('expense') || String(type).toLowerCase().includes('gasto');
      });
      setExpenseAccounts(expense);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando catálogos para facturas de suplidor', error);
    }
  };

  const loadInvoices = async () => {
    if (!user?.id) return;
    try {
      const rows = await apInvoicesService.getAll(user.id);
      const mapped: APInvoice[] = (rows || []).map((inv: any) => ({
        id: String(inv.id),
        supplierId: String(inv.supplier_id),
        supplierName: (inv.suppliers as any)?.name || 'Suplidor',
        invoiceNumber: inv.invoice_number || '',
        documentType: inv.document_type || '',
        taxId: inv.tax_id || '',
        legalName: inv.legal_name || '',
        invoiceDate: inv.invoice_date || '',
        dueDate: inv.due_date || null,
        paymentTermsId: inv.payment_terms_id || null,
        currency: inv.currency || 'DOP',
        totalGross: Number(inv.total_gross) || 0,
        totalItbis: Number(inv.total_itbis) || 0,
        totalIsrWithheld: Number(inv.total_isr_withheld) || 0,
        totalToPay: Number(inv.total_to_pay) || 0,
        status: inv.status || 'pending',
      }));
      setInvoices(mapped);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando facturas de suplidor', error);
      setInvoices([]);
    }
  };

  useEffect(() => {
    loadLookups();
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAddLine = () => {
    setLines(prev => [...prev, { description: '', expenseAccountId: '', quantity: '1', unitPrice: '0' }]);
  };

  const handleLineChange = (index: number, field: keyof LineFormRow, value: string) => {
    setLines(prev => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const calculateTotals = () => {
    const gross = lines.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
    const itbis = gross * 0.18; // placeholder ITBIS 18%
    const isr = 0; // placeholder, sin retenciones por ahora
    const toPay = gross + itbis - isr;
    return { gross, itbis, isr, toPay };
  };

  const resetForm = () => {
    setHeaderForm({
      supplierId: '',
      documentType: 'B01',
      taxId: '',
      legalName: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      paymentTermsId: '',
      currency: 'DOP',
    });
    setLines([{ description: '', expenseAccountId: '', quantity: '1', unitPrice: '0' }]);
    setEditingInvoice(null);
  };

  const handleNewInvoice = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEditInvoice = async (invoice: APInvoice) => {
    setEditingInvoice(invoice);
    setHeaderForm({
      supplierId: invoice.supplierId,
      documentType: invoice.documentType || 'B01',
      taxId: invoice.taxId || '',
      legalName: invoice.legalName || invoice.supplierName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: invoice.dueDate || '',
      paymentTermsId: invoice.paymentTermsId || '',
      currency: invoice.currency || 'DOP',
    });

    try {
      const dbLines = await apInvoiceLinesService.getByInvoice(invoice.id);
      const mappedLines: LineFormRow[] = (dbLines || []).map((l: any) => ({
        description: l.description || '',
        expenseAccountId: l.expense_account_id || '',
        quantity: String(l.quantity ?? '1'),
        unitPrice: String(l.unit_price ?? '0'),
      }));
      setLines(mappedLines.length > 0 ? mappedLines : [{ description: '', expenseAccountId: '', quantity: '1', unitPrice: '0' }]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando líneas de factura de suplidor', error);
      setLines([{ description: '', expenseAccountId: '', quantity: '1', unitPrice: '0' }]);
    }

    setShowModal(true);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('¿Eliminar esta factura de suplidor?')) return;
    try {
      await apInvoiceLinesService.deleteByInvoice(id);
      await apInvoicesService.delete(id);
      await loadInvoices();
      alert('Factura eliminada exitosamente');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error eliminando factura de suplidor', error);
      alert('No se pudo eliminar la factura');
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert('Debes iniciar sesión para registrar facturas de suplidor');
      return;
    }

    if (!headerForm.supplierId) {
      alert('Debes seleccionar un suplidor');
      return;
    }

    const activeLines = lines.filter(l => l.description.trim() !== '' && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0);
    if (activeLines.length === 0) {
      alert('Agrega al menos una línea con descripción y cantidad > 0');
      return;
    }

    const { gross, itbis, isr, toPay } = calculateTotals();

    const invoiceNumber = headerForm.invoiceNumber.trim() || `AP-${Date.now()}`;
    const invoiceDate = headerForm.invoiceDate || new Date().toISOString().slice(0, 10);
    const dueDate = headerForm.dueDate || null;

    const payload: any = {
      supplier_id: headerForm.supplierId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      document_type: headerForm.documentType || null,
      tax_id: headerForm.taxId || null,
      legal_name: headerForm.legalName || null,
      payment_terms_id: headerForm.paymentTermsId || null,
      currency: headerForm.currency || 'DOP',
      total_gross: gross,
      total_itbis: itbis,
      total_isr_withheld: isr,
      total_to_pay: toPay,
      status: editingInvoice?.status || 'pending',
    };

    const linesPayload = activeLines.map((l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const lineTotal = qty * price;
      const lineItbis = lineTotal * 0.18;
      return {
        description: l.description,
        expense_account_id: l.expenseAccountId || null,
        quantity: qty,
        unit_price: price,
        line_total: lineTotal,
        itbis_amount: lineItbis,
        isr_amount: 0,
      };
    });

    try {
      let invoiceId: string;
      if (editingInvoice) {
        const updated = await apInvoicesService.update(editingInvoice.id, payload);
        invoiceId = String(updated.id);
        await apInvoiceLinesService.deleteByInvoice(invoiceId);
      } else {
        const created = await apInvoicesService.create(user.id, payload);
        invoiceId = String(created.id);
      }

      await apInvoiceLinesService.createMany(invoiceId, linesPayload);
      await loadInvoices();
      setShowModal(false);
      alert(editingInvoice ? 'Factura actualizada exitosamente' : 'Factura creada exitosamente');
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error guardando factura de suplidor', error);
      alert(error?.message || 'Error al guardar la factura');
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      searchTerm === '' ||
      inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas de Suplidor</h1>
            <p className="text-gray-600 text-sm max-w-2xl">
              Registra facturas de proveedores para el módulo de CxP, utilizando los términos de pago y la
              configuración fiscal del suplidor.
            </p>
          </div>
          <button
            onClick={handleNewInvoice}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <i className="ri-add-line mr-2" />
            Nueva Factura
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar por suplidor o número de factura..."
              />
            </div>
          </div>
          <div className="w-full md:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="paid">Pagada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Facturas registradas</h2>
            <span className="text-xs text-gray-500">Total: {filteredInvoices.length}</span>
          </div>
          {filteredInvoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No hay facturas de suplidor registradas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Factura</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Suplidor</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Vencimiento</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Bruto</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">ITBIS</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Total a Pagar</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">{inv.supplierName}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">{inv.invoiceDate}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">{inv.dueDate || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">{inv.currency} {inv.totalGross.toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900">{inv.currency} {inv.totalItbis.toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900 font-semibold">{inv.currency} {inv.totalToPay.toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditInvoice(inv)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <i className="ri-edit-line" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingInvoice ? 'Editar Factura de Suplidor' : 'Nueva Factura de Suplidor'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>

              <form onSubmit={handleSaveInvoice} className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Suplidor *</label>
                    <select
                      required
                      value={headerForm.supplierId}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, supplierId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccione un suplidor...</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NCF / Tipo Comprobante</label>
                    <input
                      type="text"
                      value={headerForm.documentType}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, documentType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: B01, B02..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura</label>
                    <input
                      type="text"
                      value={headerForm.invoiceNumber}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: FAC-0001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RNC / Cédula</label>
                    <input
                      type="text"
                      value={headerForm.taxId}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, taxId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-1 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Legal</label>
                    <input
                      type="text"
                      value={headerForm.legalName}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, legalName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={headerForm.invoiceDate}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={headerForm.dueDate || ''}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Términos de Pago</label>
                    <select
                      value={headerForm.paymentTermsId}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, paymentTermsId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sin término específico</option>
                      {paymentTerms.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.days} días)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                    <select
                      value={headerForm.currency}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="DOP">DOP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Líneas de la Factura</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-xs md:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Descripción</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Cuenta de Gasto</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Cantidad</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Precio</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {lines.map((line, index) => {
                          const qty = Number(line.quantity) || 0;
                          const price = Number(line.unitPrice) || 0;
                          const total = qty * price;
                          return (
                            <tr key={index}>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Descripción"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={line.expenseAccountId}
                                  onChange={(e) => handleLineChange(index, 'expenseAccountId', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Seleccione cuenta...</option>
                                  {expenseAccounts.map((acc: any) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.code} - {acc.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.quantity}
                                  onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-right text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unitPrice}
                                  onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-right text-xs md:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900">{total.toLocaleString()}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(index)}
                                  className="text-red-600 hover:text-red-900"
                                  disabled={lines.length <= 1}
                                >
                                  <i className="ri-delete-bin-line" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <i className="ri-add-line mr-1" />
                      Agregar línea
                    </button>
                    <div className="text-right text-sm text-gray-800 space-y-1">
                      {(() => {
                        const { gross, itbis, isr, toPay } = calculateTotals();
                        return (
                          <>
                            <div>Bruto: {headerForm.currency} {gross.toLocaleString()}</div>
                            <div>ITBIS (18%): {headerForm.currency} {itbis.toLocaleString()}</div>
                            <div>Retenciones ISR: {headerForm.currency} {isr.toLocaleString()}</div>
                            <div className="font-semibold">Total a Pagar: {headerForm.currency} {toPay.toLocaleString()}</div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    {editingInvoice ? 'Guardar Cambios' : 'Registrar Factura'}
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

