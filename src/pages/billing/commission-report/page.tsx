import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { invoicesService, salesRepsService, storesService } from '../../../services/database';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface CommissionRow {
  salesRepId: string;
  salesRepName: string;
  storeNames: string[];
  invoiceCount: number;
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
}

export default function CommissionReportPage() {
  const { user } = useAuth();

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string; commission_rate?: number | null }>>([]);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>('all');
  const [selectedStoreName, setSelectedStoreName] = useState<string>('all');

  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const loadFilters = async () => {
      try {
        const [reps, sts] = await Promise.all([
          salesRepsService.getAll(user.id),
          storesService.getAll(user.id),
        ]);
        setSalesReps((reps || []) as any[]);
        setStores((sts || []).map((s: any) => ({ id: String(s.id), name: String(s.name || '') })));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando vendedores/tiendas para reporte de comisión:', error);
      }
    };
    loadFilters();
  }, [user?.id]);

  const handleGenerate = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const invoices = await invoicesService.getAll(user.id);

      const filtered = (invoices || []).filter((inv: any) => {
        if (!inv.invoice_date) return false;
        const d = String(inv.invoice_date).slice(0, 10);
        if (d < fromDate || d > toDate) return false;

        const repId = (inv as any).sales_rep_id ? String((inv as any).sales_rep_id) : '';
        if (selectedSalesRepId !== 'all' && repId !== selectedSalesRepId) return false;

        const storeName = (inv as any).store_name ? String((inv as any).store_name) : '';
        if (selectedStoreName !== 'all' && storeName !== selectedStoreName) return false;

        return true;
      });

      const repMap = new Map<string, CommissionRow>();

      filtered.forEach((inv: any) => {
        const repId = (inv as any).sales_rep_id ? String((inv as any).sales_rep_id) : 'sin-vendedor';
        const repInfo = salesReps.find(r => String(r.id) === repId);
        const repName = repInfo?.name || 'Sin vendedor';
        const rate = typeof repInfo?.commission_rate === 'number' ? repInfo!.commission_rate! : 0;

        const storeName = (inv as any).store_name ? String((inv as any).store_name) : '';
        const total = Number(inv.total_amount) || 0;

        const current = repMap.get(repId) || {
          salesRepId: repId,
          salesRepName: repName,
          storeNames: [],
          invoiceCount: 0,
          totalSales: 0,
          commissionRate: rate,
          commissionAmount: 0,
        };

        if (storeName && !current.storeNames.includes(storeName)) {
          current.storeNames.push(storeName);
        }
        current.invoiceCount += 1;
        current.totalSales += total;
        current.commissionRate = rate;
        current.commissionAmount = current.totalSales * (rate / 100);

        repMap.set(repId, current);
      });

      const rowsArray = Array.from(repMap.values()).sort((a, b) => b.totalSales - a.totalSales);
      setRows(rowsArray);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generando reporte de comisión:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const totalSalesAll = rows.reduce((sum, r) => sum + r.totalSales, 0);
  const totalCommissionAll = rows.reduce((sum, r) => sum + r.commissionAmount, 0);

  const handleExportPdf = () => {
    if (!rows || rows.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');

    const title = 'Reporte de Comisión por Vendedor';
    doc.setFontSize(14);
    doc.text(title, 14, 18);

    const periodText = `Período: ${fromDate} a ${toDate}`;
    doc.setFontSize(10);
    doc.text(periodText, 14, 24);

    const headers = [
      ['Vendedor', 'Tiendas', '# Facturas', 'Ventas (RD$)', '% Comisión', 'Comisión (RD$)'],
    ];

    const body = rows.map((row) => [
      row.salesRepName,
      row.storeNames.length > 0 ? row.storeNames.join(', ') : 'Sin tienda',
      String(row.invoiceCount),
      row.totalSales.toLocaleString('es-DO', { maximumFractionDigits: 2 }),
      `${row.commissionRate.toLocaleString('es-DO', { maximumFractionDigits: 2 })}%`,
      row.commissionAmount.toLocaleString('es-DO', { maximumFractionDigits: 2 }),
    ]);

    // @ts-expect-error - autotable está inyectado por el import de 'jspdf-autotable'
    doc.autoTable({
      head: headers,
      body,
      startY: 30,
      styles: { fontSize: 8 },
    });

    const fileName = `reporte_comision_${fromDate}_a_${toDate}.pdf`;
    doc.save(fileName);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte de Comisión</h1>
            <p className="text-gray-600 text-sm max-w-2xl">
              Ventas por vendedor en el período y tiendas seleccionadas, para fines de cálculo de comisiones.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select
                value={selectedSalesRepId}
                onChange={(e) => setSelectedSalesRepId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
              >
                <option value="all">Todos los vendedores</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={String(rep.id)}>{rep.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tienda / Sucursal</label>
              <select
                value={selectedStoreName}
                onChange={(e) => setSelectedStoreName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
              >
                <option value="all">Todas las tiendas</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center space-x-2"
            >
              <i className="ri-file-chart-line" />
              <span>Generar Reporte</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={rows.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
            >
              <i className="ri-file-pdf-line" />
              <span>Exportar a PDF</span>
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Ventas totales</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">RD$ {totalSalesAll.toLocaleString('es-DO', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Comisión total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">RD$ {totalCommissionAll.toLocaleString('es-DO', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Vendedores con ventas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{rows.length}</p>
          </div>
        </div>

        {/* Tabla de resultados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Detalle por Vendedor</h2>
            {loading && <span className="text-xs text-gray-500">Cargando...</span>}
          </div>
          {rows.length === 0 && !loading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No hay ventas registradas para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Tiendas</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider"># Facturas</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Ventas (RD$)</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">% Comisión</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Comisión (RD$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rows.map((row) => (
                    <tr key={row.salesRepId} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-gray-900">{row.salesRepName}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-gray-900 text-xs">
                        {row.storeNames.length > 0 ? row.storeNames.join(', ') : 'Sin tienda'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-gray-900">{row.invoiceCount}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-gray-900">
                        RD$ {row.totalSales.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-gray-900">
                        {row.commissionRate.toLocaleString('es-DO', { maximumFractionDigits: 2 })}%
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-gray-900 font-semibold">
                        RD$ {row.commissionAmount.toLocaleString('es-DO', { maximumFractionDigits: 2 })}
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
