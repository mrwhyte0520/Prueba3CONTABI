import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { exportToPdf } from '../../../utils/exportImportUtils';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
import { quotesService, customersService, invoicesService, paymentTermsService } from '../../../services/database';

// Tipos de datos
type StatusType = 'pending' | 'approved' | 'under_review' | 'rejected' | 'expired';

interface QuoteItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface NewQuoteFormProps {
  customers: Array<{ id: string; name: string; email: string; phone: string }>;
  paymentTerms: Array<{ id: string; name: string; days?: number }>;
  onCancel: () => void;
  onSaved: () => void;
  userId?: string;
}

function NewQuoteForm({ customers, paymentTerms, onCancel, onSaved, userId }: NewQuoteFormProps) {
  const [customerId, setCustomerId] = useState('');
  const [project, setProject] = useState('');
  const [validUntil, setValidUntil] = useState<string>(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [probability, setProbability] = useState<number>(50);
  const [paymentTermId, setPaymentTermId] = useState<string | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, price: 0, total: 0 }
  ]);
  const ITBIS_RATE = 0.18;

  const recomputeTotals = (its: QuoteItem[]) => {
    return its.map(it => ({ ...it, total: (it.quantity || 0) * (it.price || 0) }));
  };

  const subtotal = items.reduce((s, it) => s + (it.total || 0), 0);
  const tax = Math.round(subtotal * ITBIS_RATE * 100) / 100;
  const total = subtotal + tax;

  const addRow = () => setItems(prev => [...prev, { description: '', quantity: 1, price: 0, total: 0 }]);
  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof QuoteItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      const row = { ...copy[idx], [field]: field === 'quantity' || field === 'price' ? Number(value) : value } as QuoteItem;
      row.total = (row.quantity || 0) * (row.price || 0);
      copy[idx] = row;
      return recomputeTotals(copy);
    });
  };

  const save = async () => {
    try {
      if (!userId) {
        toast.error('Debes iniciar sesión para crear una cotización');
        return;
      }
      if (!customerId) {
        toast.error('Seleccione un cliente');
        return;
      }
      if (items.length === 0 || items.every(it => !it.description || !it.quantity || !it.price)) {
        toast.error('Agregue al menos una línea válida');
        return;
      }

      const customer = customers.find(c => c.id === customerId);
      const quotePayload = {
        customer_id: customerId,
        customer_name: customer?.name || '',
        customer_email: customer?.email || '',
        payment_term_id: paymentTermId || null,
        project,
        date: new Date().toISOString().slice(0, 10),
        valid_until: validUntil,
        probability,
        amount: subtotal,
        tax,
        total,
        status: 'pending' as StatusType,
      };
      const linePayloads = items
        .filter(it => it.description && it.quantity > 0 && it.price >= 0)
        .map(it => ({ description: it.description, quantity: it.quantity, price: it.price, total: it.total }));

      await quotesService.create(userId, quotePayload, linePayloads);
      toast.success('Cotización creada exitosamente');
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error('No se pudo crear la cotización');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
          <select
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
          >
            <option value="">Seleccionar cliente...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Proyecto</label>
          <input
            type="text"
            value={project}
            onChange={e => setProject(e.target.value)}
            placeholder="Nombre descriptivo del proyecto"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Condición de pago</label>
          <select
            value={paymentTermId ?? ''}
            onChange={e => setPaymentTermId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
          >
            <option value="">Sin condición específica</option>
            {paymentTerms.map(term => (
              <option key={term.id} value={term.id}>
                {term.name}{typeof term.days === 'number' ? ` (${term.days} días)` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Válida Hasta</label>
          <input
            type="date"
            value={validUntil}
            onChange={e => setValidUntil(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Probabilidad de Cierre (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={probability}
            onChange={e => setProbability(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Productos/Servicios</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.description}
                      onChange={e => updateRow(idx, 'description', e.target.value)}
                      placeholder="Descripción del producto/servicio"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={e => updateRow(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={row.price}
                      onChange={e => updateRow(idx, 'price', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">RD$ {row.total.toLocaleString('es-DO')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => removeRow(idx)} className="text-red-600 hover:text-red-800">
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">
          <i className="ri-add-line mr-2"></i>
          Agregar Línea
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Términos y Condiciones</label>
          <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Términos y condiciones de la propuesta..."></textarea>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium">RD$ {subtotal.toLocaleString('es-DO')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">ITBIS (18%):</span>
              <span className="text-sm font-medium">RD$ {tax.toLocaleString('es-DO')}</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span className="text-base font-semibold">Total:</span>
                <span className="text-base font-semibold">RD$ {total.toLocaleString('es-DO')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 mt-6">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">Cancelar</button>
        <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">Crear Cotización</button>
      </div>
    </div>
  );
}

interface Quote {
  id: string;
  customer: string;
  customerEmail: string;
  project: string;
  amount: number;
  tax: number;
  total: number;
  status: StatusType;
  date: string;
  validUntil: string;
  probability: number;
  items: QuoteItem[];
  created_at?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
}

// Configuración de tablas
const TABLES = {
  QUOTES: 'quotes',
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  QUOTE_ITEMS: 'quote_items'
};

// Verificar conexión con Supabase
const checkSupabaseConnection = async () => {
  try {
    return { connected: true, error: null };
  } catch (error) {
    console.error('Error de conexión con Supabase:', error);
    return { connected: false, error };
  }
};

export default function QuotesPage() {
  const { user } = useAuth();
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Array<{id: string, name: string, email: string, phone: string}>>([]);
  const [services, setServices] = useState<Array<{id: string, name: string, description: string, price: number}>>([]);
  const [paymentTerms, setPaymentTerms] = useState<Array<{ id: string; name: string; days?: number }>>([]);

  // Estado para las cotizaciones
  const [quotes, setQuotes] = useState<Array<{
    id: string;
    customerId?: string;
    customer: string;
    customerEmail: string;
    project: string;
    amount: number;
    tax: number;
    total: number;
    status: 'pending' | 'approved' | 'under_review' | 'rejected' | 'expired';
    date: string;
    validUntil: string;
    probability: number;
    items: Array<{
      description: string;
      quantity: number;
      price: number;
      total: number;
    }>;
  }>>([]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        if (!user?.id) {
          toast.error('Debes iniciar sesión para ver tus cotizaciones');
          setQuotes([]);
          setCustomers([]);
          setServices([]);
          setPaymentTerms([]);
          return;
        }

        const [cust, qts, terms] = await Promise.all([
          customersService.getAll(user.id),
          quotesService.getAll(user.id),
          paymentTermsService.getAll(user.id),
        ]);

        setCustomers((cust || []).map((c: any) => ({
          id: c.id,
          name: c.name || c.customer_name || c.full_name || c.fullname || c.company || c.company_name || 'Cliente',
          email: c.email || c.contact_email || '',
          phone: c.phone || c.contact_phone || ''
        })));

        const mapped = (qts || []).map((q: any) => {
          const subtotal = Number(q.subtotal) || 0;
          const tax = Number(q.tax_amount) || 0;
          const total = Number(q.total_amount) || subtotal + tax;

          const items = (q.quote_lines || q.items || []).map((it: any) => {
            const qty = Number(it.quantity) || 0;
            const unitPrice = Number(it.unit_price) || 0;
            const lineTotal = Number(it.line_total) || qty * unitPrice;
            return {
              description: it.description || '',
              quantity: qty || 1,
              price: unitPrice,
              total: lineTotal,
            };
          });

          return {
            id: q.id,
            customerId: q.customer_id || q.customers?.id || undefined,
            customer: q.customer_name || q.customers?.name || 'Cliente',
            customerEmail: q.customer_email || q.customers?.email || '',
            project: q.project || '',
            amount: subtotal,
            tax,
            total,
            status: (q.status || 'pending') as StatusType,
            date: q.date || q.created_at || new Date().toISOString(),
            validUntil: q.valid_until || q.validUntil || new Date().toISOString(),
            probability: q.probability || 0,
            items,
          };
        });
        setQuotes(mapped);

        const mappedTerms = (terms || []).map((t: any) => ({
          id: t.id as string,
          name: t.name as string,
          days: typeof t.days === 'number' ? t.days : undefined,
        }));
        setPaymentTerms(mappedTerms);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: {[key: string]: string} = {
      'pending': 'Pendiente',
      'under_review': 'En Revisión',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'expired': 'Expirada'
    };
    return statusMap[status] || 'Desconocido';
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    if (probability >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Depuración: Mostrar los datos de cotizaciones
  console.log('Cotizaciones cargadas:', quotes);
  
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (quote.project && quote.project.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const shouldShow = matchesSearch && matchesStatus;
    if (shouldShow) {
      console.log('Cotización mostrada:', quote.id, quote.customer, quote.status);
    }
    return shouldShow;
  });
  
  console.log('Total de cotizaciones filtradas:', filteredQuotes.length);

  const totalQuoteValue = quotes.reduce((sum, quote) => sum + quote.total, 0);
  const approvedQuoteValue = quotes.filter(q => q.status === 'approved').reduce((sum, quote) => sum + quote.total, 0);
  const pendingQuoteValue = quotes.filter(q => q.status === 'pending' || q.status === 'under_review').reduce((sum, quote) => sum + quote.total, 0);

  const handleCreateQuote = () => {
    setShowNewQuoteModal(true);
  };

  const handleExportToPdf = () => {
    try {
      // Preparar los datos para la exportación
      const columns = [
        { key: 'id', label: 'Número' },
        { key: 'customer', label: 'Cliente' },
        { key: 'project', label: 'Proyecto' },
        { key: 'date', label: 'Fecha' },
        { key: 'validUntil', label: 'Válida Hasta' },
        { key: 'total', label: 'Total' },
        { key: 'status', label: 'Estado' },
        { key: 'probability', label: 'Probabilidad (%)' }
      ];

      // Formatear los datos para la exportación
      const dataToExport = quotes.map(quote => ({
        id: quote.id,
        customer: quote.customer,
        project: quote.project || 'Sin proyecto',
        date: new Date(quote.date).toLocaleDateString('es-DO'),
        validUntil: new Date(quote.validUntil).toLocaleDateString('es-DO'),
        total: `RD$ ${quote.total.toLocaleString('es-DO')}`,
        status: getStatusText(quote.status),
        probability: `${quote.probability}%`
      }));

      // Llamar a la función de exportación
      exportToPdf(
        dataToExport, 
        columns, 
        'cotizaciones_ventas', 
        'ContaBi - Reporte de Cotizaciones de Ventas'
      );
      
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };


  const handleViewQuote = (quoteId: string) => {
    alert(`Visualizando cotización: ${quoteId}`);
  };

  const handleEditQuote = (quoteId: string) => {
    alert(`Editando cotización: ${quoteId}`);
  };

  const handleDeleteQuote = (quoteId: string) => {
    if (confirm(`¿Está seguro de eliminar la cotización ${quoteId}?`)) {
      alert(`Cotización ${quoteId} eliminada`);
    }
  };

  const handleSendQuote = (quoteId: string, customerEmail: string) => {
    alert(`Enviando cotización ${quoteId} a ${customerEmail}`);
  };

  const handlePrintQuote = (quoteId: string) => {
    alert(`Imprimiendo cotización: ${quoteId}`);
  };

  const handleConvertToInvoice = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    if (!user?.id) {
      toast.error('Debes iniciar sesión para convertir en factura');
      return;
    }

    if (!quote.customerId) {
      toast.error('La cotización no tiene un cliente válido');
      return;
    }

    if (!confirm(`¿Convertir cotización ${quoteId} en factura?`)) return;

    (async () => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const invoiceNumber = `FAC-${Date.now()}`;

        const invoicePayload = {
          customer_id: quote.customerId,
          invoice_number: invoiceNumber,
          invoice_date: todayStr,
          due_date: quote.validUntil || todayStr,
          currency: 'DOP',
          subtotal: quote.amount,
          tax_amount: quote.tax,
          total_amount: quote.total,
          paid_amount: 0,
          status: 'pending',
          notes: `Generada desde cotización ${quote.id}`,
        };

        const linesPayload = quote.items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.price,
          line_total: item.total,
          line_number: index + 1,
        }));

        await invoicesService.create(user.id, invoicePayload, linesPayload);

        await quotesService.update(quote.id, { status: 'approved' });
        setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'approved' } : q));

        toast.success(`Cotización ${quote.id} convertida en factura ${invoiceNumber}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error converting quote to invoice:', error);
        toast.error('Error al convertir la cotización en factura');
      }
    })();
  };

  const handleDuplicateQuote = (quoteId: string) => {
    alert(`Duplicando cotización: ${quoteId}`);
  };

  const handleFollowUp = (quoteId: string) => {
    alert(`Programando seguimiento para cotización: ${quoteId}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Cotizaciones de Ventas</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones de Ventas</h1>
            <p className="text-gray-600">Gestión de propuestas comerciales y seguimiento de oportunidades</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportToPdf}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap flex items-center"
            >
              <i className="ri-file-pdf-line mr-2"></i>
              Exportar PDF
            </button>
            <button
              onClick={handleCreateQuote}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Cotización
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cotizaciones</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{quotes.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-file-list-line text-xl text-blue-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Valor Total: RD$ {totalQuoteValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {quotes.filter(q => q.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Valor: RD$ {approvedQuoteValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {quotes.filter(q => q.status === 'pending' || q.status === 'under_review').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100">
                <i className="ri-time-line text-xl text-yellow-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Valor: RD$ {pendingQuoteValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasa de Conversión</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {((quotes.filter(q => q.status === 'approved').length / quotes.length) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                <i className="ri-line-chart-line text-xl text-purple-600"></i>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Promedio del mes</p>
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
                  placeholder="Buscar por cliente, proyecto o ID..."
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
                <option value="pending">Pendientes</option>
                <option value="under_review">En Revisión</option>
                <option value="approved">Aprobadas</option>
                <option value="rejected">Rechazadas</option>
                <option value="expired">Expiradas</option>
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

        {/* Quotes Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Cotizaciones ({filteredQuotes.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Válida Hasta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Probabilidad
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
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{quote.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{quote.customer}</div>
                      <div className="text-sm text-gray-500">{quote.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{quote.project}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(quote.date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(quote.validUntil).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD$ {quote.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getProbabilityColor(quote.probability)}`}>
                        {quote.probability}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
                        {getStatusText(quote.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewQuote(quote.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver cotización"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button
                          onClick={() => handleEditQuote(quote.id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Editar cotización"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handlePrintQuote(quote.id)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Imprimir cotización"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        <button
                          onClick={() => handleSendQuote(quote.id, quote.customerEmail)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Enviar por email"
                        >
                          <i className="ri-mail-line"></i>
                        </button>
                        {quote.status === 'approved' && (
                          <button
                            onClick={() => handleConvertToInvoice(quote.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Convertir a factura"
                          >
                            <i className="ri-file-transfer-line"></i>
                          </button>
                        )}
                        <button
                          onClick={() => handleFollowUp(quote.id)}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Programar seguimiento"
                        >
                          <i className="ri-calendar-check-line"></i>
                        </button>
                        <button
                          onClick={() => handleDuplicateQuote(quote.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Duplicar cotización"
                        >
                          <i className="ri-file-copy-line"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Eliminar cotización"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Quote Modal */}
        {showNewQuoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Nueva Cotización de Ventas</h3>
                  <button
                    onClick={() => setShowNewQuoteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Form state for new quote */}
                <NewQuoteForm
                  customers={customers}
                  paymentTerms={paymentTerms}
                  onCancel={() => setShowNewQuoteModal(false)}
                  onSaved={async () => {
                    setShowNewQuoteModal(false);
                    // reload
                    if (user?.id) {
                      setLoading(true);
                      const qts = await quotesService.getAll(user.id);
                      const mapped = (qts || []).map((q: any) => ({
                        id: q.id,
                        customer: q.customer_name || q.customers?.name || 'Cliente',
                        customerEmail: q.customer_email || q.customers?.email || '',
                        project: q.project || '',
                        amount: q.amount || 0,
                        tax: q.tax || 0,
                        total: q.total || 0,
                        status: (q.status || 'pending') as StatusType,
                        date: q.date || q.created_at || new Date().toISOString(),
                        validUntil: q.valid_until || q.validUntil || new Date().toISOString(),
                        probability: q.probability || 0,
                        items: (q.quote_lines || []).map((it: any) => ({
                          description: it.description || '',
                          quantity: it.quantity || 1,
                          price: it.price || 0,
                          total: it.total || 0,
                        }))
                      }));
                      setQuotes(mapped);
                      setLoading(false);
                    }
                  }}
                  userId={user?.id}
                />
              </div>
              {/* Actions are handled inside NewQuoteForm */}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}