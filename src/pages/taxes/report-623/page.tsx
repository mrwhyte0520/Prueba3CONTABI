
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { taxService, settingsService } from '../../../services/database';
import * as XLSX from 'xlsx';
import { exportToPdf } from '../../../utils/exportImportUtils';

interface Report623Data {
  beneficiary_name: string;
  beneficiary_country: string;
  payment_concept: string;
  payment_date: string;
  amount_usd: number;
  amount_dop: number;
  exchange_rate: number;
  tax_withheld: number;
  payment_method: string;
}

export default function Report623Page() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [foreignPayments, setForeignPayments] = useState<Report623Data[]>([]);
  const [generating, setGenerating] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);

  useEffect(() => {
    // Set current month as default
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
        console.error('Error cargando información de la empresa para Reporte 623', error);
      }
    };

    loadCompany();
  }, []);

  const generateReport = async () => {
    if (!selectedPeriod) return;
    
    setGenerating(true);
    try {
      const data = await taxService.generateReport623(selectedPeriod);
      setForeignPayments(data);
    } catch (error) {
      console.error('Error generating report 623:', error);
      alert('Error al generar el reporte 623');
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (foreignPayments.length === 0) return;

    const excelData = foreignPayments.map(payment => ({
      'Beneficiario': payment.beneficiary_name,
      'País': payment.beneficiary_country,
      'Concepto': payment.payment_concept,
      'Fecha Pago': payment.payment_date,
      'Método de Pago': payment.payment_method,
      'Monto USD': payment.amount_usd,
      'Monto RD$': payment.amount_dop,
      'Tasa de Cambio': payment.exchange_rate,
      'Impuesto Retenido': payment.tax_withheld
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
    headerRows.push(['Reporte 623 - Pagos al Exterior']);
    headerRows.push([`Período: ${selectedPeriod}`]);
    headerRows.push([]);

    const wb = XLSX.utils.book_new();
    const tableStartRow = headerRows.length + 1;
    const ws = XLSX.utils.json_to_sheet(excelData as any, { origin: `A${tableStartRow}` } as any);

    ws['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 }
    ];

    XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });

    XLSX.utils.book_append_sheet(wb, ws, 'Reporte 623');
    XLSX.writeFile(wb, `reporte_623_${selectedPeriod}.xlsx`);
  };

  const exportToCSV = () => {
    if (foreignPayments.length === 0) return;

    const separator = ';';

    const headers = [
      'Beneficiario',
      'País',
      'Concepto',
      'Fecha Pago',
      'Monto USD',
      'Monto RD$',
      'Tasa Cambio',
      'Impuesto Retenido',
      'Método Pago'
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

    headerLines.push(['Reporte', 'Reporte 623 - Pagos al Exterior'].join(separator));
    headerLines.push(['Período', selectedPeriod].join(separator));
    headerLines.push('');

    const csvContent = [
      ...headerLines,
      headers.join(separator),
      ...foreignPayments.map(payment => [
        `"${payment.beneficiary_name}"`,
        `"${payment.beneficiary_country}"`,
        `"${payment.payment_concept}"`,
        payment.payment_date,
        payment.amount_usd,
        payment.amount_dop,
        payment.exchange_rate,
        payment.tax_withheld,
        `"${payment.payment_method}"`
      ].join(separator))
    ].join('\n');

    const csvForExcel = '\uFEFF' + csvContent.replace(/\n/g, '\r\n');
    const blob = new Blob([csvForExcel], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_623_${selectedPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = async () => {
    if (foreignPayments.length === 0) return;

    try {
      const data = foreignPayments.map(payment => ({
        beneficiario: payment.beneficiary_name,
        pais: payment.beneficiary_country,
        concepto: payment.payment_concept,
        fecha: new Date(payment.payment_date).toLocaleDateString('es-DO'),
        monto_usd: payment.amount_usd,
        monto_dop: payment.amount_dop,
        tasa: payment.exchange_rate,
        impuesto: payment.tax_withheld,
      }));

      const columns = [
        { key: 'beneficiario', label: 'Beneficiario' },
        { key: 'pais', label: 'País' },
        { key: 'concepto', label: 'Concepto' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'monto_usd', label: 'Monto USD' },
        { key: 'monto_dop', label: 'Monto RD$' },
        { key: 'tasa', label: 'Tasa' },
        { key: 'impuesto', label: 'Impuesto' },
      ];

      await exportToPdf(
        data,
        columns,
        `reporte_623_${selectedPeriod}`,
        'Reporte 623 - Pagos al Exterior',
        'l',
      );
    } catch (error) {
      console.error('Error exporting Reporte 623 to PDF:', error);
      alert('Error al exportar a PDF. Revisa la consola para más detalles.');
    }
  };

  const exportToTXT = () => {
    if (foreignPayments.length === 0) return;

    const txtContent = foreignPayments.map(payment => [
      payment.beneficiary_name,
      payment.beneficiary_country,
      payment.payment_concept,
      payment.payment_date,
      payment.amount_usd,
      payment.amount_dop,
      payment.exchange_rate,
      payment.tax_withheld,
      payment.payment_method
    ].join('|')).join('\n');

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_623_${selectedPeriod}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTotals = () => {
    return foreignPayments.reduce((totals, payment) => ({
      total_usd: totals.total_usd + payment.amount_usd,
      total_dop: totals.total_dop + payment.amount_dop,
      total_tax: totals.total_tax + payment.tax_withheld,
      count: totals.count + 1
    }), {
      total_usd: 0,
      total_dop: 0,
      total_tax: 0,
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
            <h1 className="text-2xl font-bold text-gray-900">Reporte 623</h1>
            <p className="text-gray-600">Reporte de Pagos al Exterior</p>
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
                      <i className="ri-global-line mr-2"></i>
                      Generar Reporte
                    </>
                  )}
                </button>
              </div>
            </div>
            {foreignPayments.length > 0 && (
              <div className="flex space-x-2">
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
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
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
        {foreignPayments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 mr-4">
                  <i className="ri-global-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagos Realizados</p>
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
                  <p className="text-sm font-medium text-gray-600">Total USD</p>
                  <p className="text-2xl font-bold text-gray-900">
                    US$ {totals.total_usd.toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 mr-4">
                  <i className="ri-money-peso-circle-line text-xl text-orange-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total RD$</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.total_dop.toLocaleString('es-DO')}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100 mr-4">
                  <i className="ri-percent-line text-xl text-purple-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Impuesto Retenido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    RD$ {totals.total_tax.toLocaleString('es-DO')}
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
              Detalle del Reporte 623 - {selectedPeriod && new Date(selectedPeriod + '-01').toLocaleDateString('es-DO', { year: 'numeric', month: 'long' })}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beneficiario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    País
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Concepto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto USD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto RD$
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impuesto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {foreignPayments.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.beneficiary_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.beneficiary_country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.payment_concept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      US$ {payment.amount_usd.toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {payment.amount_dop.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.exchange_rate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {payment.tax_withheld.toLocaleString('es-DO')}
                    </td>
                  </tr>
                ))}
                {foreignPayments.length === 0 && (
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
