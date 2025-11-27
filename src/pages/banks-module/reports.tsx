import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import {
  bankDepositsService,
  bankChecksService,
  bankTransfersService,
  bankCreditsService,
  bankChargesService,
} from '../../services/database';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

type MovementType = 'deposit' | 'check' | 'transfer' | 'credit' | 'charge';

type BankMovement = {
  id: string;
  date: string;
  type: MovementType;
  bank_id?: string | null;
  bank_account_code?: string | null;
  currency: string;
  amount: number;
  reference?: string | null;
  description?: string | null;
};

type Filters = {
  fromDate: string;
  toDate: string;
  types: MovementType[];
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultFilters: Filters = {
  fromDate: '',
  toDate: '',
  types: ['deposit', 'check', 'transfer', 'credit', 'charge'],
};

export default function BankReportsPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [deposits, checks, transfers, credits, charges] = await Promise.all([
          bankDepositsService.getAll(user.id),
          bankChecksService.getAll(user.id),
          bankTransfersService.getAll(user.id),
          bankCreditsService.getAll(user.id),
          bankChargesService.getAll(user.id),
        ]);

        const normalized: BankMovement[] = [];

        // Depósitos
        (deposits as any[]).forEach((d) => {
          normalized.push({
            id: d.id,
            date: d.deposit_date,
            type: 'deposit',
            bank_id: d.bank_id ?? null,
            bank_account_code: d.bank_account_code ?? null,
            currency: d.currency,
            amount: Number(d.amount) || 0,
            reference: d.reference ?? null,
            description: d.description ?? null,
          });
        });

        // Cheques
        (checks as any[]).forEach((c) => {
          normalized.push({
            id: c.id,
            date: c.check_date,
            type: 'check',
            bank_id: c.bank_id ?? null,
            bank_account_code: c.bank_account_code ?? null,
            currency: c.currency,
            amount: Number(c.amount) || 0,
            reference: c.check_number ?? null,
            description: c.description ?? null,
          });
        });

        // Transferencias
        (transfers as any[]).forEach((t) => {
          normalized.push({
            id: t.id,
            date: t.transfer_date,
            type: 'transfer',
            bank_id: t.from_bank_id ?? null,
            bank_account_code: t.from_bank_account_code ?? null,
            currency: t.currency,
            amount: Number(t.amount) || 0,
            reference: t.reference ?? null,
            description: t.description ?? null,
          });
        });

        // Créditos bancarios
        (credits as any[]).forEach((cr) => {
          normalized.push({
            id: cr.id,
            date: cr.start_date,
            type: 'credit',
            bank_id: cr.bank_id ?? null,
            bank_account_code: cr.bank_account_code ?? null,
            currency: cr.currency,
            amount: Number(cr.amount) || 0,
            reference: cr.credit_number ?? null,
            description: cr.description ?? null,
          });
        });

        // Cargos bancarios
        (charges as any[]).forEach((ch) => {
          normalized.push({
            id: ch.id,
            date: ch.charge_date,
            type: 'charge',
            bank_id: ch.bank_id ?? null,
            bank_account_code: ch.bank_account_code ?? null,
            currency: ch.currency,
            amount: Number(ch.amount) || 0,
            reference: ch.ncf ?? null,
            description: ch.description ?? null,
          });
        });

        // Ordenar por fecha descendente
        normalized.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

        setMovements(normalized);
      } catch (e: any) {
        setError(e?.message || 'Error cargando el reporte bancario');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const handleDateChange = (field: 'fromDate' | 'toDate', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTypeToggle = (type: MovementType) => {
    setFilters((prev) => {
      const exists = prev.types.includes(type);
      const nextTypes = exists
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type];
      return {
        ...prev,
        types: nextTypes,
      };
    });
  };

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (!filters.types.includes(m.type)) return false;

      if (filters.fromDate && m.date < filters.fromDate) return false;
      if (filters.toDate && m.date > filters.toDate) return false;

      return true;
    });
  }, [movements, filters]);

  const formatTypeLabel = (type: MovementType) => {
    switch (type) {
      case 'deposit':
        return 'Depósito';
      case 'check':
        return 'Cheque';
      case 'transfer':
        return 'Transferencia';
      case 'credit':
        return 'Crédito bancario';
      case 'charge':
        return 'Cargo bancario';
      default:
        return type;
    }
  };

  const exportToPDF = () => {
    if (filteredMovements.length === 0) {
      alert('No hay movimientos para exportar. Ajusta los filtros primero.');
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Reporte Bancario', 20, 20);

    doc.setFontSize(10);
    const fromLabel = filters.fromDate || 'Sin límite';
    const toLabel = filters.toDate || 'Sin límite';
    doc.text(`Período: ${fromLabel} al ${toLabel}`, 20, 30);

    const rows = filteredMovements.map((m) => [
      m.date ? new Date(m.date).toLocaleDateString('es-DO') : '',
      formatTypeLabel(m.type),
      m.bank_account_code || m.bank_id || '-',
      m.currency,
      m.amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      m.reference || '',
      m.description || '',
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['Fecha', 'Tipo', 'Cuenta/Banco', 'Moneda', 'Monto', 'Referencia', 'Descripción']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 10);
      doc.text('Sistema Contabi - Reporte Bancario', 20, pageHeight - 10);
    }

    doc.save(`reporte-bancario-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    if (filteredMovements.length === 0) {
      alert('No hay movimientos para exportar. Ajusta los filtros primero.');
      return;
    }

    const fromLabel = filters.fromDate || 'Sin límite';
    const toLabel = filters.toDate || 'Sin límite';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Movimientos Bancarios');

    // Encabezado
    sheet.addRow(['Reporte Bancario']);
    sheet.addRow([`Fecha de generación: ${new Date().toLocaleDateString()}`]);
    sheet.addRow([`Período: ${fromLabel} al ${toLabel}`]);
    sheet.addRow([]);

    // Encabezados de tabla
    const headerRow = sheet.addRow([
      'Fecha',
      'Tipo',
      'Cuenta/Banco',
      'Moneda',
      'Monto',
      'Referencia',
      'Descripción',
    ]);
    headerRow.font = { bold: true };

    // Filas de datos
    filteredMovements.forEach((m) => {
      sheet.addRow([
        m.date ? new Date(m.date).toISOString().slice(0, 10) : '',
        formatTypeLabel(m.type),
        m.bank_account_code || m.bank_id || '-',
        m.currency,
        Number(m.amount) || 0,
        m.reference || '',
        m.description || '',
      ]);
    });

    // Ajustar ancho de columnas según contenido
    (sheet.columns || []).forEach((column) => {
      if (!column) return;
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value as any;
        const text = v == null ? '' : typeof v === 'string' ? v : v.toString();
        if (text.length > maxLength) {
          maxLength = text.length;
        }
      });
      column.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `reporte-bancario-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reporte Bancario</h1>
          <p className="text-gray-600 text-sm">
            Consulte los movimientos bancarios por tipo de transacción y rango de fechas.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold">Filtros</h2>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Desde</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleDateChange('fromDate', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Hasta</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleDateChange('toDate', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Resumen</label>
              <div className="mt-1 text-xs text-gray-600">
                {loading
                  ? 'Cargando movimientos...'
                  : `${filteredMovements.length} movimiento(s) mostrados`}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Tipos de transacción</div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'deposit',
                  'check',
                  'transfer',
                  'credit',
                  'charge',
                ] as MovementType[]
              ).map((type) => {
                const active = filters.types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeToggle(type)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {formatTypeLabel(type)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Movimientos bancarios</h2>
              {loading && (
                <span className="text-xs text-gray-500">Cargando...</span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={exportToPDF}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 flex items-center gap-1"
              >
                <i className="ri-file-pdf-line"></i>
                <span>Exportar PDF</span>
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 flex items-center gap-1"
              >
                <i className="ri-file-excel-line"></i>
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {filteredMovements.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay movimientos que coincidan con los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Fecha</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Cuenta/Banco</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Moneda</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-700">Monto</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Referencia</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMovements.map((m) => (
                    <tr key={`${m.type}-${m.id}`}>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {m.date ? new Date(m.date).toLocaleDateString() : ''}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {formatTypeLabel(m.type)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {m.bank_account_code || m.bank_id || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{m.currency}</td>
                      <td className="px-3 py-2 text-right">
                        {m.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {m.reference || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate">
                        {m.description || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
