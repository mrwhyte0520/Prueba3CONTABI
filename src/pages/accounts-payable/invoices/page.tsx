import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import {
  apInvoicesService,
  apInvoiceLinesService,
  suppliersService,
  paymentTermsService,
  chartAccountsService,
  bankCurrenciesService,
  bankExchangeRatesService,
  inventoryService,
  supplierTypesService,
  purchaseOrdersService,
  purchaseOrderItemsService,
  storesService,
  taxService,
  settingsService,
} from '../../../services/database';

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
  storeName?: string;
  notes?: string;
  expenseType606?: string;
  purchaseOrderId?: string | null;
}

interface LineFormRow {
  description: string;
  expenseAccountId: string;
  quantity: string;
  unitPrice: string;
  inventoryItemId?: string;
  discountPercentage?: string;
}

export default function APInvoicesPage() {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<APInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierTypes, setSupplierTypes] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<
    Array<{ code: string; name: string; symbol: string; is_base?: boolean; is_active?: boolean }>
  >([]);
  const [baseCurrencyCode, setBaseCurrencyCode] = useState<string>('DOP');
  const [stores, setStores] = useState<Array<{ id: string; name: string; is_active?: boolean }>>([]);

  const [taxConfig, setTaxConfig] = useState<{
    itbis_rate: number;
    withholding_rates: { [key: string]: number };
  } | null>(null);

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
    storeName: 'Tienda principal',
    notes: '',
    expenseType606: '',
    itbisToCost: false,
    discountType: '',
    discountValue: '',
    purchaseOrderId: '',
  });

  const [otherTaxes, setOtherTaxes] = useState<Array<{ name: string; rate: string }>>([]);

  const expenseTypes606 = [
    '01 - Gastos de personal',
    '02 - Gastos por trabajo, suministros y servicios',
    '03 - Arrendamientos',
    '04 - Gastos de activos fijos',
    '05 - Gastos de representación',
    '06 - Otras deducciones admitidas',
    '07 - Gastos financieros',
    '08 - Gastos extraordinarios',
    '09 - Compras y gastos que forman parte del costo',
    '10 - Adquisiciones de activos',
    '11 - Gastos no admitidos',
  ];

  const [lines, setLines] = useState<LineFormRow[]>([
    { description: '', expenseAccountId: '', quantity: '1', unitPrice: '0', inventoryItemId: '', discountPercentage: '0' },
  ]);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);

  const handleAddTax = () => {
    setOtherTaxes(prev => [...prev, { name: '', rate: '0' }]);
  };

  const handleRemoveTax = (index: number) => {
    setOtherTaxes(prev => prev.filter((_, i) => i !== index));
  };

  const handleTaxChange = (index: number, field: 'name' | 'rate', value: string) => {
    setOtherTaxes(prev => prev.map((tax, i) => (i === index ? { ...tax, [field]: value } : tax)));
  };

  const loadLookups = async () => {
    if (!user?.id) return;
    try {
      const [supRows, termRows, accounts, inventory, typeRows, poRows, storesData] = await Promise.all([
        suppliersService.getAll(user.id),
        paymentTermsService.getAll(user.id),
        chartAccountsService.getAll(user.id),
        inventoryService.getItems(user.id),
        supplierTypesService.getAll(user.id),
        purchaseOrdersService.getAll(user.id),
        storesService.getAll(user.id),
      ]);

      setSuppliers(supRows || []);

      setPaymentTerms(termRows || []);
      setInventoryItems(inventory || []);
      setSupplierTypes(typeRows || []);
      setPurchaseOrders(poRows || []);
      setStores((storesData || []).filter((s: any) => s.is_active !== false));

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

  const loadTaxConfig = async () => {
    try {
      const data = await taxService.getTaxConfiguration();
      if (data) {
        setTaxConfig({
          itbis_rate: typeof data.itbis_rate === 'number' ? data.itbis_rate : 18,
          withholding_rates: data.withholding_rates || { itbis: 0, isr: 0 },
        });
      } else {
        setTaxConfig({
          itbis_rate: 18,
          withholding_rates: { itbis: 0, isr: 0 },
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando configuración de impuestos para facturas de suplidor', error);
      setTaxConfig({
        itbis_rate: 18,
        withholding_rates: { itbis: 0, isr: 0 },
      });
    }
  };

  const loadInvoices = async () => {
    if (!user?.id) return;
    try {
      const uid = user.id;

      const [rows, currs] = await Promise.all([
        apInvoicesService.getAll(uid),
        bankCurrenciesService.getAll(uid),
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

      const today = new Date().toISOString().slice(0, 10);

      const mapped: APInvoice[] = await Promise.all((rows || []).map(async (inv: any) => {
        const currency = (inv.currency as string) || baseCode;
        const totalGross = Number(inv.total_gross) || 0;
        const totalItbis = Number(inv.total_itbis) || 0;
        const totalIsrWithheld = Number(inv.total_isr_withheld) || 0;
        const totalToPay = Number(inv.total_to_pay) || 0;

        let baseTotalToPay: number | null = totalToPay;
        if (currency !== baseCode) {
          try {
            const rate = await bankExchangeRatesService.getEffectiveRate(
              uid,
              currency,
              baseCode,
              (inv.invoice_date as string) || today,
            );
            if (rate && rate > 0) {
              baseTotalToPay = totalToPay * rate;
            } else {
              baseTotalToPay = null;
            }
          } catch (fxError) {
            // eslint-disable-next-line no-console
            console.error('Error calculando equivalente en moneda base para factura CxP', fxError);
            baseTotalToPay = null;
          }
        }

        return {
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
          currency,
          totalGross,
          totalItbis,
          totalIsrWithheld,
          totalToPay,
          status: inv.status || 'pending',
          storeName: (inv as any).store_name || '',
          notes: (inv as any).notes || '',
          expenseType606: (inv as any).expense_type_606 || '',
          purchaseOrderId: (inv as any).purchase_order_id || null,
          // campo adicional usado solo en UI; TypeScript lo admite porque APInvoice es estructura abierta
          baseTotalToPay,
        } as APInvoice;
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
    loadTaxConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const loadCompanyInfo = async () => {
      const info = await settingsService.getCompanyInfo();
      setCompanyInfo(info);
    };
    loadCompanyInfo();
  }, [user?.id]);

  const handleAddLine = () => {
    setLines(prev => [...prev, { description: '', expenseAccountId: '', quantity: '1', unitPrice: '0', inventoryItemId: '', discountPercentage: '0' }]);
  };

  const handleLineChange = (index: number, field: keyof LineFormRow, value: string) => {
    setLines(prev => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const getCurrentSupplierTaxProfile = () => {
    const selected = suppliers.find((s: any) => String(s.id) === String(headerForm.supplierId));

    let supplierType: any | null = null;
    if (selected?.supplier_type_id && supplierTypes.length > 0) {
      supplierType = supplierTypes.find((t: any) => String(t.id) === String(selected.supplier_type_id)) || null;
    }

    const affectsItbis = supplierType ? (supplierType.affects_itbis !== false && !supplierType.is_non_taxpayer) : true;
    const affectsIsr = supplierType ? (supplierType.affects_isr !== false) : true;

    const isNonTaxpayer = !!supplierType?.is_non_taxpayer;
    const isRst = !!supplierType?.is_rst;
    const isOng = !!supplierType?.is_ong;

    const defaultItbisWithholding =
      taxConfig?.withholding_rates && typeof taxConfig.withholding_rates.itbis === 'number'
        ? Number(taxConfig.withholding_rates.itbis)
        : 0;
    const defaultIsrWithholding =
      taxConfig?.withholding_rates && typeof taxConfig.withholding_rates.isr === 'number'
        ? Number(taxConfig.withholding_rates.isr)
        : 0;

    const itbisWithholdingRate =
      selected && typeof selected.itbis_withholding_rate === 'number'
        ? Number(selected.itbis_withholding_rate)
        : defaultItbisWithholding;
    const isrWithholdingRate =
      selected && typeof selected.isr_withholding_rate === 'number'
        ? Number(selected.isr_withholding_rate)
        : defaultIsrWithholding;

    return { affectsItbis, affectsIsr, isNonTaxpayer, isRst, isOng, itbisWithholdingRate, isrWithholdingRate };
  };

  const calculateTotals = () => {
    const { affectsItbis, affectsIsr, itbisWithholdingRate, isrWithholdingRate } = getCurrentSupplierTaxProfile();
    // Calcular subtotales por línea (con descuentos de línea)
    let grossBeforeDiscount = 0;
    let totalLineDiscounts = 0;
    
    lines.forEach(line => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      const lineTotal = qty * price;
      const discountPct = Number(line.discountPercentage) || 0;
      const lineDiscount = lineTotal * (discountPct / 100);
      
      grossBeforeDiscount += lineTotal;
      totalLineDiscounts += lineDiscount;
    });

    const grossAfterLineDiscounts = grossBeforeDiscount - totalLineDiscounts;

    // Aplicar descuento global
    let globalDiscount = 0;
    if (headerForm.discountType === 'percentage') {
      const discountPct = Number(headerForm.discountValue) || 0;
      globalDiscount = grossAfterLineDiscounts * (discountPct / 100);
    } else if (headerForm.discountType === 'fixed') {
      globalDiscount = Number(headerForm.discountValue) || 0;
    }

    const grossAfterAllDiscounts = Math.max(0, grossAfterLineDiscounts - globalDiscount);
    const totalDiscount = totalLineDiscounts + globalDiscount;

    // Calcular ITBIS según tasa configurada
    const itbisRate = taxConfig?.itbis_rate ?? 18;
    const baseItbis = grossAfterAllDiscounts * (itbisRate / 100);
    const itbis = affectsItbis ? baseItbis : 0;

    // Calcular otros impuestos
    let totalOtherTaxes = 0;
    const otherTaxesDetail = otherTaxes
      .filter(tax => tax.name.trim() && Number(tax.rate) > 0)
      .map(tax => {
        const rate = Number(tax.rate) / 100;
        const amount = grossAfterAllDiscounts * rate;
        totalOtherTaxes += amount;
        return { name: tax.name, rate: Number(tax.rate), amount };
      });

    // Calcular ITBIS retenido (porcentaje del ITBIS facturado)
    let itbisWithheld = 0;
    if (affectsItbis && itbisWithholdingRate > 0 && itbis > 0) {
      itbisWithheld = itbis * (itbisWithholdingRate / 100);
    }

    // Calcular retenciones ISR sobre el monto neto (sin ITBIS)
    let isr = 0;
    if (affectsIsr && isrWithholdingRate > 0) {
      const isrBase = grossAfterAllDiscounts;
      isr = isrBase * (isrWithholdingRate / 100);
    }

    const toPay = grossAfterAllDiscounts + itbis + totalOtherTaxes - itbisWithheld - isr;

    return { 
      gross: grossBeforeDiscount, 
      totalDiscount,
      grossAfterDiscount: grossAfterAllDiscounts,
      itbis, 
      totalOtherTaxes,
      otherTaxesDetail,
      itbisWithheld,
      isr, 
      toPay 
    };
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
      currency: baseCurrencyCode || 'DOP',
      storeName: 'Tienda principal',
      notes: '',
      expenseType606: '',
      itbisToCost: false,
      discountType: '',
      discountValue: '',
      purchaseOrderId: '',
    });
    setLines([{ description: '', expenseAccountId: '', quantity: '1', unitPrice: '0', inventoryItemId: '', discountPercentage: '0' }]);
    setOtherTaxes([]);
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
      storeName: invoice.storeName || 'Tienda principal',
      notes: invoice.notes || '',
      expenseType606: invoice.expenseType606 || '',
      itbisToCost: false,
      discountType: '',
      discountValue: '',
      purchaseOrderId: '',
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

  const handleSupplierChange = (supplierId: string) => {
    setHeaderForm((prev) => {
      const selected = suppliers.find((s: any) => String(s.id) === supplierId);
      return {
        ...prev,
        supplierId,
        taxId: selected?.tax_id || prev.taxId,
        legalName: selected?.legal_name || selected?.name || prev.legalName,
        paymentTermsId: selected?.payment_terms_id ? String(selected.payment_terms_id) : prev.paymentTermsId,
        expenseType606: selected?.expense_type_606 || '',
        purchaseOrderId: '',
      };
    });
  };

  const handlePurchaseOrderChange = async (poId: string) => {
    setHeaderForm((prev) => ({ ...prev, purchaseOrderId: poId }));

    if (!poId || !user?.id) return;

    try {
      const orderItems = await purchaseOrderItemsService.getByOrder(poId);

      if (!orderItems || orderItems.length === 0) return;

      const mappedLines: LineFormRow[] = orderItems.map((it: any) => ({
        description: it.description || (it.inventory_items as any)?.name || '',
        expenseAccountId: '',
        quantity: String(it.quantity ?? '1'),
        unitPrice: String(it.unit_cost ?? '0'),
        inventoryItemId: it.inventory_item_id ? String(it.inventory_item_id) : '',
        discountPercentage: '0',
      }));

      setLines(mappedLines.length > 0 ? mappedLines : [{ description: '', expenseAccountId: '', quantity: '1', unitPrice: '0', inventoryItemId: '', discountPercentage: '0' }]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando líneas desde orden de compra', error);
    }
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const generatedNumber = `AP-${year}-${timestamp}`;
    setHeaderForm(prev => ({ ...prev, invoiceNumber: generatedNumber }));
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

  const handlePrintInvoice = async (invoice: APInvoice) => {
    try {
      const dbLines = await apInvoiceLinesService.getByInvoice(invoice.id);
      const items = (dbLines || []).map((l: any) => {
        const qty = Number(l.quantity) || 0;
        const price = Number(l.unit_price) || 0;
        const total = Number(l.line_total) || qty * price;
        return {
          description: l.description || (l.inventory_items as any)?.name || 'Gasto / Servicio',
          quantity: qty,
          unitPrice: price,
          total,
        };
      });

      if (items.length === 0) {
        items.push({
          description: invoice.expenseType606 || 'Gasto / Servicio',
          quantity: 1,
          unitPrice: invoice.totalToPay,
          total: invoice.totalToPay,
        });
      }

      const supplierName = invoice.legalName || invoice.supplierName;
      const companyName = (companyInfo as any)?.name || (companyInfo as any)?.company_name || 'ContaBi';
      const companyRnc = (companyInfo as any)?.ruc || (companyInfo as any)?.tax_id || '';
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('No se pudo abrir la ventana de impresión.');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Factura de Suplidor ${invoice.invoiceNumber}</title>
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
              <h2>Factura de Suplidor #${invoice.invoiceNumber}</h2>
              <p>Fecha: ${new Date(invoice.invoiceDate).toLocaleDateString('es-DO')}</p>
            </div>
            <div class="details">
              <p><strong>Suplidor:</strong> ${supplierName}</p>
              ${invoice.taxId ? `<p><strong>RNC / Tax ID:</strong> ${invoice.taxId}</p>` : ''}
              ${invoice.storeName ? `<p><strong>Tienda:</strong> ${invoice.storeName}</p>` : ''}
              <p><strong>Moneda:</strong> ${invoice.currency}</p>
              <p><strong>Vencimiento:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-DO') : ''}</p>
              ${invoice.notes ? `<p><strong>Notas:</strong> ${invoice.notes}</p>` : ''}
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
                ${items
                  .map(
                    (item: any) => `
                    <tr>
                      <td>${item.description}</td>
                      <td>${item.quantity}</td>
                      <td>${invoice.currency} ${item.unitPrice.toLocaleString()}</td>
                      <td>${invoice.currency} ${item.total.toLocaleString()}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total">Bruto:</td>
                  <td>${invoice.currency} ${invoice.totalGross.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colspan="3" class="total">ITBIS:</td>
                  <td>${invoice.currency} ${invoice.totalItbis.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colspan="3" class="total">Total a pagar:</td>
                  <td>${invoice.currency} ${invoice.totalToPay.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 1000);
              };
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error al preparar impresión de factura de suplidor', error);
      alert('No se pudo preparar la impresión de la factura.');
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

    if (!headerForm.documentType || headerForm.documentType.trim() === '') {
      alert('Debes ingresar el NCF / Tipo de Comprobante de la factura');
      return;
    }

    if (!headerForm.storeName || headerForm.storeName.trim() === '') {
      alert('Debes indicar la tienda o sucursal que registra la compra');
      return;
    }

    // Validar tipo de gasto 606: obligatorio si el suplidor no lo tiene predefinido
    if (!headerForm.expenseType606 || headerForm.expenseType606.trim() === '') {
      alert('Debes seleccionar el Tipo de gasto 606. Este campo es obligatorio para cumplimiento tributario.');
      return;
    }

    const activeLines = lines.filter(l => l.description.trim() !== '' && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0);
    if (activeLines.length === 0) {
      alert('Agrega al menos una línea con descripción y cantidad > 0');
      return;
    }

    const { gross, totalDiscount, grossAfterDiscount, itbis, totalOtherTaxes, otherTaxesDetail, itbisWithheld, isr, toPay } = calculateTotals();
    const { affectsItbis } = getCurrentSupplierTaxProfile();

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
      total_itbis_withheld: itbisWithheld,
      total_isr_withheld: isr,
      total_to_pay: toPay,
      store_name: headerForm.storeName || null,
      notes: headerForm.notes || null,
      expense_type_606: headerForm.expenseType606 || null,
      discount_type: headerForm.discountType || null,
      discount_value: headerForm.discountValue ? Number(headerForm.discountValue) : 0,
      total_discount: totalDiscount,
      itbis_to_cost: headerForm.itbisToCost,
      other_taxes: otherTaxesDetail.length > 0 ? JSON.stringify(otherTaxesDetail) : null,
      total_other_taxes: totalOtherTaxes,
      purchase_order_id: headerForm.purchaseOrderId || null,
      status: editingInvoice?.status || 'pending',
    };

    const linesPayload = activeLines.map((l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const lineTotal = qty * price;
      const discountPct = Number(l.discountPercentage) || 0;
      const lineDiscountAmt = lineTotal * (discountPct / 100);
      const lineTotalAfterDiscount = lineTotal - lineDiscountAmt;
      const itbisRate = taxConfig?.itbis_rate ?? 18;
      const lineItbis = affectsItbis ? lineTotalAfterDiscount * (itbisRate / 100) : 0;
      return {
        description: l.description,
        expense_account_id: l.expenseAccountId || null,
        inventory_item_id: l.inventoryItemId || null,
        quantity: qty,
        unit_price: price,
        line_total: lineTotal,
        discount_percentage: discountPct,
        discount_amount: lineDiscountAmt,
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
                      <td className="px-4 py-2 whitespace-nowrap text-right text-gray-900 font-semibold">
                        <div>
                          {inv.currency} {inv.totalToPay.toLocaleString()}
                        </div>
                        {(inv as any).baseTotalToPay != null && inv.currency !== baseCurrencyCode && (
                          <div className="text-xs text-gray-500">
                            ≈ {baseCurrencyCode}{' '}
                            {(inv as any).baseTotalToPay.toLocaleString()}
                          </div>
                        )}
                      </td>
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
                            onClick={() => handlePrintInvoice(inv)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Imprimir"
                          >
                            <i className="ri-printer-line" />
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
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccione un suplidor...</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Compra <span className="text-red-500">*</span></label>
                    <select
                      value={headerForm.purchaseOrderId}
                      onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sin orden de compra</option>
                      {purchaseOrders
                        .filter((po: any) => headerForm.supplierId && String(po.supplier_id) === String(headerForm.supplierId))
                        .filter((po: any) => po.status !== 'cancelled')
                        .map((po: any) => (
                          <option key={po.id} value={po.id}>
                            {(po.po_number || po.id)} - {po.order_date} - Total {Number(po.total_amount || 0).toLocaleString()}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Si seleccionas una orden, se cargarán sus líneas en esta factura. Luego puedes ajustar cantidades o eliminar líneas.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NCF / Tipo Comprobante *</label>
                    <input
                      type="text"
                      required
                      value={headerForm.documentType}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, documentType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: B01, B02..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={headerForm.invoiceNumber}
                        onChange={(e) => setHeaderForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: FAC-0001"
                      />
                      <button
                        type="button"
                        onClick={generateInvoiceNumber}
                        className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
                        title="Generar código automático"
                      >
                        <i className="ri-refresh-line" />
                      </button>
                    </div>
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
                      {currencies.length === 0 ? (
                        <>
                          <option value="DOP">DOP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </>
                      ) : (
                        currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} - {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de gasto 606 *</label>
                    <select
                      value={headerForm.expenseType606}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, expenseType606: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccione tipo de gasto...</option>
                      {expenseTypes606.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Obligatorio para formulario 606 de la DGII
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tienda / Sucursal *</label>
                    {stores.length > 0 ? (
                      <select
                        value={headerForm.storeName}
                        onChange={(e) => setHeaderForm(prev => ({ ...prev, storeName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                      >
                        <option value="">Seleccionar tienda...</option>
                        {stores.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={headerForm.storeName}
                        onChange={(e) => setHeaderForm(prev => ({ ...prev, storeName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: Tienda principal"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea
                      value={headerForm.notes}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Notas u observaciones de la factura"
                    />
                  </div>
                </div>

                {/* Descuentos y opciones especiales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Descuento</label>
                    <select
                      value={headerForm.discountType}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, discountType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sin descuento global</option>
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor del Descuento</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={headerForm.discountValue}
                      onChange={(e) => setHeaderForm(prev => ({ ...prev, discountValue: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={headerForm.discountType === 'percentage' ? 'Ej: 10' : 'Ej: 100.00'}
                      disabled={!headerForm.discountType}
                    />
                    {headerForm.discountType && (
                      <p className="mt-1 text-xs text-gray-500">
                        {headerForm.discountType === 'percentage' ? 'Porcentaje aplicado a la factura completa' : 'Monto fijo a descontar del total'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center">
                    <label className="inline-flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={headerForm.itbisToCost}
                        onChange={(e) => setHeaderForm(prev => ({ ...prev, itbisToCost: e.target.checked }))}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span>
                        ITBIS llevado al costo
                        <span className="block text-xs text-gray-500">El ITBIS se suma al gasto en vez de crédito fiscal</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Otros Impuestos */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">Otros Impuestos (Además de ITBIS)</h3>
                    <button
                      type="button"
                      onClick={handleAddTax}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <i className="ri-add-line mr-1" />
                      Agregar impuesto
                    </button>
                  </div>
                  {otherTaxes.length > 0 && (
                    <div className="space-y-2">
                      {otherTaxes.map((tax, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={tax.name}
                            onChange={(e) => handleTaxChange(index, 'name', e.target.value)}
                            placeholder="Ej: Impuesto Selectivo"
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="relative w-32">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={tax.rate}
                              onChange={(e) => handleTaxChange(index, 'rate', e.target.value)}
                              placeholder="0"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTax(index)}
                            className="text-red-600 hover:text-red-900 px-2"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {otherTaxes.length === 0 && (
                    <p className="text-xs text-gray-500">No hay otros impuestos agregados</p>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Líneas de la Factura</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full text-xs md:text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left font-medium text-gray-600 text-xs">Ítem/Descripción</th>
                          <th className="px-2 py-2 text-left font-medium text-gray-600 text-xs">Cuenta</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-600 text-xs">Cant.</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-600 text-xs">Precio</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-600 text-xs">Desc.%</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-600 text-xs">Total</th>
                          <th className="px-2 py-2 text-center font-medium text-gray-600 text-xs">-</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {lines.map((line, index) => {
                          const qty = Number(line.quantity) || 0;
                          const price = Number(line.unitPrice) || 0;
                          const lineTotal = qty * price;
                          const discountPct = Number(line.discountPercentage) || 0;
                          const discountAmt = lineTotal * (discountPct / 100);
                          const totalAfterDiscount = lineTotal - discountAmt;
                          return (
                            <tr key={index}>
                              <td className="px-2 py-2">
                                <select
                                  value={line.inventoryItemId || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    handleLineChange(index, 'inventoryItemId', selectedId);
                                    const item = inventoryItems.find((i: any) => String(i.id) === String(selectedId));
                                    if (item) {
                                      // Si no hay descripción, usar el nombre del ítem
                                      if (!line.description) {
                                        handleLineChange(index, 'description', item.name || '');
                                      }
                                      // Usar el costo de compra como precio por defecto
                                      const cost = Number(item.cost_price ?? item.purchase_cost ?? 0) || 0;
                                      if (cost > 0) {
                                        handleLineChange(index, 'unitPrice', String(cost));
                                      }
                                    }
                                  }}
                                  className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-1"
                                >
                                  <option value="">Sin ítem</option>
                                  {inventoryItems.map((item: any) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} ({item.sku || 'Sin SKU'})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Descripción"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <select
                                  value={line.expenseAccountId}
                                  onChange={(e) => handleLineChange(index, 'expenseAccountId', e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Seleccione cuenta...</option>
                                  {expenseAccounts.map((acc: any) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.code} - {acc.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.quantity}
                                  onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                                  className="w-16 border border-gray-300 rounded-md px-1 py-1 text-right text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unitPrice}
                                  onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                                  className="w-20 border border-gray-300 rounded-md px-1 py-1 text-right text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={line.discountPercentage}
                                  onChange={(e) => handleLineChange(index, 'discountPercentage', e.target.value)}
                                  className="w-14 border border-gray-300 rounded-md px-1 py-1 text-right text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-2 py-2 text-right text-gray-900 text-xs">
                                <div>{totalAfterDiscount.toLocaleString()}</div>
                                {discountAmt > 0 && (
                                  <div className="text-red-600 text-xs">-{discountAmt.toLocaleString()}</div>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center">
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
                        const { gross, totalDiscount, grossAfterDiscount, itbis, totalOtherTaxes, otherTaxesDetail, itbisWithheld, isr, toPay } = calculateTotals();
                        return (
                          <>
                            <div>Bruto: {headerForm.currency} {gross.toLocaleString()}</div>
                            {totalDiscount > 0 && (
                              <>
                                <div className="text-red-600">Descuentos: -{headerForm.currency} {totalDiscount.toLocaleString()}</div>
                                <div className="text-green-700">Subtotal: {headerForm.currency} {grossAfterDiscount.toLocaleString()}</div>
                              </>
                            )}
                            <div>ITBIS (18%){headerForm.itbisToCost ? ' (al costo)' : ''}: {headerForm.currency} {itbis.toLocaleString()}</div>
                            {itbisWithheld > 0 && (
                              <div className="text-yellow-700">ITBIS Retenido: -{headerForm.currency} {itbisWithheld.toLocaleString()}</div>
                            )}
                            {otherTaxesDetail.map((tax, idx) => (
                              <div key={idx} className="text-purple-700">
                                {tax.name} ({tax.rate}%): {headerForm.currency} {tax.amount.toLocaleString()}
                              </div>
                            ))}
                            {isr > 0 && <div>Retenciones ISR: -{headerForm.currency} {isr.toLocaleString()}</div>}
                            <div className="font-semibold text-lg border-t pt-1">Total a Pagar: {headerForm.currency} {toPay.toLocaleString()}</div>
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

