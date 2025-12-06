import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, invoicesService, settingsService, inventoryService, taxService } from '../../../services/database';

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
  subtotal: number;
  tax: number;
  items: {
    description: string;
    quantity: number;
    price: number;
    total: number;
  }[];
}

interface Customer {
  id: string;
  name: string;
  document: string;
  phone?: string;
  email?: string;
  address?: string;
  type: 'regular' | 'vip';
  paymentTermId?: string | null;
}

export default function InvoicesPage() {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  type NewItem = { itemId?: string; description: string; quantity: number; price: number; total: number };

  const [newInvoiceItems, setNewInvoiceItems] = useState<NewItem[]>([
    { itemId: undefined, description: '', quantity: 1, price: 0, total: 0 },
  ]);
  const [newInvoiceSubtotal, setNewInvoiceSubtotal] = useState(0);
  const [newInvoiceTax, setNewInvoiceTax] = useState(0);
  const [newInvoiceTotal, setNewInvoiceTotal] = useState(0);
  const [newInvoiceDiscountType, setNewInvoiceDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newInvoiceDiscountPercent, setNewInvoiceDiscountPercent] = useState(0);
  const [newInvoiceNoTax, setNewInvoiceNoTax] = useState(false);
  const [taxConfig, setTaxConfig] = useState<{ itbis_rate: number } | null>(null);

  const currentItbisRate = taxConfig?.itbis_rate ?? 18;

  const recalcNewInvoiceTotals = (
    items: NewItem[],
    discountType = newInvoiceDiscountType,
    discountValue = newInvoiceDiscountPercent,
    noTaxFlag = newInvoiceNoTax,
  ) => {
    const rawSubtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = rawSubtotal * (discountValue / 100);
    } else if (discountType === 'fixed') {
      discountAmount = discountValue;
    }
    if (discountAmount > rawSubtotal) {
      discountAmount = rawSubtotal;
    }
    const subtotal = rawSubtotal - discountAmount;
    const tax = noTaxFlag ? 0 : subtotal * (currentItbisRate / 100);
    const total = subtotal + tax;
    setNewInvoiceSubtotal(subtotal);
    setNewInvoiceTax(tax);
    setNewInvoiceTotal(total);
  };

  const loadCustomers = async () => {
    if (!user?.id) return;
    setLoadingCustomers(true);
    try {
      const [list, items] = await Promise.all([
        customersService.getAll(user.id),
        inventoryService.getItems(user.id),
      ]);
      const mapped: Customer[] = (list || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.customer_name || 'Cliente',
        document: c.document || c.tax_id || '',
        phone: c.phone || c.contact_phone || '',
        email: c.email || c.contact_email || '',
        address: c.address || '',
        type: (c.type === 'vip' ? 'vip' : 'regular') as 'regular' | 'vip',
        paymentTermId: c.paymentTermId ?? c.payment_term_id ?? null,
      }));
      setCustomers(mapped);
      setInventoryItems(items || []);
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
        const subtotal = Number(inv.subtotal) || (total - (Number(inv.tax_amount) || 0));
        const tax = Number(inv.tax_amount) || (total - subtotal);
        const balance = total - paid;
        const today = new Date();
        const due = inv.due_date ? new Date(inv.due_date) : null;
        let daysOverdue = 0;
        if (due && balance > 0) {
          const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
          daysOverdue = diff > 0 ? diff : 0;
        }

        const items = (inv.invoice_lines || []).map((line: any) => {
          const qty = Number(line.quantity) || 0;
          const price = Number(line.unit_price) || 0;
          const lineTotal = Number(line.line_total) || qty * price;
          return {
            description: line.description || (line.inventory_items as any)?.name || 'Ítem',
            quantity: qty,
            price,
            total: lineTotal,
          };
        });

        if (items.length === 0) {
          items.push({
            description: inv.description || 'Servicio/Producto',
            quantity: 1,
            price: total,
            total,
          });
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
          subtotal,
          tax,
          items,
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

  useEffect(() => {
    const loadTaxConfig = async () => {
      try {
        const data = await taxService.getTaxConfiguration();
        if (data && typeof data.itbis_rate === 'number') {
          setTaxConfig({ itbis_rate: data.itbis_rate });
        } else {
          setTaxConfig({ itbis_rate: 18 });
        }
      } catch (error) {
        console.error('Error cargando configuración de impuestos para Cuentas por Cobrar:', error);
        setTaxConfig({ itbis_rate: 18 });
      }
    };
    loadTaxConfig();
  }, [user?.id]);

  useEffect(() => {
    const loadCompanyInfo = async () => {
      const info = await settingsService.getCompanyInfo();
      setCompanyInfo(info);
    };
    loadCompanyInfo();
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

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const companyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';

    const title = 'Reporte de Facturas por Cobrar';
    const dateStr = new Date().toLocaleDateString('es-DO');
    const statusText = statusFilter === 'all' ? 'Todos' : getStatusName(statusFilter);

    // Encabezado: nombre de empresa, título y filtros
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(companyName, pageWidth / 2, 18, { align: 'center' } as any);

    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 26, { align: 'center' } as any);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de generación: ${dateStr}`, 20, 36);
    doc.text(`Estado: ${statusText}`, 20, 44);

    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalBalance = filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    doc.setFontSize(14);
    doc.text('Resumen Financiero', 20, 60);

    const summaryData = [
      ['Concepto', 'Monto'],
      ['Total Facturado', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Pagado', `RD$ ${totalPaid.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Número de Facturas', filteredInvoices.length.toString()]
    ];

    (doc as any).autoTable({
      startY: 70,

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
    const headerCompanyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';

    const csvContent = [
      [headerCompanyName],
      ['Reporte de Facturas por Cobrar'],
      [`Fecha de generación: ${new Date().toLocaleDateString('es-DO')}`],
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
    setSelectedCustomerId('');
    setNewInvoiceItems([{ itemId: undefined, description: '', quantity: 1, price: 0, total: 0 }]);
    setNewInvoiceSubtotal(0);
    setNewInvoiceTax(0);
    setNewInvoiceTotal(0);
    setNewInvoiceDiscountType('percentage');
    setNewInvoiceDiscountPercent(0);
    setNewInvoiceNoTax(false);
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
    if (!invoice) return;

    const companyName = (companyInfo as any)?.name || (companyInfo as any)?.company_name || 'ContaBi';
    const companyRnc = (companyInfo as any)?.ruc || (companyInfo as any)?.tax_id || '';

    const customer = customers.find((c) => c.id === invoice.customerId);

    const customerDetailsHtml = customer
      ? `
            <p><strong>Cliente:</strong> ${customer.name}</p>
            ${customer.document ? `<p><strong>Documento:</strong> ${customer.document}</p>` : ''}
            ${customer.phone ? `<p><strong>Teléfono:</strong> ${customer.phone}</p>` : ''}
            ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ''}
            ${customer.address ? `<p><strong>Dirección:</strong> ${customer.address}</p>` : ''}
        `
      : `
            <p><strong>Cliente:</strong> ${invoice.customerName}</p>
        `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .total { font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyName}</h1>
            ${companyRnc ? `<p>RNC: ${companyRnc}</p>` : ''}
            <h2>Factura #${invoice.invoiceNumber}</h2>
            <p>Fecha: ${new Date(invoice.date).toLocaleDateString('es-DO')}</p>
          </div>
          <div class="details">
            ${customerDetailsHtml}
            <p><strong>Vencimiento:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-DO') : ''}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
                .map(
                  (item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>RD$ ${item.price.toLocaleString()}</td>
                    <td>RD$ ${item.total.toLocaleString()}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total">Subtotal:</td>
                <td>RD$ ${invoice.subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">ITBIS:</td>
                <td>RD$ ${invoice.tax.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">Total:</td>
                <td>RD$ ${invoice.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">Pagado:</td>
                <td>RD$ ${invoice.paidAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">Saldo:</td>
                <td>RD$ ${invoice.balance.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportInvoiceExcel = async (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const companyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';
    const companyRnc =
      (companyInfo as any)?.rnc ||
      (companyInfo as any)?.tax_id ||
      (companyInfo as any)?.ruc ||
      '';

    const customer = customers.find((c) => c.id === invoice.customerId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factura');

    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = companyName;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' } as any;

    if (companyRnc) {
      worksheet.mergeCells('A2:D2');
      worksheet.getCell('A2').value = `RNC: ${companyRnc}`;
      worksheet.getCell('A2').alignment = { horizontal: 'center' } as any;
      worksheet.getCell('A2').font = { size: 10 };
    }

    const headerStartRow = companyRnc ? 3 : 2;
    worksheet.mergeCells(`A${headerStartRow}:D${headerStartRow}`);
    worksheet.getCell(`A${headerStartRow}`).value = `Factura #${invoice.invoiceNumber}`;
    worksheet.getCell(`A${headerStartRow}`).font = { bold: true, size: 12 };

    worksheet.addRow([]);

    const customerName = customer?.name || invoice.customerName;
    const customerDoc = customer?.document || '';
    const customerEmail = customer?.email || '';
    const customerPhone = customer?.phone || '';

    worksheet.addRow(['Cliente', customerName]);
    if (customerDoc) worksheet.addRow(['Documento', customerDoc]);
    if (customerEmail) worksheet.addRow(['Correo', customerEmail]);
    if (customerPhone) worksheet.addRow(['Teléfono', customerPhone]);
    worksheet.addRow([
      'Fecha',
      invoice.date ? new Date(invoice.date).toLocaleDateString('es-DO') : '',
    ]);
    worksheet.addRow([
      'Vencimiento',
      invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-DO') : '',
    ]);

    worksheet.addRow([]);

    const itemsHeader = worksheet.addRow(['Descripción', 'Cantidad', 'Precio', 'Total']);
    itemsHeader.font = { bold: true };

    invoice.items.forEach((item) => {
      worksheet.addRow([
        item.description,
        item.quantity,
        item.price,
        item.total,
      ]);
    });

    worksheet.addRow([]);
    worksheet.addRow(['', '', 'Subtotal', invoice.subtotal]);
    worksheet.addRow(['', '', 'ITBIS', invoice.tax]);
    worksheet.addRow(['', '', 'Total', invoice.amount]);
    worksheet.addRow(['', '', 'Pagado', invoice.paidAmount]);
    worksheet.addRow(['', '', 'Saldo', invoice.balance]);

    worksheet.columns = [
      { width: 40 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
    ];

    ['C', 'D'].forEach((col) => {
      worksheet.getColumn(col).numFmt = '#,##0.00';
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const safeNumber = invoice.invoiceNumber || invoice.id;
    saveAs(blob, `factura_cxc_${safeNumber}.xlsx`);
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

    const amount = newInvoiceTotal;

    if (!customerId || !amount) {
      alert('Cliente y al menos un producto/servicio con monto son obligatorios');
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
      subtotal: newInvoiceSubtotal,
      tax_amount: newInvoiceTax,
      total_amount: newInvoiceTotal,
      paid_amount: 0,
      status: 'pending',
      notes: description,
    };

    const linesPayload = newInvoiceItems
      .filter((it) => (it.description || it.itemId) && (it.quantity || 0) > 0)
      .map((it, index) => ({
        description: it.description || 'Servicio/Producto',
        quantity: it.quantity || 0,
        unit_price: it.price || 0,
        line_total: it.total || (it.quantity || 0) * (it.price || 0),
        line_number: index + 1,
        item_id: it.itemId ?? null,
      }));

    if (linesPayload.length === 0) {
      alert('Debes agregar al menos un producto o servicio a la factura');
      return;
    }

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

    // Si el monto es mayor que el saldo, se permite y se calcula devuelta
    const effectivePayment = Math.min(amountToPay, currentInvoice.balance);
    const change = amountToPay - effectivePayment;

    const newPaid = currentInvoice.paidAmount + effectivePayment;
    const newBalance = currentInvoice.amount - newPaid;
    const newStatus: Invoice['status'] = newBalance > 0 ? 'partial' : 'paid';

    try {
      await invoicesService.updatePayment(invoiceId, newPaid, newStatus);
      await loadInvoices();
      if (change > 0) {
        alert(`Pago registrado correctamente. Devuelta: RD$ ${change.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        alert('Pago registrado exitosamente');
      }
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
                        <button
                          onClick={() => handleExportInvoiceExcel(invoice.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Exportar a Excel"
                        >
                          <i className="ri-file-excel-2-line"></i>
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
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
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
                
                {selectedCustomer && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    {selectedCustomer.document && (
                      <p>Documento: {selectedCustomer.document}</p>
                    )}
                    {selectedCustomer.phone && (
                      <p>Teléfono: {selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer.email && (
                      <p>Email: {selectedCustomer.email}</p>
                    )}
                    {selectedCustomer.address && (
                      <p>Dirección: {selectedCustomer.address}</p>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productos/Servicios
                  </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Precio</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newInvoiceItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 align-top">
                              <div className="space-y-2">
                                <select
                                  value={item.itemId || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const invItem = inventoryItems.find((it: any) => String(it.id) === selectedId);
                                    setNewInvoiceItems((prev) => {
                                      const next = [...prev];
                                      if (invItem) {
                                        const rawPrice =
                                          invItem.selling_price ??
                                          invItem.sale_price ??
                                          invItem.price ??
                                          invItem.cost_price ??
                                          0;
                                        const price = Number(rawPrice) || 0;
                                        const qty = next[index].quantity || 1;
                                        next[index] = {
                                          ...next[index],
                                          itemId: selectedId || undefined,
                                          description: invItem.name || '',
                                          price,
                                          total: qty * price,
                                        };
                                      } else {
                                        next[index] = {
                                          ...next[index],
                                          itemId: undefined,
                                        };
                                      }
                                      recalcNewInvoiceTotals(next);
                                      return next;
                                    });
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">-- Seleccionar ítem de inventario (opcional) --</option>
                                  {inventoryItems.map((it: any) => (
                                    <option key={it.id} value={String(it.id)}>
                                      {it.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => {
                                    const desc = e.target.value;
                                    setNewInvoiceItems((prev) => {
                                      const next = [...prev];
                                      next[index] = {
                                        ...next[index],
                                        description: desc,
                                        itemId: undefined,
                                      };
                                      next[index].total =
                                        (next[index].quantity || 0) * (next[index].price || 0);
                                      recalcNewInvoiceTotals(next);
                                      return next;
                                    });
                                  }}
                                  placeholder="Descripción del producto o servicio"
                                  className="w-full p-2 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2 align-top">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const qty = Number(e.target.value) || 0;
                                  setNewInvoiceItems((prev) => {
                                    const next = [...prev];
                                    next[index] = {
                                      ...next[index],
                                      quantity: qty,
                                      total: qty * (next[index].price || 0),
                                    };
                                    recalcNewInvoiceTotals(next);
                                    return next;
                                  });
                                }}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-2 align-top">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => {
                                  const price = Number(e.target.value) || 0;
                                  setNewInvoiceItems((prev) => {
                                    const next = [...prev];
                                    next[index] = {
                                      ...next[index],
                                      price,
                                      total: price * (next[index].quantity || 0),
                                    };
                                    recalcNewInvoiceTotals(next);
                                    return next;
                                  });
                                }}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-2 align-top">
                              <span className="font-medium">
                                RD$ {item.total.toLocaleString('es-DO')}
                              </span>
                            </td>
                            <td className="px-4 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewInvoiceItems((prev) => {
                                    const next = prev.filter((_, i) => i !== index);
                                    if (next.length === 0) {
                                      next.push({
                                        itemId: undefined,
                                        description: '',
                                        quantity: 1,
                                        price: 0,
                                        total: 0,
                                      });
                                    }
                                    recalcNewInvoiceTotals(next);
                                    return next;
                                  });
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setNewInvoiceItems((prev) => [
                          ...prev,
                          { itemId: undefined, description: '', quantity: 1, price: 0, total: 0 },
                        ])
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap md:self-start"
                    >
                      <i className="ri-add-line mr-2"></i>
                      Agregar Producto
                    </button>
                    <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Subtotal:</span>
                          <span className="text-sm font-medium">
                            RD${' '}
                            {newInvoiceSubtotal.toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center space-x-2">
                          <span className="text-sm text-gray-600">Descuento global:</span>
                          <div className="flex items-center space-x-2">
                            <select
                              value={newInvoiceDiscountType}
                              onChange={(e) => {
                                const t = e.target.value === 'fixed' ? 'fixed' : 'percentage';
                                setNewInvoiceDiscountType(t);
                                recalcNewInvoiceTotals(
                                  [...newInvoiceItems],
                                  t,
                                  newInvoiceDiscountPercent,
                                  newInvoiceNoTax,
                                );
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="percentage">% Porcentaje</option>
                              <option value="fixed">Monto</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              value={newInvoiceDiscountPercent}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setNewInvoiceDiscountPercent(val);
                                recalcNewInvoiceTotals(
                                  [...newInvoiceItems],
                                  newInvoiceDiscountType,
                                  val,
                                  newInvoiceNoTax,
                                );
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ITBIS ({currentItbisRate.toFixed(2)}%):</span>
                          <span className="text-sm font-medium">
                            RD${' '}
                            {newInvoiceTax.toLocaleString('es-DO', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between">
                            <span className="text-base font-semibold">Total:</span>
                            <span className="text-base font-semibold">
                              RD${' '}
                              {newInvoiceTotal.toLocaleString('es-DO', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción / Notas
                  </label>
                  <textarea
                    rows={3}
                    name="description"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción general o notas de la factura..."
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