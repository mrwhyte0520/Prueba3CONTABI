import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { taxService } from '../../../services/database';

interface Report607Data {
  rnc_cedula: string;
  tipo_identificacion: string;
  numero_comprobante_fiscal: string;
  fecha_comprobante: string;
  monto_facturado: number;
  itbis_facturado: number;
  itbis_retenido: number;
  monto_propina_legal: number;
  itbis_retenido_propina: number;
  itbis_percibido_ventas: number;
  retencion_renta_terceros: number;
  isr_percibido_ventas: number;
  impuesto_selectivo_consumo: number;
  otros_impuestos_tasas: number;
  monto_propina_legal_2: number;
}

export default function Report607Page() {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<Report607Data[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Set current month as default
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    setSelectedPeriod(currentPeriod);
  }, []);

  const generateReport = async () => {
    if (!selectedPeriod) return;
    
    setGenerating(true);
    try {
      const data = await taxService.generateReport607(selectedPeriod);
      setReportData(data);
    } catch (error) {
      console.error('Error generating report 607:', error);
      alert('Error al generar el reporte 607');
    } finally {
      setGenerating(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      'RNC/Cédula',
      'Tipo ID',
      'NCF',
      'Fecha Comprobante',
      'Monto Facturado',
      'ITBIS Facturado',
      'ITBIS Retenido',
      'Propina Legal',
      'ITBIS Ret. Propina',
      'ITBIS Percibido',
      'Retención Terceros',
      'ISR Percibido',
      'Imp. Selectivo',
      'Otros Impuestos',
      'Propina Legal 2'
    ];

    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        row.rnc_cedula,
        row.tipo_identificacion,
        row.numero_comprobante_fiscal,
        row.fecha_comprobante,
        row.monto_facturado,
        row.itbis_facturado,
        row.itbis_retenido,
        row.monto_propina_legal,
        row.itbis_retenido_propina,
        row.itbis_percibido_ventas,
        row.retencion_renta_terceros,
        row.isr_percibido_ventas,
        row.impuesto_selectivo_consumo,
        row.otros_impuestos_tasas,
        row.monto_propina_legal_2
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_607_${selectedPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTotals = () => {
    return reportData.reduce((totals, row) => ({
      monto_facturado: totals.monto_facturado + row.monto_facturado,
      itbis_facturado: totals.itbis_facturado + row.itbis_facturado,
      itbis_retenido: totals.itbis_retenido + row.itbis_retenido,
      retencion_renta_terceros: totals.retencion_renta_terceros + row.retencion_renta_terceros
    }), {
      monto_facturado: 0,
      itbis_facturado: 0,
      itbis_retenido: 0,
      retencion_renta_terceros: 0
    });
  };

  const totals = getTotals();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte 607</h1>
            <p className="text-gray-600">Reporte de Ventas y Servicios</p>
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
                      <i className="ri-file-chart-2-line mr-2"></i>
                      Generar Reporte
                    </>
                  )}
                </button>
              </div>
            </div>
            {reportData.length > 0 && (
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-download-line mr-2"></i>
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        {reportData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 mr-4">
                  <i className="ri-money-dollar-circle-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Vendido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.monto_facturado.toLocaleString('es-DO')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 mr-4">
                  <i className="ri-percent-line text-xl text-green-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">ITBIS Cobrado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.itbis_facturado.toLocaleString('es-DO')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 mr-4">
                  <i className="ri-subtract-line text-xl text-orange-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">ITBIS Retenido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.itbis_retenido.toLocaleString('es-DO')}
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
                  <p className="text-sm font-medium text-gray-600">ISR Retenido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.retencion_renta_terceros.toLocaleString('es-DO')}
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
              Detalle del Reporte 607 - {selectedPeriod && new Date(selectedPeriod + '-01').toLocaleDateString('es-DO', { year: 'numeric', month: 'long' })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
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
                    Monto Facturado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ITBIS Facturado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ITBIS Retenido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ISR Retenido
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.rnc_cedula}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.numero_comprobante_fiscal}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(row.fecha_comprobante).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {row.monto_facturado.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {row.itbis_facturado.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {row.itbis_retenido.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {row.retencion_renta_terceros.toLocaleString('es-DO')}
                    </td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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