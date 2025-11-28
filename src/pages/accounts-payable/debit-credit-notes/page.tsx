import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { suppliersService, apInvoicesService, apInvoiceNotesService, chartAccountsService } from '../../../services/database';

export default function APDebitCreditNotesPage() {
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const [form, setForm] = useState({
    noteType: 'credit',
    noteDate: new Date().toISOString().slice(0, 10),
    currency: 'DOP',
    amount: '',
    accountId: '',
    reason: '',
  });

  const loadLookups = async () => {
    if (!user?.id) return;
    try {
      const [supRows, accRows] = await Promise.all([
        suppliersService.getAll(user.id),
        chartAccountsService.getAll(user.id),
      ]);

      setSuppliers(supRows || []);

      const postable = (accRows || []).filter((acc: any) => acc.allow_posting !== false && acc.type !== 'header');
      setAccounts(postable);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando catálogos para notas de proveedor', error);
      setSuppliers([]);
      setAccounts([]);
    }
  };

  const loadNotes = async () => {
    if (!user?.id) return;
    try {
      const data = await apInvoiceNotesService.getAll(user.id);
      setNotes(data || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando notas de proveedor', error);
      setNotes([]);
    }
  };

  const loadInvoicesForSupplier = async (supplierId: string) => {
    if (!user?.id || !supplierId) {
      setInvoices([]);
      return;
    }
    try {
      const rows = await apInvoicesService.getAll(user.id);
      const filtered = (rows || []).filter((inv: any) => {
        const sameSupplier = String(inv.supplier_id) === String(supplierId);
        const balance = Number(inv.balance_amount ?? inv.total_to_pay ?? 0);
        return sameSupplier && balance > 0;
      });
      setInvoices(filtered);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cargando facturas para notas de proveedor', error);
      setInvoices([]);
    }
  };

  useEffect(() => {
    loadLookups();
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setSelectedInvoiceId('');
    loadInvoicesForSupplier(supplierId);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert('Debes iniciar sesión para registrar notas de proveedor');
      return;
    }

    if (!selectedSupplierId) {
      alert('Debes seleccionar un suplidor');
      return;
    }

    if (!selectedInvoiceId) {
      alert('Debes seleccionar una factura pendiente de ese suplidor');
      return;
    }

    const amount = Number(form.amount || 0);
    if (amount <= 0) {
      alert('El monto de la nota debe ser mayor a 0');
      return;
    }

    if (!form.accountId) {
      alert('Debes seleccionar la cuenta contable a afectar');
      return;
    }

    try {
      await apInvoiceNotesService.create(user.id, {
        supplier_id: selectedSupplierId,
        ap_invoice_id: selectedInvoiceId,
        note_type: form.noteType,
        note_date: form.noteDate,
        currency: form.currency,
        amount,
        account_id: form.accountId,
        reason: form.reason,
      });

      alert('Nota registrada exitosamente');
      setForm({
        noteType: 'credit',
        noteDate: new Date().toISOString().slice(0, 10),
        currency: 'DOP',
        amount: '',
        accountId: '',
        reason: '',
      });
      loadInvoicesForSupplier(selectedSupplierId);
      loadNotes();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creando nota de proveedor', error);
      alert('No se pudo registrar la nota');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notas de Débito / Crédito de Proveedor</h1>
            <p className="text-gray-600 text-sm">
              Registra ajustes a facturas de suplidor seleccionando el suplidor y una factura pendiente.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Nueva Nota</h2>
          <form onSubmit={handleCreateNote} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suplidor *</label>
              <select
                value={selectedSupplierId}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Factura pendiente *</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione una factura...</option>
                {invoices.map((inv: any) => {
                  const balance = Number(inv.balance_amount ?? inv.total_to_pay ?? 0);
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number || inv.id} - {inv.invoice_date} - Saldo {inv.currency || 'DOP'} {balance.toLocaleString()}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de nota *</label>
              <select
                value={form.noteType}
                onChange={(e) => setForm(prev => ({ ...prev, noteType: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="credit">Nota de Crédito (disminuye saldo)</option>
                <option value="debit">Nota de Débito (aumenta saldo)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={form.noteDate}
                onChange={(e) => setForm(prev => ({ ...prev, noteDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta contable *</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm(prev => ({ ...prev, accountId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione cuenta...</option>
                {accounts
                  .filter((acc: any) => {
                    const rawType = (acc.type || acc.account_type || '').toString().toLowerCase();
                    if (!rawType) return false;
                    if (form.noteType === 'debit') {
                      return (
                        rawType.includes('expense') ||
                        rawType.includes('gasto') ||
                        rawType.includes('asset') ||
                        rawType.includes('activo')
                      );
                    }
                    return (
                      rawType.includes('expense') ||
                      rawType.includes('gasto') ||
                      rawType.includes('income') ||
                      rawType.includes('ingreso')
                    );
                  })
                  .map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Descripción</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Descuento por pronto pago, ajuste de precio, devolución parcial, etc."
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Guardar Nota
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Notas registradas</h2>
            <span className="text-xs text-gray-500">Total: {notes.length}</span>
          </div>
          {notes.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No hay notas de débito/crédito registradas aún.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Suplidor</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Factura</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Monto</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Motivo</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {notes.map((n: any) => {
                    const supplierName = (n.suppliers as any)?.name || 'Suplidor';
                    const inv = n.ap_invoices as any;
                    return (
                      <tr key={n.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">{n.note_date}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{n.note_type === 'debit' ? 'Débito' : 'Crédito'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{supplierName}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{inv?.invoice_number || inv?.id || ''}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">{n.currency} {Number(n.amount || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap max-w-xs truncate" title={n.reason || ''}>{n.reason || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{n.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
