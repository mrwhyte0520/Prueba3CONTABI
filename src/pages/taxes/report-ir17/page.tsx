import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { taxService, settingsService } from '../../../services/database';
import * as XLSX from 'xlsx';
import { exportToPdf } from '../../../utils/exportImportUtils';

export default function ReportIR17Page() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [reportPeriod, setReportPeriod] = useState('');
  const [withholdingData, setWithholdingData] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);

  useEffect(() => {
    // Establecer el mes actual como período por defecto
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    setSelectedPeriod(currentPeriod);
  }, []);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const info = await settingsService.getCompanyInfo();
        setCompanyInfo(info);
      } catch (error) {
        console.error('Error cargando información de la empresa para Reporte IR-17', error);
      }
    };

    loadCompany();
  }, []);

  const formatPeriodLabel = (period: string) => {
    if (!period) return '';
    const [yearStr, monthStr] = period.split('-');
    const monthIndex = Number(monthStr) - 1;
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre'
    ];

    const monthName = months[monthIndex] || '';
    return monthName ? `${monthName} de ${yearStr}` : period;
  };

  const generateReport = async () => {
    if (!selectedPeriod) return;
    
    setGenerating(true);
    try {
      const data = await taxService.generateReportIR17(selectedPeriod);
      setReportPeriod(selectedPeriod);
      setWithholdingData(data || []);
    } catch (error) {
      console.error('Error generating report IR-17:', error);
      alert('Error al generar el reporte IR-17');
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (withholdingData.length === 0) return;

    const excelData = withholdingData.map(item => ({
      'RNC Proveedor': item.supplier_rnc,
      'Nombre Proveedor': item.supplier_name,
      'Fecha Pago': item.payment_date,
      'Tipo Servicio': item.service_type,
      'Número Factura': item.invoice_number,
      'Monto Bruto': item.gross_amount,
      'Tasa Retención (%)': item.withholding_rate,
      'Monto Retenido': item.withheld_amount,
      'Monto Neto': item.net_amount
    }));

    const companyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';

    const companyRnc =
      (companyInfo as any)?.rnc ||
      (companyInfo as any)?.tax_id ||
      '';

    const headerRows: (string | number)[][] = [];

    headerRows.push([companyName]);
    if (companyRnc) {
      headerRows.push([`RNC: ${companyRnc}`]);
    }
    headerRows.push(['Reporte IR-17 - Retenciones ISR']);
    headerRows.push([`Período: ${reportPeriod || selectedPeriod}`]);
    headerRows.push([]);

    const wb = XLSX.utils.book_new();
    const tableStartRow = headerRows.length + 1;
    const ws = XLSX.utils.json_to_sheet(excelData as any, { origin: `A${tableStartRow}` } as any);

    // Insertar filas de encabezado al inicio
    XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });

    // Centrar y resaltar encabezado (empresa, nombre del reporte y período)
    const totalColumns = Object.keys(excelData[0] || {}).length || 1;
    const merges: any[] = (ws as any)['!merges'] || [];

    // Fusionar las primeras filas de encabezado sobre todas las columnas de datos
    for (let r = 0; r < headerRows.length - 1; r++) {
      merges.push({
        s: { r, c: 0 },
        e: { r, c: totalColumns - 1 },
      });
    }
    (ws as any)['!merges'] = merges;

    // Aplicar estilos: centrado y fuente más grande para el título del reporte
    for (let r = 0; r < headerRows.length - 1; r++) {
      const cellRef = `A${r + 1}`;
      const cell = (ws as any)[cellRef];
      if (!cell) continue;

      const existingStyle = (cell as any).s || {};
      const font: any = {
        ...(existingStyle.font || {}),
        bold: true,
      };

      if (typeof cell.v === 'string' && cell.v.includes('Reporte IR-17')) {
        font.sz = 16; // Título principal del reporte
      } else if (r === 0) {
        font.sz = 14; // Nombre de la empresa
      } else {
        font.sz = 12; // Otras líneas de encabezado (RNC, período)
      }

      (cell as any).s = {
        ...existingStyle,
        alignment: {
          ...(existingStyle.alignment || {}),
          horizontal: 'center',
          vertical: 'center',
        },
        font,
      };
    }

    // Ancho de columnas de la tabla de datos
    ws['!cols'] = [
      { wch: 15 }, // RNC
      { wch: 30 }, // Nombre proveedor
      { wch: 15 }, // Fecha pago
      { wch: 28 }, // Tipo servicio (más ancho para ver el texto completo)
      { wch: 22 }, // Número factura (más ancho para NCF largos)
      { wch: 15 }, // Monto bruto
      { wch: 18 }, // Tasa retención
      { wch: 15 }, // Monto retenido
      { wch: 15 }  // Monto neto
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Reporte IR-17');
    XLSX.writeFile(wb, `reporte_ir17_${selectedPeriod}.xlsx`, { cellStyles: true } as any);
  };

  const exportToCSV = () => {
    if (withholdingData.length === 0) return;

    const separator = ';';

    const headers = [
      'RNC Proveedor',
      'Nombre Proveedor',
      'Fecha Pago',
      'Monto Bruto',
      'Tasa Retención',
      'Monto Retenido',
      'Monto Neto',
      'Tipo Servicio',
      'Número Factura'
    ];

    const companyName =
      (companyInfo as any)?.name ||
      (companyInfo as any)?.company_name ||
      'ContaBi';

    const companyRnc =
      (companyInfo as any)?.rnc ||
      (companyInfo as any)?.tax_id ||
      '';

    const headerLines: string[] = [
      ['Empresa', companyName].join(separator),
    ];

    if (companyRnc) {
      headerLines.push(['RNC', companyRnc].join(separator));
    }

    headerLines.push(['Reporte', 'Reporte IR-17 - Retenciones ISR'].join(separator));
    headerLines.push(['Período', reportPeriod || selectedPeriod].join(separator));
    headerLines.push('');

    const csvContent = [
      ...headerLines,
      headers.join(separator),
      ...withholdingData.map(item => [
        item.supplier_rnc,
        `"${item.supplier_name}"`,
        item.payment_date,
        item.gross_amount,
        item.withholding_rate,
        item.withheld_amount,
        item.net_amount,
        `"${item.service_type}"`,
        item.invoice_number
      ].join(separator))
    ].join('\n');

    const csvForExcel = '\uFEFF' + csvContent.replace(/\n/g, '\r\n');
    const blob = new Blob([csvForExcel], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ir17_${selectedPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToTXT = () => {
    if (withholdingData.length === 0) return;

    const totals = getTotals();

    let txtContent = `REPORTE IR-17 - RETENCIONES ISR\n`;
    txtContent += `Período: ${reportPeriod || selectedPeriod}\n`;
    txtContent += `Fecha de generación: ${new Date().toLocaleDateString()}\n\n`;

    txtContent += `RESUMEN:\n`;
    txtContent += `Cantidad de retenciones: ${totals.count}\n`;
    txtContent += `Monto bruto total: RD$ ${totals.total_gross.toLocaleString('es-DO')}\n`;
    txtContent += `Monto retenido total: RD$ ${totals.total_withheld.toLocaleString('es-DO')}\n`;
    txtContent += `Monto neto total: RD$ ${totals.total_net.toLocaleString('es-DO')}\n\n`;

    txtContent += `DETALLE:\n`;
    txtContent += `${'='.repeat(120)}\n`;

    withholdingData.forEach((item, index) => {
      txtContent += `${index + 1}. RNC Proveedor: ${item.supplier_rnc || 'N/A'}\n`;
      txtContent += `   Nombre: ${item.supplier_name || ''}\n`;
      txtContent += `   Fecha Pago: ${new Date(item.payment_date).toLocaleDateString('es-DO')}\n`;
      txtContent += `   Tipo Servicio: ${item.service_type || ''}\n`;
      txtContent += `   Número Factura: ${item.invoice_number || ''}\n`;
      txtContent += `   Monto Bruto: RD$ ${item.gross_amount.toLocaleString('es-DO')}\n`;
      txtContent += `   Tasa Retención: ${item.withholding_rate}%\n`;
      txtContent += `   Monto Retenido: RD$ ${item.withheld_amount.toLocaleString('es-DO')}\n`;
      txtContent += `   Monto Neto: RD$ ${item.net_amount.toLocaleString('es-DO')}\n`;
      txtContent += `${'-'.repeat(80)}\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_ir17_${reportPeriod || selectedPeriod}.txt`;
    link.click();
  };

  const handleExportPdf = async () => {
    if (withholdingData.length === 0) return;

    try {
      const data = withholdingData.map(item => ({
        rnc_proveedor: item.supplier_rnc,
        nombre: item.supplier_name,
        fecha_pago: new Date(item.payment_date).toLocaleDateString('es-DO'),
        tipo_servicio: item.service_type,
        numero_factura: item.invoice_number,
        monto_bruto: item.gross_amount,
        tasa: item.withholding_rate,
        monto_retenido: item.withheld_amount,
        monto_neto: item.net_amount,
      }));

      const columns = [
        { key: 'rnc_proveedor', label: 'RNC Proveedor' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'fecha_pago', label: 'Fecha Pago' },
        { key: 'tipo_servicio', label: 'Tipo Servicio' },
        { key: 'numero_factura', label: 'Número Factura' },
        { key: 'monto_bruto', label: 'Monto Bruto' },
        { key: 'tasa', label: 'Tasa %' },
        { key: 'monto_retenido', label: 'Retenido' },
        { key: 'monto_neto', label: 'Monto Neto' },
      ];

      await exportToPdf(
        data,
        columns,
        `reporte_ir17_${selectedPeriod}`,
        'Reporte IR-17 - Retenciones ISR',
        'l',
      );
    } catch (error) {
      console.error('Error exporting Reporte IR-17 to PDF:', error);
      alert('Error al exportar a PDF. Revisa la consola para más detalles.');
    }
  };

  const getTotals = () => {
    return withholdingData.reduce((totals, item) => ({
      total_gross: totals.total_gross + item.gross_amount,
      total_withheld: totals.total_withheld + item.withheld_amount,
      total_net: totals.total_net + item.net_amount,
      count: totals.count + 1
    }), {
      total_gross: 0,
      total_withheld: 0,
      total_net: 0,
      count: 0
    });
  };

  const totals = getTotals();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte IR-17</h1>
            <p className="text-gray-600">Reporte de Retenciones de ISR</p>
          </div>
          <button
            onClick={() => navigate('/taxes')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Volver a Impuestos
          </button>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período
                </label>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="pt-6">
                <button
                  onClick={generateReport}
                  disabled={generating || !selectedPeriod}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {generating ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Generando...
                    </>
                  ) : (
                    <>
                      <i className="ri-percent-line mr-2"></i>
                      Generar Reporte
                    </>
                  )}
                </button>
              </div>
            </div>
            {withholdingData.length > 0 && (
              <div className="flex space-x-2 flex-wrap">
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-file-excel-2-line mr-2"></i>
                  Exportar Excel
                </button>
                <button
                  onClick={exportToCSV}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-download-line mr-2"></i>
                  Exportar CSV
                </button>
                <button
                  onClick={exportToTXT}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-file-text-line mr-2"></i>
                  Exportar TXT
                </button>
                <button
                  onClick={handleExportPdf}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-file-pdf-line mr-2"></i>
                  Exportar PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {withholdingData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 mr-4">
                  <i className="ri-file-list-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Retenciones</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.count}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 mr-4">
                  <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Monto Bruto</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.total_gross.toLocaleString('es-DO')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 mr-4">
                  <i className="ri-percent-line text-xl text-orange-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Retenido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.total_withheld.toLocaleString('es-DO')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100 mr-4">
                  <i className="ri-calculator-line text-xl text-purple-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Monto Neto</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.total_net.toLocaleString('es-DO')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Detalle del Reporte IR-17 - {formatPeriodLabel(reportPeriod || selectedPeriod)}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RNC Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo Servicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número Factura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Bruto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasa %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retenido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto Neto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {withholdingData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.supplier_rnc}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.supplier_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.payment_date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.service_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.invoice_number || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {item.gross_amount.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.withholding_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {item.withheld_amount.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {item.net_amount.toLocaleString('es-DO')}
                    </td>
                  </tr>
                ))}
                {withholdingData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      {generating ? 'Generando reporte...' : 'No hay datos para mostrar. Seleccione un período y genere el reporte.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}