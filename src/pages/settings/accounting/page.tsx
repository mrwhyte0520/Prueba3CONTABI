import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { auxiliariesReconciliationService, settingsService, chartAccountsService } from '../../../services/database';
import { useAuth } from '../../../hooks/useAuth';

interface AccountingSettings {
  id?: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
  default_currency: string;
  decimal_places: number;
  date_format: string;
  number_format: string;
  auto_backup: boolean;
  backup_frequency: string;
  retention_period: number;
  ar_account_id?: string | null;
  sales_account_id?: string | null;
  sales_tax_account_id?: string | null;
  ap_account_id?: string | null;
  ap_bank_account_id?: string | null;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

export default function AccountingSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AccountingSettings>({
    fiscal_year_start: '2024-01-01',
    fiscal_year_end: '2024-12-31',
    default_currency: 'DOP',
    decimal_places: 2,
    date_format: 'DD/MM/YYYY',
    number_format: '1,234.56',
    auto_backup: true,
    backup_frequency: 'daily',
    retention_period: 30,
    ar_account_id: null,
    sales_account_id: null,
    sales_tax_account_id: null,
    ap_account_id: null,
    ap_bank_account_id: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reconcilingAuxiliaries, setReconcilingAuxiliaries] = useState(false);
  const [recalculatingBalances, setRecalculatingBalances] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!user) return;
      setLoadingAccounts(true);
      try {
        const data = await chartAccountsService.getAll(user.id);
        const options: AccountOption[] = (data || [])
          .map((acc: any) => ({
            id: acc.id,
            code: acc.code,
            name: acc.name,
          }));
        setAccounts(options);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading chart of accounts:', error);
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, [user]);

