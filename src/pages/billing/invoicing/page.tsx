import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../../../hooks/useAuth';
import {
  invoicesService,
  paymentTermsService,
  salesRepsService,
  bankCurrenciesService,
  bankExchangeRatesService,
  customersService,
  customerTypesService,
  taxService,
  inventoryService,
  storesService,
  settingsService,
} from '../../../services/database';

interface UiInvoiceItem {
  itemId?: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface UiInvoice {
  id: string; // número visible
  customerId?: string;
  customer: string;
  customerEmail: string;
  customerDocument?: string;
  customerPhone?: string;
  customerAddress?: string;
  amount: number; // subtotal
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  date: string;
  dueDate: string;
  items: UiInvoiceItem[];
  salesRepId?: string | null;
  currency: string;
  baseTotal?: number | null;
}

export default function InvoicingPage() {
  const { user } = useAuth();
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoices, setInvoices] = useState<UiInvoice[]>([]);
  const [loading, setLoading] = useState(false);

  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);

  const [paymentTerms, setPaymentTerms] = useState<Array<{ id: string; name: string; days?: number }>>([]);
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [currencies, setCurrencies] = useState<
    Array<{ code: string; name: string; symbol: string; is_base?: boolean; is_active?: boolean }>
  >([]);
  const [baseCurrencyCode, setBaseCurrencyCode] = useState<string>('DOP');
  const [customers, setCustomers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      document: string;
      phone?: string;
      address?: string;
      customerTypeId?: string | null;
      paymentTermId?: string | null;
      ncfType?: string | null;
      documentType?: string | null;
    }>
  >([]);
  const [customerTypes, setCustomerTypes] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [stores, setStores] = useState<Array<{ id: string; name: string; is_active?: boolean }>>([]);

  const [taxConfig, setTaxConfig] = useState<{ itbis_rate: number } | null>(null);

  const [newInvoiceCustomerId, setNewInvoiceCustomerId] = useState('');
  const [newInvoiceCustomerSearch, setNewInvoiceCustomerSearch] = useState('');
  const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [newInvoicePaymentTermId, setNewInvoicePaymentTermId] = useState<string | null>(null);
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState(newInvoiceDate);
  const [newInvoiceSalesRepId, setNewInvoiceSalesRepId] = useState<string | null>(null);
  const [newInvoiceCurrency, setNewInvoiceCurrency] = useState<string>('DOP');
  const [newInvoiceDiscountType, setNewInvoiceDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newInvoiceDiscountPercent, setNewInvoiceDiscountPercent] = useState(0);
  const [newInvoiceNoTax, setNewInvoiceNoTax] = useState(false);
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');
  const [newInvoiceStoreName, setNewInvoiceStoreName] = useState('Tienda principal');

  type NewItem = { itemId?: string; description: string; quantity: number; price: number; total: number };
  const [newInvoiceItems, setNewInvoiceItems] = useState<NewItem[]>([
    { itemId: undefined, description: '', quantity: 1, price: 0, total: 0 },
  ]);
  const [newInvoiceSubtotal, setNewInvoiceSubtotal] = useState(0);
  const [newInvoiceTax, setNewInvoiceTax] = useState(0);
  const [newInvoiceTotal, setNewInvoiceTotal] = useState(0);

  const products = [
    { id: '1', name: 'Laptop Dell Inspiron 15', price: 35000, stock: 25 },
    { id: '2', name: 'Monitor Samsung 24"', price: 12500, stock: 45 },
    { id: '3', name: 'Impresora HP LaserJet', price: 18000, stock: 18 },
    { id: '4', name: 'Teclado Mecánico RGB', price: 7500, stock: 67 },
    { id: '5', name: 'Mouse Inalámbrico', price: 5000, stock: 120 }
  ];

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

  const loadTaxConfig = async () => {
    try {
      const data = await taxService.getTaxConfiguration();
      if (data && typeof data.itbis_rate === 'number') {
        setTaxConfig({ itbis_rate: data.itbis_rate });
      } else {
        setTaxConfig({ itbis_rate: 18 });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando configuración de impuestos para facturación:', error);
      setTaxConfig({ itbis_rate: 18 });
    }
  };

  const loadInvoices = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [data, currs] = await Promise.all([
        invoicesService.getAll(user.id as string),
        bankCurrenciesService.getAll(user.id as string),
      ]);

      const mappedCurrencies = (currs || []).map((c: any) => ({
        code: c.code as string,
        name: c.name as string,
        symbol: c.symbol as string,
        is_base: !!c.is_base,
        is_active: c.is_active !== false,
      })).filter((c: { is_active?: boolean }) => c.is_active);
      setCurrencies(mappedCurrencies);

      const baseCurrency = mappedCurrencies.find((c: { is_base?: boolean }) => c.is_base) || mappedCurrencies[0];
      const baseCode = baseCurrency?.code || 'DOP';
      setBaseCurrencyCode(baseCode);

      const mapped: UiInvoice[] = await Promise.all((data as any[]).map(async (inv) => {
        const subtotal = Number(inv.subtotal) || 0;
        const tax = Number(inv.tax_amount) || 0;
        const total = Number(inv.total_amount) || subtotal + tax;
        const invCurrency = (inv.currency as string) || baseCode;

        const customerData = (inv.customers as any) || {};

        const items: UiInvoiceItem[] = (inv.invoice_lines || []).map((line: any) => {
          const qty = Number(line.quantity) || 0;
          const unitPrice = Number(line.unit_price) || 0;
          const lineTotal = Number(line.line_total) || qty * unitPrice;
          return {
            itemId: line.item_id ? String(line.item_id) : undefined,
            description: line.description || line.inventory_items?.name || 'Ítem',
            quantity: qty,
            price: unitPrice,
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

        const statusDb = (inv.status as string) || 'pending';
        let status: UiInvoice['status'];
        if (statusDb === 'paid') status = 'paid';
        else if (statusDb === 'overdue') status = 'overdue';
        else if (statusDb === 'draft') status = 'draft';
        else status = 'pending';

        let baseTotal: number | null = total;
        if (invCurrency !== baseCode) {
          try {
            const rate = await bankExchangeRatesService.getEffectiveRate(
              user.id as string,
              invCurrency,
              baseCode,
              (inv.invoice_date as string) || new Date().toISOString().slice(0, 10),
            );
            if (rate && rate > 0) {
              baseTotal = total * rate;
            } else {
              baseTotal = null;
            }
          } catch (fxError) {
            // eslint-disable-next-line no-console
            console.error('Error calculando equivalente en moneda base para factura', fxError);
            baseTotal = null;
          }
        }

        return {
          id: (inv.invoice_number as string) || String(inv.id),
          customerId: String((inv as any).customer_id || customerData.id || ''),
          customer: customerData.name || 'Cliente',
          customerEmail: customerData.email || '',
          customerDocument: customerData.document || customerData.tax_id || '',
          customerPhone: customerData.phone || customerData.contact_phone || '',
          customerAddress: customerData.address || '',
          amount: subtotal,
          tax,
          total,
          status,
          date: (inv.invoice_date as string) || new Date().toISOString().slice(0, 10),
          dueDate: (inv.due_date as string) || (inv.invoice_date as string) || new Date().toISOString().slice(0, 10),
          items,
          salesRepId: (inv as any).sales_rep_id || null,
          currency: invCurrency,
          baseTotal,
        };
      }));

      setInvoices(mapped);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando facturas para Facturación:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadInvoices();
      loadTaxConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const loadPaymentTerms = async () => {
      if (!user?.id) return;
      try {
        const [terms, reps, storesData] = await Promise.all([
          paymentTermsService.getAll(user.id),
          salesRepsService.getAll(user.id),
          storesService.getAll(user.id),
        ]);
        const mappedTerms = (terms || []).map((t: any) => ({
          id: t.id as string,
          name: t.name as string,
          days: typeof t.days === 'number' ? t.days : undefined,
        }));
        setPaymentTerms(mappedTerms);
        setSalesReps((reps || []).filter((r: any) => r.is_active));
        setStores((storesData || []).filter((s: any) => s.is_active !== false));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando términos de pago para facturación:', error);
      }
    };
    loadPaymentTerms();
  }, [user?.id]);

  useEffect(() => {
    const loadCustomersAndTypes = async () => {
      if (!user?.id) {
        setCustomers([]);
        setCustomerTypes([]);
        setInventoryItems([]);
        return;
      }
      try {
        const [rows, types, items] = await Promise.all([
          customersService.getAll(user.id),
          customerTypesService.getAll(user.id),
          inventoryService.getItems(user.id),
        ]);
        const mappedCustomers = (rows || []).map((c: any) => ({
          id: c.id as string,
          name: c.name || c.customer_name || 'Cliente',
          email: c.email || c.contact_email || '',
          document: c.document || c.tax_id || '',
          phone: c.phone || c.contact_phone || '',
          address: c.address || '',
          customerTypeId: c.customerType ?? c.customer_type ?? null,
          paymentTermId: c.paymentTermId ?? c.payment_term_id ?? null,
          ncfType: c.ncfType ?? c.ncf_type ?? null,
          documentType: c.documentType ?? c.document_type ?? null,
        }));
        setCustomers(mappedCustomers);
        setCustomerTypes(types || []);
        setInventoryItems(items || []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando clientes para facturación:', error);
      }
    };
    loadCustomersAndTypes();
  }, [user?.id]);

  const [companyInfo, setCompanyInfo] = useState<any | null>(null);

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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'pending': return 'Pendiente';
      case 'overdue': return 'Vencida';
      case 'draft': return 'Borrador';
      default: return 'Desconocido';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedNewInvoiceCustomer = customers.find((c) => c.id === newInvoiceCustomerId);

  const handleCreateInvoice = () => {
    const today = new Date().toISOString().slice(0, 10);
    setNewInvoiceCustomerId('');
    setNewInvoiceDate(today);
    setNewInvoicePaymentTermId(null);
    setNewInvoiceSalesRepId(null);
    setNewInvoiceDueDate(today);
    const defaultCurrency = currencies.find((c) => c.is_base) || currencies[0];
    setNewInvoiceCurrency(defaultCurrency?.code || 'DOP');
    setNewInvoiceItems([{ itemId: undefined, description: '', quantity: 1, price: 0, total: 0 }]);
    setNewInvoiceSubtotal(0);
    setNewInvoiceTax(0);
    setNewInvoiceTotal(0);
    setNewInvoiceDiscountType('percentage');
    setNewInvoiceDiscountPercent(0);
    setNewInvoiceNoTax(false);
    setNewInvoiceNotes('');
    setNewInvoiceCustomerSearch('');

    const defaultStore = stores.find((s) => s.is_active !== false) || stores[0];
    setNewInvoiceStoreName(defaultStore?.name || 'Tienda principal');

    setShowNewInvoiceModal(true);
  };

  const handleNewInvoiceCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    setNewInvoiceCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      setNewInvoiceDiscountPercent(0);
      setNewInvoiceNoTax(false);
      return;
    }
    const type = customer.customerTypeId ? customerTypes.find((t: any) => t.id === customer.customerTypeId) : null;
    let discountPercent = 0;
    let noTaxFlag = false;
    if (type) {
      discountPercent = Number(type.fixedDiscount) || 0;
      noTaxFlag = Boolean(type.noTax);
    }
    setNewInvoiceDiscountType('percentage');
    setNewInvoiceDiscountPercent(discountPercent);
    setNewInvoiceNoTax(noTaxFlag);

    let dueDate = newInvoiceDate;
    if (customer.paymentTermId) {
      const term = paymentTerms.find((t) => t.id === customer.paymentTermId);
      if (term && typeof term.days === 'number') {
        const base = new Date(newInvoiceDate);
        const d = new Date(base);
        d.setDate(base.getDate() + term.days);
        dueDate = d.toISOString().slice(0, 10);
        setNewInvoicePaymentTermId(customer.paymentTermId);
      }
    } else if (type && typeof type.allowedDelayDays === 'number' && type.allowedDelayDays > 0) {
      const base = new Date(newInvoiceDate);
      const d = new Date(base);
      d.setDate(base.getDate() + type.allowedDelayDays);
      dueDate = d.toISOString().slice(0, 10);
    }
    setNewInvoiceDueDate(dueDate);
    recalcNewInvoiceTotals([...newInvoiceItems], 'percentage', discountPercent, noTaxFlag);
  };

  const handleViewInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    setSelectedInvoice(invoiceId);
    setIsEditingInvoice(false);
    setShowInvoiceDetailModal(true);
  };

  const handleEditInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    if (invoice.status !== 'pending') {
      alert('Solo se pueden editar facturas en estado Pendiente.');
      return;
    }
    setSelectedInvoice(invoiceId);
    setIsEditingInvoice(true);
    setShowInvoiceDetailModal(true);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!user?.id) {
      alert('Debes iniciar sesión para eliminar facturas');
      return;
    }
    if (!confirm(`¿Está seguro de eliminar la factura ${invoiceId}?`)) return;
    try {
      await invoicesService.deleteByExternalId(user.id as string, invoiceId);
      await loadInvoices();
      if (selectedInvoice === invoiceId) {
        setSelectedInvoice(null);
        setShowInvoiceDetailModal(false);
      }
      alert(`Factura ${invoiceId} eliminada correctamente`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error eliminando factura:', error);
      alert('Error al eliminar la factura');
    }
  };

  const handlePrintInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const fullCustomer = invoice.customerId
      ? customers.find((c) => c.id === invoice.customerId)
      : undefined;

    const printCustomerDocument = fullCustomer?.document || invoice.customerDocument || '';
    const printCustomerPhone = fullCustomer?.phone || invoice.customerPhone || '';
    const printCustomerEmail = fullCustomer?.email || invoice.customerEmail || '';
    const printCustomerAddress = fullCustomer?.address || invoice.customerAddress || '';

    const companyName = (companyInfo as any)?.name || (companyInfo as any)?.company_name || 'ContaBi';
    const companyRnc = (companyInfo as any)?.ruc || (companyInfo as any)?.tax_id || '';

    const itbisLabel = (taxConfig?.itbis_rate ?? 18).toFixed(2);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura ${invoice.id}</title>
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
            <h2>Factura #${invoice.id}</h2>
            <p>Fecha: ${new Date(invoice.date).toLocaleDateString('es-DO')}</p>
          </div>

          <div class="details">
            <p><strong>Cliente:</strong> ${invoice.customer}</p>
            ${printCustomerDocument ? `<p><strong>Documento:</strong> ${printCustomerDocument}</p>` : ''}
            ${printCustomerPhone ? `<p><strong>Teléfono:</strong> ${printCustomerPhone}</p>` : ''}
            ${printCustomerEmail ? `<p><strong>Email:</strong> ${printCustomerEmail}</p>` : ''}
            ${printCustomerAddress ? `<p><strong>Dirección:</strong> ${printCustomerAddress}</p>` : ''}
            <p><strong>Vencimiento:</strong> ${new Date(invoice.dueDate).toLocaleDateString('es-DO')}</p>
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
                <td>RD$ ${invoice.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">ITBIS (${itbisLabel}%):</td>
                <td>RD$ ${invoice.tax.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">Total:</td>
                <td>RD$ ${invoice.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportInvoiceExcel = async (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const fullCustomer = invoice.customerId
      ? customers.find((c) => c.id === invoice.customerId)
      : undefined;

    const companyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';
    const companyRnc =
      (companyInfo as any)?.rnc ||
      (companyInfo as any)?.tax_id || '';

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
    worksheet.getCell(`A${headerStartRow}`).value = `Factura #${invoice.id}`;
    worksheet.getCell(`A${headerStartRow}`).font = { bold: true, size: 12 };

    worksheet.addRow([]);

    const customerName = invoice.customer;
    const customerDoc = fullCustomer?.document || invoice.customerDocument || '';
    const customerEmail = fullCustomer?.email || invoice.customerEmail || '';
    const customerPhone = fullCustomer?.phone || invoice.customerPhone || '';

    worksheet.addRow(['Cliente', customerName]);
    if (customerDoc) worksheet.addRow(['Documento', customerDoc]);
    if (customerEmail) worksheet.addRow(['Correo', customerEmail]);
    if (customerPhone) worksheet.addRow(['Teléfono', customerPhone]);
    worksheet.addRow([
      'Fecha',
      new Date(invoice.date).toLocaleDateString('es-DO'),
    ]);
    worksheet.addRow([
      'Vencimiento',
      new Date(invoice.dueDate).toLocaleDateString('es-DO'),
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
    worksheet.addRow(['', '', 'Subtotal', invoice.amount]);
    worksheet.addRow([
      '',
      '',
      `ITBIS (${(taxConfig?.itbis_rate ?? 18).toFixed(2)}%)`,
      invoice.tax,
    ]);
    worksheet.addRow(['', '', 'Total', invoice.total]);

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
    saveAs(blob, `factura_${invoice.id}.xlsx`);
  };

  const handleDuplicateInvoice = (invoiceId: string) => {
    const original = invoices.find((inv) => inv.id === invoiceId);
    if (!original) return;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newId = `FAC-${new Date().getFullYear()}-${randomSuffix}`;
    const today = new Date().toISOString().split('T')[0];

    const duplicated: UiInvoice = {
      ...original,
      id: newId,
      date: today,
      status: 'draft',
      dueDate: original.dueDate,
      items: original.items,
    };

    setInvoices((prev) => [duplicated, ...prev]);
    alert(`Factura duplicada (solo frontend). Nueva factura: ${newId}`);
  };

  const handleSaveInvoiceChanges = async () => {
    if (!user?.id) {
      alert('Debes iniciar sesión para editar facturas');
      return;
    }
    if (!selectedInvoice) return;

    const invoice = invoices.find((inv) => inv.id === selectedInvoice);
    if (!invoice) return;

    try {
      const linesPayload = invoice.items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: item.total,
        line_number: index + 1,
        item_id: item.itemId ?? null,
      }));

      const invoicePatch = {
        subtotal: invoice.amount,
        tax_amount: invoice.tax,
        total_amount: invoice.total,
        invoice_date: invoice.date,
        due_date: invoice.dueDate,
      };

      await invoicesService.updateWithLines(
        user.id as string,
        invoice.id,
        invoicePatch,
        linesPayload,
      );

      await loadInvoices();
      setShowInvoiceDetailModal(false);
      setSelectedInvoice(null);
      setIsEditingInvoice(false);
      alert('Factura actualizada correctamente');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error actualizando factura:', error);
      alert('Error al actualizar la factura');
    }
  };

  const handleExportInvoices = async (format: 'excel' | 'pdf') => {
    try {
      if (format === 'excel') {
        await exportToExcel();
      } else {
        await exportToPdf();
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos. Por favor, intente nuevamente.');
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Facturas');

    const headerCompanyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';

    // Encabezados
    worksheet.addRow([headerCompanyName]);
    worksheet.addRow(['REPORTE DE FACTURAS']);
    worksheet.addRow([`Generado el: ${new Date().toLocaleDateString('es-DO')}`]);
    worksheet.addRow([]);

    // Encabezados de la tabla
    const headerRow = worksheet.addRow([
      'N° Factura',
      'Cliente',
      'Fecha',
      'Vencimiento',
      'Monto',
      'Impuesto',
      'Total',
      'Estado'
    ]);

    // Estilo para los encabezados
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAD3' }
    };

    // Datos
    filteredInvoices.forEach(invoice => {
      worksheet.addRow([
        invoice.id,
        invoice.customer,
        new Date(invoice.date).toLocaleDateString(),
        new Date(invoice.dueDate).toLocaleDateString(),
        invoice.amount,
        invoice.tax,
        invoice.total,
        getStatusText(invoice.status)
      ]);
    });

    // Ajustar anchos de columna
    worksheet.columns = [
      { key: 'id', width: 15 },
      { key: 'customer', width: 30 },
      { key: 'date', width: 12 },
      { key: 'dueDate', width: 12 },
      { key: 'amount', width: 15 },
      { key: 'tax', width: 15 },
      { key: 'total', width: 15 },
      { key: 'status', width: 15 }
    ];

    // Formato de moneda
    const currencyColumns = ['E', 'F', 'G'];
    currencyColumns.forEach(col => {
      for (let i = 6; i <= filteredInvoices.length + 5; i++) {
        const cell = worksheet.getCell(`${col}${i}`);
        cell.numFmt = '#,##0.00';
      }
    });

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const companyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';
    const title = 'REPORTE DE FACTURAS';
    const date = `Generado el: ${new Date().toLocaleDateString('es-DO')}`;

    // Encabezado: nombre de la empresa y título del reporte
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(companyName, pageWidth / 2, 18, { align: 'center' } as any);

    doc.setFontSize(12);
    doc.text(title, pageWidth / 2, 26, { align: 'center' } as any);

    // Fecha
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(date, 14, 34);

    // Datos de la tabla
    const headers = [
      'N° Factura',
      'Cliente',
      'Fecha',
      'Vencimiento',
      'Monto',
      'Impuesto',
      'Total',
      'Estado'
    ];
    
    const data = filteredInvoices.map(invoice => [
      invoice.id,
      invoice.customer,
      new Date(invoice.date).toLocaleDateString(),
      new Date(invoice.dueDate).toLocaleDateString(),
      invoice.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
      invoice.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
      invoice.total.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
      getStatusText(invoice.status)
    ]);
    
    // Añadir tabla
    (doc as any).autoTable({
      head: [headers],
      body: data,
      startY: 40,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 }
      }
    });
    
    // Guardar el PDF
    doc.save(`facturas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSaveNewInvoice = async (mode: 'draft' | 'final') => {
    if (!user?.id) {
      alert('Debes iniciar sesión para crear facturas');
      return;
    }
    if (!newInvoiceCustomerId) {
      alert('Selecciona un cliente');
      return;
    }

    const validItems = newInvoiceItems.filter(i => i.description && i.quantity > 0 && i.price > 0);
    if (validItems.length === 0) {
      alert('Agrega al menos una línea con cantidad y precio mayor que 0');
      return;
    }

    const subtotal = newInvoiceSubtotal;
    const tax = newInvoiceTax;
    const total = newInvoiceTotal;

    // Calcular descuento global aplicado (para guardar en BD)
    const rawSubtotal = validItems.reduce((sum, item) => sum + (item.total || 0), 0);
    let totalDiscount = 0;
    if (newInvoiceDiscountType === 'percentage') {
      totalDiscount = rawSubtotal * (newInvoiceDiscountPercent / 100);
    } else if (newInvoiceDiscountType === 'fixed') {
      totalDiscount = newInvoiceDiscountPercent;
    }
    if (totalDiscount > rawSubtotal) {
      totalDiscount = rawSubtotal;
    }

    // Determinar tipo de comprobante según configuración del cliente (por ahora, predeterminar B02 si no hay nada)
    const customer = customers.find((c) => c.id === newInvoiceCustomerId);
    const documentType = customer?.documentType || customer?.ncfType || 'B02';

    // Obtener NCF desde la serie configurada
    let invoiceNumber = `FAC-${Date.now()}`;
    try {
      const nextNcf = await taxService.getNextNcf(user.id as string, documentType);
      if (nextNcf?.ncf) {
        invoiceNumber = nextNcf.ncf;
      }
    } catch (ncfError) {
      // eslint-disable-next-line no-console
      console.error('No se pudo obtener NCF, usando número interno:', ncfError);
    }
    const status = 'pending';

    const invoicePayload = {
      customer_id: newInvoiceCustomerId,
      invoice_number: invoiceNumber,
      invoice_date: newInvoiceDate,
      due_date: newInvoiceDueDate,
      currency: newInvoiceCurrency || baseCurrencyCode,
      subtotal,
      tax_amount: tax,
      total_amount: total,
      paid_amount: 0,
      status,
      payment_term_id: newInvoicePaymentTermId || null,
      sales_rep_id: newInvoiceSalesRepId || null,
      notes: newInvoiceNotes || null,
      store_name: newInvoiceStoreName || null,
      discount_type: newInvoiceDiscountType,
      discount_value: newInvoiceDiscountPercent,
      total_discount: totalDiscount,
    };

    const linesPayload = validItems.map((item, index) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.price,
      line_total: item.total,
      line_number: index + 1,
      item_id: item.itemId ?? null,
    }));

    try {
      await invoicesService.create(user.id, invoicePayload, linesPayload);
      await loadInvoices();
      setShowNewInvoiceModal(false);
      alert(mode === 'draft' ? 'Factura guardada como borrador' : 'Factura creada correctamente');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creando factura:', error);
      alert('Error al crear la factura');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
            <p className="text-gray-600">Gestión completa de facturas y documentos fiscales</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleExportInvoices('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportInvoices('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Exportar Excel
            </button>
            <button
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Factura
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Facturas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-file-text-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Facturas Pagadas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {invoices.filter(inv => inv.status === 'paid').length}
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
                <p className="text-sm font-medium text-gray-600">Facturas Pendientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {invoices.filter(inv => inv.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100">
                <i className="ri-time-line text-xl text-yellow-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Facturas Vencidas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {invoices.filter(inv => inv.status === 'overdue').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100">
                <i className="ri-alert-line text-xl text-red-600"></i>
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
                  placeholder="Buscar por cliente o número de factura..."
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
                <option value="paid">Pagadas</option>
                <option value="pending">Pendientes</option>
                <option value="overdue">Vencidas</option>
                <option value="draft">Borradores</option>
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

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Facturas ({filteredInvoices.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => {
                  const rep = salesReps.find((r) => r.id === invoice.salesRepId);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invoice.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.customer}</div>
                        <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rep ? rep.name : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.date).toLocaleDateString('es-DO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString('es-DO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.currency || baseCurrencyCode}{' '}
                          {invoice.total.toLocaleString('es-DO')}
                        </div>
                        {invoice.baseTotal != null && invoice.currency !== baseCurrencyCode && (
                          <div className="text-xs text-gray-500">
                            ≈ {baseCurrencyCode}{' '}
                            {invoice.baseTotal.toLocaleString('es-DO')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewInvoice(invoice.id)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Ver factura"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                          <button
                            onClick={() => handleEditInvoice(invoice.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Editar factura"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            onClick={() => handlePrintInvoice(invoice.id)}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="Imprimir factura"
                          >
                            <i className="ri-printer-line"></i>
                          </button>
                          <button
                            onClick={() => handleExportInvoiceExcel(invoice.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Exportar factura a Excel"
                          >
                            <i className="ri-file-excel-2-line"></i>
                          </button>
                          <button
                            onClick={() => handleDuplicateInvoice(invoice.id)}
                            className="text-orange-600 hover:text-orange-900 p-1"
                            title="Duplicar factura"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Eliminar factura"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Detail / Edit Modal */}
        {showInvoiceDetailModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isEditingInvoice ? 'Editar factura' : 'Detalle de factura'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isEditingInvoice
                      ? 'Modifique los datos de la factura y guarde los cambios (solo frontend).'
                      : 'Visualización de la plantilla de la factura.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowInvoiceDetailModal(false);
                    setSelectedInvoice(null);
                    setIsEditingInvoice(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="p-6">
                {(() => {
                  const invoice = invoices.find((inv) => inv.id === selectedInvoice);
                  if (!invoice) return null;

                  const handleFieldChange = (field: 'customer' | 'customerEmail' | 'date' | 'dueDate', value: string) => {
                    if (!isEditingInvoice) return;
                    setInvoices((prev) =>
                      prev.map((inv) =>
                        inv.id === invoice.id
                          ? {
                              ...inv,
                              [field]: value
                            }
                          : inv
                      )
                    );
                  };

                  const handleItemChange = (
                    index: number,
                    field: 'description' | 'quantity' | 'price',
                    value: string
                  ) => {
                    if (!isEditingInvoice) return;
                    setInvoices((prev) =>
                      prev.map((inv) => {
                        if (inv.id !== invoice.id) return inv as any;

                        const items = inv.items.map((item: any, i: number) => {
                          if (i !== index) return item;

                          const updated: any = { ...item };
                          if (field === 'description') {
                            updated.description = value;
                          } else {
                            const num = Number(value) || 0;
                            if (field === 'quantity') {
                              updated.quantity = num;
                            }
                            if (field === 'price') {
                              updated.price = num;
                            }
                          }
                          updated.total = (updated.quantity || 0) * (updated.price || 0);
                          return updated;
                        });

                        const newAmount = items.reduce(
                          (sum: number, item: any) => sum + (item.total || 0),
                          0
                        );
                        const newTax = Math.round(newAmount * 0.18);
                        const newTotal = newAmount + newTax;

                        return {
                          ...inv,
                          items,
                          amount: newAmount,
                          tax: newTax,
                          total: newTotal
                        };
                      })
                    );
                  };

                  return (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="text-xs text-gray-500">N° FACTURA</div>
                          <div className="text-lg font-semibold text-gray-900">{invoice.id}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-xs text-gray-500">Estado</div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500">Cliente</div>
                          {isEditingInvoice ? (
                            <input
                              type="text"
                              value={invoice.customer}
                              onChange={(e) => handleFieldChange('customer', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">{invoice.customer}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">Correo electrónico</div>
                          {isEditingInvoice ? (
                            <input
                              type="email"
                              value={invoice.customerEmail}
                              onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-600">{invoice.customerEmail}</div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-medium text-gray-500">Fecha</div>
                            {isEditingInvoice ? (
                              <input
                                type="date"
                                value={invoice.date}
                                onChange={(e) => handleFieldChange('date', e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 mt-1">
                                {new Date(invoice.date).toLocaleDateString('es-DO')}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500">Fecha de vencimiento</div>
                            {isEditingInvoice ? (
                              <input
                                type="date"
                                value={invoice.dueDate}
                                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 mt-1">
                                {new Date(invoice.dueDate).toLocaleDateString('es-DO')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {invoice.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {isEditingInvoice ? (
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) =>
                                        handleItemChange(index, 'description', e.target.value)
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    item.description
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {isEditingInvoice ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleItemChange(index, 'quantity', e.target.value)
                                      }
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                    />
                                  ) : (
                                    item.quantity
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {isEditingInvoice ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.price}
                                      onChange={(e) =>
                                        handleItemChange(index, 'price', e.target.value)
                                      }
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                    />
                                  ) : (
                                    <>RD$ {item.price.toLocaleString()}</>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  RD$ {item.total.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">Subtotal</td>
                              <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">RD$ {invoice.amount.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">ITBIS ({(taxConfig?.itbis_rate ?? 18).toFixed(2)}%)</td>
                              <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">RD$ {invoice.tax.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Total</td>
                              <td className="px-4 py-2 text-right text-base font-bold text-gray-900">RD$ {invoice.total.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInvoiceDetailModal(false);
                    setSelectedInvoice(null);
                    setIsEditingInvoice(false);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cerrar
                </button>
                {isEditingInvoice && (
                  <button
                    onClick={handleSaveInvoiceChanges}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Guardar cambios
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Invoice Modal */}
        {showNewInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Nueva Factura</h3>
                  <button
                    onClick={() => setShowNewInvoiceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                    <div className="space-y-2">
                      <select
                        value={newInvoiceCustomerId}
                        onChange={handleNewInvoiceCustomerChange}
                        className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8 text-sm"
                      >
                        <option value="">Seleccionar cliente...</option>
                        {customers
                          .filter((c: { name: string; document: string | null }) => {
                            if (!newInvoiceCustomerSearch) return true;
                            const term = newInvoiceCustomerSearch.toLowerCase();
                            return (
                              c.name.toLowerCase().includes(term) ||
                              (c.document || '').toLowerCase().includes(term)
                            );
                          })
                          .map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name} {customer.document ? `- ${customer.document}` : ''}
                            </option>
                          ))}
                      </select>
                      <input
                        type="text"
                        value={newInvoiceCustomerSearch}
                        onChange={(e) => setNewInvoiceCustomerSearch(e.target.value)}
                        placeholder="Buscar por nombre o RNC..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    {selectedNewInvoiceCustomer && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs md:text-sm text-gray-700">
                        <p className="font-medium">{selectedNewInvoiceCustomer.name}</p>
                        {selectedNewInvoiceCustomer.document && (
                          <p>Documento: {selectedNewInvoiceCustomer.document}</p>
                        )}
                        {selectedNewInvoiceCustomer.email && (
                          <p>Email: {selectedNewInvoiceCustomer.email}</p>
                        )}
                        {selectedNewInvoiceCustomer.phone && (
                          <p>Teléfono: {selectedNewInvoiceCustomer.phone}</p>
                        )}
                        {selectedNewInvoiceCustomer.address && (
                          <p>Dirección: {selectedNewInvoiceCustomer.address}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vendedor (opcional)</label>
                    <select
                      value={newInvoiceSalesRepId || ''}
                      onChange={(e) => setNewInvoiceSalesRepId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Sin vendedor asignado</option>
                      {salesReps.map((rep) => (
                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condición de pago</label>
                    <select
                      value={newInvoicePaymentTermId ?? ''}
                      onChange={(e) => {
                        const termId = e.target.value || null;
                        setNewInvoicePaymentTermId(termId);
                        const term = paymentTerms.find((t) => t.id === termId);
                        if (term?.days != null) {
                          const base = new Date(newInvoiceDate);
                          const d = new Date(base);
                          d.setDate(base.getDate() + term.days);
                          setNewInvoiceDueDate(d.toISOString().slice(0, 10));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Sin condición específica</option>
                      {paymentTerms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}{typeof term.days === 'number' ? ` (${term.days} días)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={newInvoiceDueDate}
                      onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tienda / Sucursal</label>
                    {stores.length > 0 ? (
                      <select
                        value={newInvoiceStoreName}
                        onChange={(e) => setNewInvoiceStoreName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
                      >
                        <option value="">Seleccionar tienda...</option>
                        {stores.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={newInvoiceStoreName}
                        onChange={(e) => setNewInvoiceStoreName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Ej: Tienda principal"
                      />
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Productos/Servicios</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newInvoiceItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                <select
                                  value={item.itemId || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const invItem = inventoryItems.find((it: any) => String(it.id) === selectedId);
                                    setNewInvoiceItems((prev) => {
                                      const next = [...prev];
                                      if (invItem) {
                                        // Priorizar precio de venta; si no existe, usar costo
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
                                      }
                                      recalcNewInvoiceTotals(next);
                                      return next;
                                    });
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
                                      next[index] = { ...next[index], description: desc, itemId: undefined };
                                      next[index].total = (next[index].quantity || 0) * (next[index].price || 0);
                                      recalcNewInvoiceTotals(next);
                                      return next;
                                    });
                                  }}
                                  placeholder="Descripción del producto/servicio"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const qty = Number(e.target.value) || 0;
                                  setNewInvoiceItems((prev) => {
                                    const next = [...prev];
                                    next[index] = { ...next[index], quantity: qty, total: qty * (next[index].price || 0) };
                                    recalcNewInvoiceTotals(next);
                                    return next;
                                  });
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => {
                                  const price = Number(e.target.value) || 0;
                                  setNewInvoiceItems((prev) => {
                                    const next = [...prev];
                                    next[index] = { ...next[index], price, total: price * (next[index].quantity || 0) };
                                    recalcNewInvoiceTotals(next);
                                    return next;
                                  });
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium">RD$ {item.total.toLocaleString('es-DO')}</span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setNewInvoiceItems((prev) => {
                                    const next = prev.filter((_, i) => i !== index);
                                    if (next.length === 0) {
                                      next.push({ itemId: undefined, description: '', quantity: 1, price: 0, total: 0 });
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
                  <button
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                    onClick={() => setNewInvoiceItems((prev) => [...prev, { itemId: undefined, description: '', quantity: 1, price: 0, total: 0 }])}
                  >
                    <i className="ri-add-line mr-2"></i>
                    Agregar Producto
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                    <textarea
                      rows={4}
                      value={newInvoiceNotes}
                      onChange={(e) => setNewInvoiceNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Notas adicionales..."
                    ></textarea>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium">RD$ {newInvoiceSubtotal.toLocaleString('es-DO')}</span>
                      </div>
                      <div className="flex justify-between items-center space-x-2">
                        <span className="text-sm text-gray-600">Descuento global:</span>
                        <div className="flex items-center space-x-2">
                          <select
                            value={newInvoiceDiscountType}
                            onChange={(e) => {
                              const t = e.target.value === 'fixed' ? 'fixed' : 'percentage';
                              setNewInvoiceDiscountType(t);
                              // Recalcular usando el mismo valor numérico pero con nuevo tipo
                              recalcNewInvoiceTotals([...newInvoiceItems], t, newInvoiceDiscountPercent, newInvoiceNoTax);
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
                              recalcNewInvoiceTotals([...newInvoiceItems], newInvoiceDiscountType, val, newInvoiceNoTax);
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">ITBIS ({currentItbisRate.toFixed(2)}%):</span>
                        <span className="text-sm font-medium">RD$ {newInvoiceTax.toLocaleString('es-DO')}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold">Total:</span>
                          <span className="text-base font-semibold">RD$ {newInvoiceTotal.toLocaleString('es-DO')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveNewInvoice('draft')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors whitespace-nowrap"
                >
                  Guardar Borrador
                </button>
                <button
                  onClick={() => handleSaveNewInvoice('final')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Crear Factura
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}