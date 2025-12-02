import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { financialReportsService } from '../../../services/database';
import * as XLSX from 'xlsx';

// Estilos CSS para impresión
const printStyles = `
  @media print {
    @page { size: landscape; margin: 0.5cm; }
    body * { visibility: hidden; }
    #printable-trial-balance, #printable-trial-balance * { visibility: visible; }
    #printable-trial-balance { position: absolute; left: 0; top: 0; width: 100%; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-title { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 10px; }
    .print-period { text-align: center; font-size: 12pt; margin-bottom: 20px; }
    table { page-break-inside: avoid; font-size: 9pt; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
`;

interface AccountingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  fiscal_year: string;
  status: string;
}

interface TrialBalanceRow {
  account_id: string;
  code: string;
  name: string;
  prevDebit: number;
  prevCredit: number;
  movDebit: number;
  movCredit: number;
  finalDebit: number;
  finalCredit: number;
  normalBalance: string;
  level?: number | null;
  allowPosting?: boolean | null;
}

const TrialBalancePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [cutoffDate, setCutoffDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [mode, setMode] = useState<'detail' | 'summary'>('detail');

  const [fromDateLabel, setFromDateLabel] = useState('');
  const [toDateLabel, setToDateLabel] = useState('');

  useEffect(() => {
    if (user) {
      void loadPeriods();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadTrialBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cutoffDate, selectedFiscalYear, selectedPeriodId, mode]);

  const loadPeriods = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setPeriods(data || []);
    } catch (err) {
      console.error('Error loading accounting periods for trial balance:', err);
      setPeriods([]);
    }
  };

  const fiscalYears = Array.from(new Set(periods.map((p) => p.fiscal_year))).sort(
    (a, b) => Number(b) - Number(a)
  );

  const visiblePeriods = periods.filter(
    (p) => !selectedFiscalYear || p.fiscal_year === selectedFiscalYear
  );

  const computeDateRanges = () => {
    const today = new Date().toISOString().slice(0, 10);
    const effectiveCutoff = cutoffDate || today;

    let fromDate = effectiveCutoff;
    let toDate = effectiveCutoff;

    const period = selectedPeriodId
      ? periods.find((p) => p.id === selectedPeriodId)
      : null;

    if (period) {
      const start = period.start_date.slice(0, 10);
      const end = period.end_date.slice(0, 10);
      fromDate = start;
      // Asegurar que la fecha de corte esté dentro del período usando comparación de strings YYYY-MM-DD
      toDate = effectiveCutoff < end ? effectiveCutoff : end;
    } else if (selectedFiscalYear) {
      fromDate = `${selectedFiscalYear}-01-01`;
      toDate = effectiveCutoff;
    } else {
      const year = effectiveCutoff.slice(0, 4);
      fromDate = `${year}-01-01`;
      toDate = effectiveCutoff;
    }

    // Rango anterior: desde muy atrás hasta el día antes de fromDate
    const fromDateObj = new Date(fromDate);
    const prevToObj = new Date(fromDateObj.getTime() - 24 * 60 * 60 * 1000);
    const prevToDate =
      prevToObj.getFullYear() <= 1900
        ? null
        : prevToObj.toISOString().slice(0, 10);

    setFromDateLabel(fromDate);
    setToDateLabel(toDate);

    return { fromDate, toDate, prevToDate };
  };

  const loadTrialBalance = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { fromDate, toDate, prevToDate } = computeDateRanges();

      // Obtener transacciones ED para excluirlas de los movimientos
      const { data: edEntries } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .like('entry_number', 'ED-%')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate);

      const edEntryIds = new Set((edEntries || []).map(e => e.id));

      const [prevTrial, periodTrial, periodMovements] = await Promise.all([
        prevToDate
          ? financialReportsService.getTrialBalance(
              user.id,
              '1900-01-01',
              prevToDate
            )
          : Promise.resolve([]),
        financialReportsService.getTrialBalance(user.id, fromDate, toDate),
        // Obtener movimientos del período excluyendo ED
        supabase
          .from('journal_entry_lines')
          .select(`
            account_id,
            debit_amount,
            credit_amount,
            journal_entries!inner(id, user_id, entry_number)
          `)
          .eq('journal_entries.user_id', user.id)
          .gte('journal_entries.entry_date', fromDate)
          .lte('journal_entries.entry_date', toDate)
          .then(({ data }) => data || [])
      ]);

      type InternalRow = TrialBalanceRow & {
        prevBalance: number;
        periodBalance: number;
      };

      const byAccount: Record<string, InternalRow> = {};

      const ensureRow = (acc: any): InternalRow => {
        const accountId = acc.account_id as string;
        if (!byAccount[accountId]) {
          byAccount[accountId] = {
            account_id: accountId,
            code: acc.code || '',
            name: acc.name || '',
            prevDebit: 0,
            prevCredit: 0,
            movDebit: 0,
            movCredit: 0,
            finalDebit: 0,
            finalCredit: 0,
            normalBalance: acc.normal_balance || 'debit',
            level: acc.level ?? null,
            allowPosting: acc.allow_posting ?? null,
            prevBalance: 0,
            periodBalance: 0,
          };
        }
        return byAccount[accountId];
      };

      (prevTrial || []).forEach((acc: any) => {
        const row = ensureRow(acc);
        const normal = acc.normal_balance || row.normalBalance || 'debit';
        row.normalBalance = normal;

        const balancePrev = Number(acc.balance) || 0;
        row.prevBalance += balancePrev;

        let debitPrev = 0;
        let creditPrev = 0;
        if (balancePrev >= 0) {
          if (normal === 'credit') {
            creditPrev = balancePrev;
          } else {
            debitPrev = balancePrev;
          }
        } else {
          const abs = Math.abs(balancePrev);
          if (normal === 'credit') {
            debitPrev = abs;
          } else {
            creditPrev = abs;
          }
        }

        row.prevDebit += debitPrev;
        row.prevCredit += creditPrev;
      });

      // Procesar movimientos del período excluyendo transacciones ED
      const movByAccount: Record<string, { debit: number; credit: number }> = {};
      
      periodMovements.forEach((line: any) => {
        const entryId = line.journal_entries?.id;
        // Excluir transacciones ED
        if (edEntryIds.has(entryId)) return;
        
        const accountId = line.account_id;
        if (!movByAccount[accountId]) {
          movByAccount[accountId] = { debit: 0, credit: 0 };
        }
        movByAccount[accountId].debit += Number(line.debit_amount) || 0;
        movByAccount[accountId].credit += Number(line.credit_amount) || 0;
      });

      // Aplicar los movimientos (sin ED) a las filas
      (periodTrial || []).forEach((acc: any) => {
        const row = ensureRow(acc);
        const normal = acc.normal_balance || row.normalBalance || 'debit';
        row.normalBalance = normal;

        // Usar solo los movimientos sin ED
        const accountId = acc.account_id;
        const movements = movByAccount[accountId] || { debit: 0, credit: 0 };
        row.movDebit = movements.debit;
        row.movCredit = movements.credit;

        const balancePeriod = Number(acc.balance) || 0;
        row.periodBalance = balancePeriod;
      });

      let result: InternalRow[] = Object.values(byAccount);

      if (mode === 'summary') {
        result = result.filter((row) =>
          row.allowPosting === false ||
          (typeof row.level === 'number' && row.level <= 2)
        );
      }

      result.forEach((row) => {
        const prevBalance = row.prevBalance || 0;
        const periodBalance = row.periodBalance || 0;
        const finalBalance = prevBalance + periodBalance;
        const normal = row.normalBalance || 'debit';

        let finalDebit = 0;
        let finalCredit = 0;
        if (finalBalance >= 0) {
          if (normal === 'credit') {
            finalCredit = finalBalance;
          } else {
            finalDebit = finalBalance;
          }
        } else {
          const abs = Math.abs(finalBalance);
          if (normal === 'credit') {
            finalDebit = abs;
          } else {
            finalCredit = abs;
          }
        }

        row.finalDebit = finalDebit;
        row.finalCredit = finalCredit;
      });

      const sorted = result.sort((a, b) => a.code.localeCompare(b.code, 'es'));
      setRows(sorted);
    } catch (err) {
      console.error('Error loading trial balance:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: number) => {
    if (!value) return '-';
    return `RD$${value.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  const totalPrevDebit = rows.reduce((sum, r) => sum + r.prevDebit, 0);
  const totalPrevCredit = rows.reduce((sum, r) => sum + r.prevCredit, 0);
  const totalMovDebit = rows.reduce((sum, r) => sum + r.movDebit, 0);
  const totalMovCredit = rows.reduce((sum, r) => sum + r.movCredit, 0);
  const totalFinalDebit = rows.reduce((sum, r) => sum + r.finalDebit, 0);
  const totalFinalCredit = rows.reduce((sum, r) => sum + r.finalCredit, 0);

  const handleExportExcel = () => {
    try {
      if (!user) {
        alert('Debes iniciar sesión para exportar la balanza.');
        return;
      }

      if (rows.length === 0) {
        alert('No hay datos para exportar con los filtros actuales.');
        return;
      }

      const excelRows = rows.map((row) => ({
        'Número': row.code,
        'Cuenta Contable': row.name,
        'Saldo Ant. Débito': row.prevDebit || 0,
        'Saldo Ant. Crédito': row.prevCredit || 0,
        'Mov. Débito': row.movDebit || 0,
        'Mov. Crédito': row.movCredit || 0,
        'Saldo Final Débito': row.finalDebit || 0,
        'Saldo Final Crédito': row.finalCredit || 0,
      }));

      excelRows.push({
        'Número': '',
        'Cuenta Contable': 'TOTALES',
        'Saldo Ant. Débito': totalPrevDebit,
        'Saldo Ant. Crédito': totalPrevCredit,
        'Mov. Débito': totalMovDebit,
        'Mov. Crédito': totalMovCredit,
        'Saldo Final Débito': totalFinalDebit,
        'Saldo Final Crédito': totalFinalCredit,
      });

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows);

      // Ajustar anchos de columnas
      ws['!cols'] = [
        { wch: 15 }, // Número
        { wch: 40 }, // Cuenta
        { wch: 18 }, // Saldo Ant. Débito
        { wch: 18 }, // Saldo Ant. Crédito
        { wch: 18 }, // Mov. Débito
        { wch: 18 }, // Mov. Crédito
        { wch: 18 }, // Saldo Final Débito
        { wch: 18 }  // Saldo Final Crédito
      ];

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Balanza de Comprobación');

      // Generar archivo
      const baseDate = cutoffDate || new Date().toISOString().slice(0, 10);
      const fileName = `balanza_comprobacion_${baseDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error al exportar la Balanza de Comprobación:', error);
      alert('Error al generar el archivo Excel de la Balanza de Comprobación.');
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Estilos de impresión */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/accounting')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-arrow-left-line"></i>
            Volver a Contabilidad
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Balanza de Comprobación</h1>
            <p className="text-gray-600">
              Saldos por cuenta contable con saldo anterior, movimientos del período y saldo final
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <i className="ri-file-excel-2-line"></i>
            Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <i className="ri-file-pdf-line"></i>
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 print:hidden">
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de corte
              </label>
              <input
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año fiscal
              </label>
              <select
                value={selectedFiscalYear}
                onChange={(e) => {
                  setSelectedFiscalYear(e.target.value);
                  setSelectedPeriodId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="">Todos</option>
                {fiscalYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período contable
              </label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="">Todos</option>
                {visiblePeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({new Date(period.start_date).toLocaleDateString('es-DO')} -{' '}
                    {new Date(period.end_date).toLocaleDateString('es-DO')})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modo de balanza
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'detail' | 'summary')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
              >
                <option value="detail">Con detalle (todas las cuentas)</option>
                <option value="summary">Resumida (solo cuentas de grupo)</option>
              </select>
            </div>
          </div>

          {fromDateLabel && toDateLabel && (
            <div className="text-sm text-gray-600">
              Período del reporte:{' '}
              <span className="font-medium text-gray-800">
                {new Date(fromDateLabel).toLocaleDateString('es-DO')} al{' '}
                {new Date(toDateLabel).toLocaleDateString('es-DO')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div id="printable-trial-balance">
        {/* Título para impresión */}
        <div className="hidden print:block print-title">BALANZA DE COMPROBACIÓN</div>
        <div className="hidden print:block print-period">
          Período: {fromDateLabel && new Date(fromDateLabel).toLocaleDateString('es-DO')} al {toDateLabel && new Date(toDateLabel).toLocaleDateString('es-DO')}
        </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Número de cuenta
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre de la cuenta
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo anterior Débito
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo anterior Crédito
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Movimientos Débito
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Movimientos Crédito
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo final Débito
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo final Crédito
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <i className="ri-file-list-line text-4xl text-gray-300 mb-2"></i>
                    <p>No hay datos para la combinación de filtros seleccionada.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.account_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatAmount(row.prevDebit)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatAmount(row.prevCredit)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatAmount(row.movDebit)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatAmount(row.movCredit)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatAmount(row.finalDebit)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatAmount(row.finalCredit)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900" colSpan={2}>
                  Totales:
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {formatAmount(totalPrevDebit)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {formatAmount(totalPrevCredit)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {formatAmount(totalMovDebit)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {formatAmount(totalMovCredit)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {formatAmount(totalFinalDebit)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {formatAmount(totalFinalCredit)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </div> {/* Cierre de printable-trial-balance */}
    </div>
  );
};

export default TrialBalancePage;