  const loadSettings = async () => {
    try {
      if (!user) return;
      const data = await settingsService.getAccountingSettings(user.id);
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage(null);

    try {
      await settingsService.saveAccountingSettings(settings, user.id);
      setMessage({ type: 'success', text: 'Configuración contable guardada exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AccountingSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const COA_KEY = 'contabi_chart_of_accounts';

  const baseChartOfAccounts = [
    { code: '1', name: 'Activos', type: 'group' },
    { code: '1-01', name: 'Activo Corriente', type: 'group' },
    { code: '1-01-001', name: 'Caja', type: 'account' },
    { code: '1-01-002', name: 'Bancos', type: 'account' },
    { code: '2', name: 'Pasivos', type: 'group' },
    { code: '3', name: 'Patrimonio', type: 'group' },
    { code: '4', name: 'Ingresos', type: 'group' },
    { code: '5', name: 'Gastos', type: 'group' },
  ];

  const triggerImport = () => fileInputRef.current?.click();

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [h, ...rows] = lines;
    const headers = h.split(',').map((s) => s.trim().toLowerCase());
    const idxCode = headers.indexOf('code');
    const idxName = headers.indexOf('name');
    const idxType = headers.indexOf('type');
    if (idxCode === -1 || idxName === -1) return [] as any[];
    return rows
      .map((r) => {
        const cols = r.split(',');
        return {
          code: (cols[idxCode] || '').trim(),
          name: (cols[idxName] || '').trim(),
          type: (cols[idxType] || 'account').trim(),
        };
      })
      .filter((x) => x.code && x.name);
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let data: any[] = [];
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else {
        data = parseCsv(text);
      }
      if (!Array.isArray(data) || data.length === 0) throw new Error('Formato inválido o vacío');

      const normalized = data
        .map((x: any) => ({
          code: String(x.code || '').trim(),
          name: String(x.name || '').trim(),
          type: String(x.type || 'account').trim(),
        }))
        .filter((x: any) => x.code && x.name);

      localStorage.setItem(COA_KEY, JSON.stringify(normalized));
      setMessage({ type: 'success', text: `Plan contable importado (${normalized.length} cuentas)` });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo importar el plan. Verifica el archivo (CSV/JSON).' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const raw = localStorage.getItem(COA_KEY);
      const data = raw ? JSON.parse(raw) : baseChartOfAccounts;
      const toCsv = (rows: any[]) => {
        const header = 'code,name,type';
        const body = rows.map((r) => `${r.code},${r.name},${r.type || 'account'}`).join('\r\n');
        return `\uFEFF${header}\r\n${body}\r\n`;
      };
      const csv = toCsv(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chart_of_accounts.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Plan contable exportado (CSV)' });
    } catch {
      setMessage({ type: 'error', text: 'No se pudo exportar el plan.' });
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    localStorage.setItem(COA_KEY, JSON.stringify(baseChartOfAccounts));
    setMessage({ type: 'success', text: 'Plan contable restablecido al plan base.' });
  };

  const handleReconcileAuxiliaries = async () => {
    if (!user?.id) return;
    if (!confirm('¿Reconciliar auxiliares CxC/CxP? Esto creará asientos contables faltantes.')) return;
    setReconcilingAuxiliaries(true);
    setMessage(null);
    try {
      const { ar, ap } = await auxiliariesReconciliationService.reconcileAll(user.id);

      setMessage({
        type: 'success',
        text:
          `Reconciliación completada. ` +
          `CxC: facturas ${ar.createdInvoiceEntries}, pagos ${ar.createdPaymentEntries}, omitidos ${ar.skipped}. ` +
          `CxP: facturas ${ap.createdInvoiceEntries}, pagos ${ap.createdPaymentEntries}, omitidos ${ap.skipped}.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo reconciliar CxC/CxP. Revisa la consola.' });
      // eslint-disable-next-line no-console
      console.error('Error reconciliando auxiliares CxC/CxP:', error);
    } finally {
      setReconcilingAuxiliaries(false);
    }
  };

  const handleRecalculateBalances = async () => {
    if (!user?.id) return;
    if (!confirm('¿Recalcular saldos auxiliares de clientes y suplidores? Esto actualizará current_balance.')) return;
    setRecalculatingBalances(true);
    setMessage(null);
    try {
      const res = await auxiliariesReconciliationService.recalculateAllBalances(user.id);
      setMessage({
        type: 'success',
        text: `Saldos recalculados. Clientes actualizados: ${res.customersUpdated}, Suplidores actualizados: ${res.suppliersUpdated}.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudieron recalcular los saldos. Revisa la consola.' });
      // eslint-disable-next-line no-console
      console.error('Error recalculando saldos auxiliares:', error);
    } finally {
      setRecalculatingBalances(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuración Contable</h1>
              <p className="text-gray-600 mt-1">
                Configura períodos fiscales, monedas y políticas contables
              </p>
            </div>
            <button
              onClick={() => window.REACT_APP_NAVIGATE('/settings')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <i className="ri-arrow-left-line"></i>
              <span>Volver</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Acciones rápidas</h2>
              <p className="text-gray-600 text-sm mt-1">
                Repara asientos faltantes para que CxC/CxP coincidan con contabilidad.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleReconcileAuxiliaries}
                disabled={reconcilingAuxiliaries}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {reconcilingAuxiliaries ? 'Reconciliando...' : 'Reconciliar auxiliares CxC/CxP'}
              </button>
              <button
                type="button"
                onClick={handleRecalculateBalances}
                disabled={recalculatingBalances}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {recalculatingBalances ? 'Recalculando...' : 'Recalcular saldos auxiliares'}
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fiscal Year Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Período Fiscal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inicio del Año Fiscal *
                </label>
                <input
                  type="date"
                  required
                  value={settings.fiscal_year_start || ''}
                  onChange={(e) => handleInputChange('fiscal_year_start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fin del Año Fiscal *
                </label>
                <input
                  type="date"
                  required
                  value={settings.fiscal_year_end || ''}
                  onChange={(e) => handleInputChange('fiscal_year_end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Default Accounts Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuentas Contables por Defecto</h2>
            {loadingAccounts ? (
              <p className="text-gray-500 text-sm">Cargando plan de cuentas...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de Cuentas por Cobrar (Clientes)
                  </label>
                  <select
                    value={settings.ar_account_id || ''}
                    onChange={(e) => handleInputChange('ar_account_id', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de Ventas
                  </label>
                  <select
                    value={settings.sales_account_id || ''}
                    onChange={(e) => handleInputChange('sales_account_id', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de ITBIS por Pagar
                  </label>
                  <select
                    value={settings.sales_tax_account_id || ''}
                    onChange={(e) => handleInputChange('sales_tax_account_id', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de Cuentas por Pagar (Proveedores)
                  </label>
                  <select
                    value={settings.ap_account_id || ''}
                    onChange={(e) => handleInputChange('ap_account_id', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuenta de Banco por Defecto para Pagos a Proveedores
                  </label>
                  <select
                    value={settings.ap_bank_account_id || ''}
                    onChange={(e) => handleInputChange('ap_bank_account_id', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Currency and Format Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Moneda y Formatos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda Principal *
                </label>
                <select
                  value={settings.default_currency || 'DOP'}
                  onChange={(e) => handleInputChange('default_currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DOP">Peso Dominicano (DOP)</option>
                  <option value="USD">Dólar Americano (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decimales *
                </label>
                <select
                  value={settings.decimal_places ?? 2}
                  onChange={(e) => handleInputChange('decimal_places', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>0 decimales</option>
                  <option value={2}>2 decimales</option>
                  <option value={4}>4 decimales</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de Fecha
                </label>
                <select
                  value={settings.date_format || 'DD/MM/YYYY'}
                  onChange={(e) => handleInputChange('date_format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de Números
                </label>
                <select
                  value={settings.number_format || '1,234.56'}
                  onChange={(e) => handleInputChange('number_format', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1,234.56">1,234.56</option>
                  <option value="1.234,56">1.234,56</option>
                  <option value="1 234.56">1 234.56</option>
                </select>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Respaldos</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_backup"
                  checked={!!settings.auto_backup}
                  onChange={(e) => handleInputChange('auto_backup', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_backup" className="ml-2 block text-sm text-gray-900">
                  Habilitar respaldos automáticos
                </label>
              </div>
              
              {settings.auto_backup && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecuencia de Respaldo
                    </label>
                    <select
                      value={settings.backup_frequency || 'daily'}
                      onChange={(e) => handleInputChange('backup_frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Período de Retención (días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.retention_period ?? 30}
                      onChange={(e) => handleInputChange('retention_period', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart of Accounts Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Catálogo de Cuentas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={triggerImport}
                disabled={importing}
                className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <i className="ri-download-line"></i>
                <span>Importar Plan Contable</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <i className="ri-upload-line"></i>
                <span>Exportar Plan Contable</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center space-x-2 bg-orange-50 text-orange-700 px-4 py-3 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <i className="ri-refresh-line"></i>
                <span>Restablecer Plan Base</span>
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onImportFile}
              accept=".csv,.json"
              className="hidden"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.REACT_APP_NAVIGATE('/settings')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}