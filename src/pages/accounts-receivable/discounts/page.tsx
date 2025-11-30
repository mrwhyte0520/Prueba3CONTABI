import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { customersService, invoicesService, journalEntriesService, chartAccountsService } from '../../../services/database';

interface ArDiscount {
  id: string;
  entryNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  concept: string;
}

export default function DiscountsPage() {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<ArDiscount[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [invoices, setInvoices] = useState<Array<{ id: string; invoiceNumber: string; customerId: string }>>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [noteCustomerId, setNoteCustomerId] = useState<string>('');

  const incomeAccounts = accounts.filter((acc) => acc.allowPosting && acc.type === 'income');

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [custList, invList, accList, entries] = await Promise.all([
        customersService.getAll(user.id),
        invoicesService.getAll(user.id),
        chartAccountsService.getAll(user.id),
        journalEntriesService.getAll(user.id),
      ]);

      const customersArray = (custList || []).map((c: any) => ({ id: String(c.id), name: String(c.name) }));
      setCustomers(customersArray);

      const invoicesArray = (invList as any[]).map((inv) => ({
        id: String(inv.id),
        invoiceNumber: inv.invoice_number as string,
        customerId: String(inv.customer_id),
      }));
      setInvoices(invoicesArray);

      setAccounts(accList || []);

      const customersMap: Record<string, string> = {};
      customersArray.forEach((c: { id: string; name: string }) => {
        customersMap[c.id] = c.name;
      });

      const invoicesMap: Record<string, string> = {};
      invoicesArray.forEach((inv) => {
        invoicesMap[inv.id] = inv.invoiceNumber;
      });

      const discEntries = (entries as any[] || []).filter((e) => {
        const num = String(e.entry_number || '');
        return num.startsWith('DSC-');
      });

      const mapped: ArDiscount[] = discEntries.map((e: any) => {
        const ref = String(e.reference || '');
        let customerId: string | undefined;
        let invoiceId: string | undefined;
        let concept = '';

        if (ref.startsWith('DSC|')) {
          const parts = ref.split('|');
          customerId = parts[1] || undefined;
          invoiceId = parts[2] || undefined;
          concept = parts.slice(3).join('|') || (e.description as string) || '';
        } else {
          concept = (e.description as string) || '';
        }

        const customerName = customerId ? (customersMap[customerId] || '') : '';
        const invoiceNumber = invoiceId ? invoicesMap[invoiceId] : undefined;

        const amount = Number(e.total_debit) || Number(e.total_credit) || 0;

        return {
          id: String(e.id),
          entryNumber: String(e.entry_number),
          date: String(e.entry_date),
          customerId,
          customerName,
          invoiceId,
          invoiceNumber,
          amount,
          concept,
        };
      });

      setDiscounts(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filteredDiscounts = discounts.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.customerName.toLowerCase().includes(term) ||
      (d.invoiceNumber || '').toLowerCase().includes(term) ||
      d.entryNumber.toLowerCase().includes(term) ||
      d.concept.toLowerCase().includes(term)
    );
  });

  const handleSaveDiscount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Debes iniciar sesión para registrar descuentos');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const customerId = String(formData.get('customer_id') || '');
    const date = String(formData.get('date') || '');
    const amount = Number(formData.get('amount') || 0);
    const invoiceId = String(formData.get('invoice_id') || '');
    const originAccountId = String(formData.get('origin_account_id') || '');
    const discountsAccountId = String(formData.get('discounts_account_id') || '');
    const concept = String(formData.get('concept') || '');

    if (!amount || amount <= 0) {
      alert('El monto debe ser mayor que 0');
      return;
    }

    if (!originAccountId || !discountsAccountId) {
      alert('Debes seleccionar la cuenta de ingresos original y la cuenta "Descuentos en ventas"');
      return;
    }

    const entryDate = date || new Date().toISOString().slice(0, 10);
    const entryNumber = `DSC-${Date.now()}`;

    const customerName = customerId
      ? customers.find((c) => c.id === customerId)?.name || ''
      : '';
    const invoiceNumber = invoiceId
      ? invoices.find((inv) => inv.id === invoiceId)?.invoiceNumber || ''
      : '';

    const descriptionParts = ['Descuento en ventas'];
    if (customerName) descriptionParts.push(`Cliente: ${customerName}`);
    if (invoiceNumber) descriptionParts.push(`Factura: ${invoiceNumber}`);

    const description = descriptionParts.join(' - ');
    const reference = `DSC|${customerId}|${invoiceId}|${concept}`;

    const lines = [
      {
        account_id: originAccountId,
        description: 'Reverso de ingresos por descuento',
        debit_amount: amount,
        credit_amount: 0,
        line_number: 1,
      },
      {
        account_id: discountsAccountId,
        description: 'Descuentos en ventas',
        debit_amount: 0,
        credit_amount: amount,
        line_number: 2,
      },
    ];

    try {
      await journalEntriesService.createWithLines(user.id, {
        entry_number: entryNumber,
        entry_date: entryDate,
        description,
        reference,
        status: 'posted',
      }, lines);

      await loadData();
      alert('Descuento registrado exitosamente');
      setShowModal(false);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[Discounts] Error al registrar descuento', error);
      alert(error?.message || 'Error al registrar el descuento.');
    }
  };

  const totalAmount = filteredDiscounts.reduce((sum, d) => sum + d.amount, 0);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Descuentos en Ventas (CxC)</h1>
            <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
              <Link to="/accounts-receivable" className="hover:text-blue-600">Cuentas por Cobrar</Link>
              <span>/</span>
              <span>Descuentos</span>
            </nav>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Descuento
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Descuentos</p>
                <p className="text-2xl font-bold text-blue-600">
                  RD${totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-percent-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-600">Cantidad de Descuentos</p>
            <p className="text-2xl font-bold text-gray-900">{filteredDiscounts.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-600">Clientes impactados</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Set(filteredDiscounts.map((d) => d.customerName).filter(Boolean)).size}
            </p>
          </div>
        </div>

        {/* Filters */}
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
                placeholder="Buscar por cliente, número de documento, factura o concepto..."
              />
            </div>
          </div>
        </div>

        {/* Discounts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading && (
            <div className="px-6 pt-3 text-sm text-gray-500">Cargando datos...</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
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
                    Concepto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDiscounts.map((disc) => (
                  <tr key={disc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {disc.entryNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disc.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disc.customerName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disc.invoiceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      RD${disc.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {disc.concept}
                    </td>
                  </tr>
                ))}
                {filteredDiscounts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No hay descuentos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Discount Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nuevo Descuento en Ventas</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>

              <form onSubmit={handleSaveDiscount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente
                    </label>
                    <select
                      name="customer_id"
                      value={noteCustomerId}
                      onChange={(e) => setNoteCustomerId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">(Opcional) Seleccionar cliente</option>
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
                      type="date"
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
                      name="amount"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Factura Relacionada (Opcional)
                    </label>
                    <select
                      name="invoice_id"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Seleccionar factura</option>
                      {invoices
                        .filter((inv) => !noteCustomerId || inv.customerId === noteCustomerId)
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de ingresos original
                  </label>
                  <select
                    name="origin_account_id"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    defaultValue=""
                  >
                    <option value="">Seleccionar cuenta de ingresos original</option>
                    {incomeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta "Descuentos en ventas"
                  </label>
                  <select
                    name="discounts_account_id"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    defaultValue=""
                  >
                    <option value="">Seleccionar cuenta de ingresos para descuentos</option>
                    {incomeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concepto
                  </label>
                  <textarea
                    name="concept"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción detallada del descuento..."
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Registrar Descuento
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
