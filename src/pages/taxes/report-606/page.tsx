
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { taxService } from '../../../services/database';
import * as XLSX from 'xlsx';

interface Report606Data {
  id: string;
  period: string;
  rnc_cedula: string;
  tipo_identificacion: string;
  tipo_bienes_servicios: string;
  ncf: string;
  ncf_modificado?: string;
  fecha_comprobante: string;
  fecha_pago: string;
  servicios_facturados: number;
  bienes_facturados: number;
  monto_facturado: number;
  itbis_facturado: number;
  itbis_retenido: number;
  retencion_renta: number;
  isr_percibido: number;
  impuesto_selectivo_consumo: number;
  otros_impuestos: number;
  monto_propina_legal: number;
  forma_pago: string;
}

interface Report606Summary {
  totalRecords: number;
  totalAmount: number;
  totalItbis: number;
  totalRetention: number;
}

export default function Report606Page() {
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [reportData, setReportData] = useState<Report606Data[]>([]);
  const [summary, setSummary] = useState<Report606Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const periods = [
    { value: '2024-01', label: 'Enero 2024' },
    { value: '2024-02', label: 'Febrero 2024' },
    { value: '2024-03', label: 'Marzo 2024' },
    { value: '2024-04', label: 'Abril 2024' },
    { value: '2024-05', label: 'Mayo 2024' },
    { value: '2024-06', label: 'Junio 2024' },
    { value: '2024-07', label: 'Julio 2024' },
    { value: '2024-08', label: 'Agosto 2024' },
    { value: '2024-09', label: 'Septiembre 2024' },
    { value: '2024-10', label: 'Octubre 2024' },
    { value: '2024-11', label: 'Noviembre 2024' },
    { value: '2024-12', label: 'Diciembre 2024' }
  ];

  const generateReport = async () => {
    if (!selectedPeriod) {
      alert('Por favor selecciona un período');
      return;
    }

    setLoading(true);
    try {
      const data = await taxService.generateReport606(selectedPeriod);
      const summaryData = await taxService.getReport606Summary(selectedPeriod);
      
      setReportData(data);
      setSummary(summaryData);
      setShowResults(true);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      'RNC/Cédula',
      'Tipo ID',
      'Tipo Bienes/Servicios',
      'NCF',
      'NCF Modificado',
      'Fecha Comprobante',
      'Fecha Pago',
      'Servicios Facturados',
      'Bienes Facturados',
      'Monto Facturado',
      'ITBIS Facturado',
      'ITBIS Retenido',
      'Retención Renta',
      'ISR Percibido',
      'Impuesto Selectivo',
      'Otros Impuestos',
      'Propina Legal',
      'Forma Pago'
    ];

    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        row.rnc_cedula,
        row.tipo_identificacion,
        row.tipo_bienes_servicios,
        row.ncf,
        row.ncf_modificado || '',
        row.fecha_comprobante,
        row.fecha_pago,
        row.servicios_facturados.toFixed(2),
        row.bienes_facturados.toFixed(2),
        row.monto_facturado.toFixed(2),
        row.itbis_facturado.toFixed(2),
        row.itbis_retenido.toFixed(2),
        row.retencion_renta.toFixed(2),
        row.isr_percibido.toFixed(2),
        row.impuesto_selectivo_consumo.toFixed(2),
        row.otros_impuestos.toFixed(2),
        row.monto_propina_legal.toFixed(2),
        row.forma_pago
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_606_${selectedPeriod}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    if (reportData.length === 0) return;

    // Preparar datos para Excel
    const excelData = reportData.map(row => ({
      'RNC/Cédula': row.rnc_cedula,
      'Tipo Identificación': row.tipo_identificacion,
      'Tipo Bienes/Servicios': row.tipo_bienes_servicios,
      'NCF': row.ncf,
      'NCF Modificado': row.ncf_modificado || '',
      'Fecha Comprobante': row.fecha_comprobante,
      'Fecha Pago': row.fecha_pago,
      'Servicios Facturados': row.servicios_facturados,
      'Bienes Facturados': row.bienes_facturados,
      'Monto Facturado': row.monto_facturado,
      'ITBIS Facturado': row.itbis_facturado,
      'ITBIS Retenido': row.itbis_retenido,
      'Retención Renta': row.retencion_renta,
      'ISR Percibido': row.isr_percibido,
      'Impuesto Selectivo': row.impuesto_selectivo_consumo,
      'Otros Impuestos': row.otros_impuestos,
      'Propina Legal': row.monto_propina_legal,
      'Forma Pago': row.forma_pago
    }));

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    
    // Crear hoja de datos
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Configurar ancho de columnas
    const colWidths = [
      { wch: 15 }, // RNC/Cédula
      { wch: 12 }, // Tipo ID
      { wch: 20 }, // Tipo Bienes/Servicios
      { wch: 15 }, // NCF
      { wch: 15 }, // NCF Modificado
      { wch: 15 }, // Fecha Comprobante
      { wch: 15 }, // Fecha Pago
      { wch: 18 }, // Servicios Facturados
      { wch: 16 }, // Bienes Facturados
      { wch: 16 }, // Monto Facturado
      { wch: 15 }, // ITBIS Facturado
      { wch: 15 }, // ITBIS Retenido
      { wch: 15 }, // Retención Renta
      { wch: 12 }, // ISR Percibido
      { wch: 16 }, // Impuesto Selectivo
      { wch: 14 }, // Otros Impuestos
      { wch: 12 }, // Propina Legal
      { wch: 12 }  // Forma Pago
    ];
    ws['!cols'] = colWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte 606');

    // Si hay resumen, agregar hoja de resumen
    if (summary) {
      const summaryData = [
        { 'Concepto': 'Total de Registros', 'Valor': summary.totalRecords },
        { 'Concepto': 'Monto Total Facturado', 'Valor': summary.totalAmount },
        { 'Concepto': 'Total ITBIS', 'Valor': summary.totalItbis },
        { 'Concepto': 'Total Retenciones', 'Valor': summary.totalRetention }
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
    }

    // Descargar archivo
    XLSX.writeFile(wb, `reporte_606_${selectedPeriod}.xlsx`);
  };

  const exportToTXT = () => {
    if (reportData.length === 0) return;

    let txtContent = `REPORTE 606 - COMPRAS Y SERVICIOS\n`;
    txtContent += `Período: ${selectedPeriod}\n`;
    txtContent += `Fecha de generación: ${new Date().toLocaleDateString()}\n\n`;

    if (summary) {
      txtContent += `RESUMEN:\n`;
      txtContent += `Total de registros: ${summary.totalRecords}\n`;
      txtContent += `Monto total: RD$ ${summary.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\n`;
      txtContent += `Total ITBIS: RD$ ${summary.totalItbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\n`;
      txtContent += `Total retenciones: RD$ ${summary.totalRetention.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\n\n`;
    }

    txtContent += `DETALLE:\n`;
    txtContent += `${'='.repeat(120)}\n`;

    reportData.forEach((row, index) => {
      txtContent += `${index + 1}. RNC/Cédula: ${row.rnc_cedula}\n`;
      txtContent += `   NCF: ${row.ncf}\n`;
      txtContent += `   Fecha: ${row.fecha_comprobante}\n`;
      txtContent += `   Monto: RD$ ${row.monto_facturado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\n`;
      txtContent += `   ITBIS: RD$ ${row.itbis_facturado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}\n`;
      txtContent += `   Forma de pago: ${row.forma_pago}\n`;
      txtContent += `${'-'.repeat(80)}\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_606_${selectedPeriod}.txt`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reporte 606</h1>
          <p className="text-gray-600">Reporte de Compras y Servicios</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generar Reporte</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar período</option>
                {periods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={generateReport}
            disabled={loading || !selectedPeriod}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>

        {/* Resultados */}
        {showResults && (
          <>
            {/* Resumen */}
            {summary && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{summary.totalRecords}</div>
                    <div className="text-sm text-gray-600">Total Registros</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      RD$ {summary.totalAmount.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">Monto Total</div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      RD$ {summary.totalItbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">Total ITBIS</div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      RD$ {summary.totalRetention.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-600">Total Retenciones</div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de exportación */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Exportar Datos</h2>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportToCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-file-excel-2-line"></i>
                  Exportar CSV
                </button>
                
                <button
                  onClick={exportToExcel}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-file-excel-line"></i>
                  Exportar Excel
                </button>
                
                <button
                  onClick={exportToTXT}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-file-text-line"></i>
                  Exportar TXT
                </button>
              </div>
            </div>

            {/* Tabla de datos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Datos del Reporte ({reportData.length} registros)
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        RNC/Cédula
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        NCF
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ITBIS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Retención
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Forma Pago
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.rnc_cedula}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.ncf}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.fecha_comprobante}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RD$ {row.monto_facturado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RD$ {row.itbis_facturado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RD$ {row.itbis_retenido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.forma_pago}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}