
import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('aging');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-31');
  const [supplier, setSupplier] = useState('all');
  const [showReport, setShowReport] = useState(false);

  const suppliers = [
    'Proveedor Industrial SA',
    'Distribuidora Nacional SRL',
    'Servicios Técnicos EIRL',
    'Materiales Construcción SA'
  ];

  const agingData = [
    {
      supplier: 'Proveedor Industrial SA',
      total: 350000,
      current: 150000,
      days1_30: 100000,
      days31_60: 75000,
      days61_90: 25000,
      over90: 0
    },
    {
      supplier: 'Distribuidora Nacional SRL',
      total: 280000,
      current: 200000,
      days1_30: 50000,
      days31_60: 30000,
      days61_90: 0,
      over90: 0
    },
    {
      supplier: 'Servicios Técnicos EIRL',
      total: 195000,
      current: 95000,
      days1_30: 60000,
      days31_60: 25000,
      days61_90: 15000,
      over90: 0
    },
    {
      supplier: 'Materiales Construcción SA',
      total: 165000,
      current: 65000,
      days1_30: 45000,
      days31_60: 35000,
      days61_90: 20000,
      over90: 0
    }
  ];

  const paymentsData = [
    {
      date: '2024-01-15',
      supplier: 'Proveedor Industrial SA',
      reference: 'PAY-2024-001',
      method: 'Transferencia',
      amount: 125000
    },
    {
      date: '2024-01-14',
      supplier: 'Distribuidora Nacional SRL',
      reference: 'PAY-2024-002',
      method: 'Cheque',
      amount: 85000
    },
    {
      date: '2024-01-13',
      supplier: 'Servicios Técnicos EIRL',
      reference: 'PAY-2024-003',
      method: 'Efectivo',
      amount: 45000
    },
    {
      date: '2024-01-12',
      supplier: 'Materiales Construcción SA',
      reference: 'PAY-2024-004',
      method: 'Transferencia',
      amount: 195000
    }
  ];

  const generateReport = () => {
    setShowReport(true);
    alert('Reporte generado exitosamente');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título del reporte
    doc.setFontSize(20);
    doc.text('Reporte de Cuentas por Pagar', 20, 20);
    
    // Información del reporte
    doc.setFontSize(12);
    doc.text(`Tipo de Reporte: ${reportType === 'aging' ? 'Antigüedad de Saldos' : 'Reporte de Pagos'}`, 20, 40);
    doc.text(`Período: ${startDate} - ${endDate}`, 20, 50);
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 20, 60);

    if (reportType === 'aging') {
      // Reporte de Antigüedad de Saldos
      const agingTableData = agingData.map(item => [
        item.supplier,
        `RD$ ${item.total.toLocaleString()}`,
        `RD$ ${item.current.toLocaleString()}`,
        `RD$ ${item.days1_30.toLocaleString()}`,
        `RD$ ${item.days31_60.toLocaleString()}`,
        `RD$ ${item.days61_90.toLocaleString()}`,
        `RD$ ${item.over90.toLocaleString()}`
      ]);

      doc.autoTable({
        head: [['Proveedor', 'Total', 'Corriente', '1-30 días', '31-60 días', '61-90 días', '+90 días']],
        body: agingTableData,
        startY: 80,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 }
      });

      // Totales
      const totals = agingData.reduce((acc, item) => ({
        total: acc.total + item.total,
        current: acc.current + item.current,
        days1_30: acc.days1_30 + item.days1_30,
        days31_60: acc.days31_60 + item.days31_60,
        days61_90: acc.days61_90 + item.days61_90,
        over90: acc.over90 + item.over90
      }), { total: 0, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 });

      doc.autoTable({
        head: [['', 'Total General', 'Corriente', '1-30 días', '31-60 días', '61-90 días', '+90 días']],
        body: [[
          'TOTALES',
          `RD$ ${totals.total.toLocaleString()}`,
          `RD$ ${totals.current.toLocaleString()}`,
          `RD$ ${totals.days1_30.toLocaleString()}`,
          `RD$ ${totals.days31_60.toLocaleString()}`,
          `RD$ ${totals.days61_90.toLocaleString()}`,
          `RD$ ${totals.over90.toLocaleString()}`
        ]],
        startY: doc.lastAutoTable.finalY + 10,
        theme: 'plain',
        styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
      });
    } else {
      // Reporte de Pagos
      const paymentsTableData = paymentsData.map(item => [
        item.date,
        item.supplier,
        item.reference,
        item.method,
        `RD$ ${item.amount.toLocaleString()}`
      ]);

      doc.autoTable({
        head: [['Fecha', 'Proveedor', 'Referencia', 'Método', 'Monto']],
        body: paymentsTableData,
        startY: 80,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 10 }
      });

      // Total de pagos
      const totalPayments = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
      doc.autoTable({
        body: [['TOTAL DE PAGOS', `RD$ ${totalPayments.toLocaleString()}`]],
        startY: doc.lastAutoTable.finalY + 10,
        theme: 'plain',
        styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
      });
    }

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 50, doc.internal.pageSize.height - 10);
      doc.text('Sistema Contable - Cuentas por Pagar', 20, doc.internal.pageSize.height - 10);
    }

    doc.save(`reporte-cuentas-por-pagar-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    let csvContent = '';
    
    if (reportType === 'aging') {
      csvContent = 'Reporte de Antigüedad de Saldos\n\n';
      csvContent += 'Proveedor,Total,Corriente,1-30 días,31-60 días,61-90 días,+90 días\n';
      
      agingData.forEach(item => {
        csvContent += `"${item.supplier}",${item.total},${item.current},${item.days1_30},${item.days31_60},${item.days61_90},${item.over90}\n`;
      });

      const totals = agingData.reduce((acc, item) => ({
        total: acc.total + item.total,
        current: acc.current + item.current,
        days1_30: acc.days1_30 + item.days1_30,
        days31_60: acc.days31_60 + item.days31_60,
        days61_90: acc.days61_90 + item.days61_90,
        over90: acc.over90 + item.over90
      }), { total: 0, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0 });

      csvContent += `\nTOTALES,${totals.total},${totals.current},${totals.days1_30},${totals.days31_60},${totals.days61_90},${totals.over90}\n`;
    } else {
      csvContent = 'Reporte de Pagos\n\n';
      csvContent += 'Fecha,Proveedor,Referencia,Método,Monto\n';
      
      paymentsData.forEach(item => {
        csvContent += `${item.date},"${item.supplier}",${item.reference},${item.method},${item.amount}\n`;
      });

      const totalPayments = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
      csvContent += `\n,,,TOTAL,${totalPayments}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-cuentas-por-pagar-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes de Cuentas por Pagar</h1>
          <p className="text-gray-600">Genera reportes detallados de proveedores y pagos</p>
        </div>

        {/* Report Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Reporte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte</label>
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="aging">Antigüedad de Saldos</option>
                <option value="payments">Reporte de Pagos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
              <select 
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los Proveedores</option>
                {suppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={generateReport}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Generar Reporte
              </button>
            </div>
          </div>
        </div>

        {/* Report Results */}
        {showReport && (
          <>
            {/* Export Buttons */}
            <div className="flex justify-end space-x-3">
              <button 
                onClick={exportToPDF}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-file-pdf-line mr-2"></i>
                Exportar PDF
              </button>
              <button 
                onClick={exportToExcel}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-file-excel-line mr-2"></i>
                Exportar Excel
              </button>
            </div>

            {reportType === 'aging' ? (
              /* Aging Report */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Reporte de Antigüedad de Saldos</h3>
                  <p className="text-gray-600">Período: {startDate} - {endDate}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Corriente</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">1-30 días</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">31-60 días</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">61-90 días</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">+90 días</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agingData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.supplier}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">RD$ {item.total.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">RD$ {item.current.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">RD$ {item.days1_30.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">RD$ {item.days31_60.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">RD$ {item.days61_90.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-800">RD$ {item.over90.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTALES</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                          RD$ {agingData.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                          RD$ {agingData.reduce((sum, item) => sum + item.current, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-yellow-600">
                          RD$ {agingData.reduce((sum, item) => sum + item.days1_30, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-orange-600">
                          RD$ {agingData.reduce((sum, item) => sum + item.days31_60, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                          RD$ {agingData.reduce((sum, item) => sum + item.days61_90, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-800">
                          RD$ {agingData.reduce((sum, item) => sum + item.over90, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* Payments Report */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Reporte de Pagos</h3>
                  <p className="text-gray-600">Período: {startDate} - {endDate}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentsData.map((payment, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.supplier}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.reference}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              payment.method === 'Transferencia' ? 'bg-blue-100 text-blue-800' :
                              payment.method === 'Cheque' ? 'bg-green-100 text-green-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {payment.method}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                            RD$ {payment.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTAL DE PAGOS</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                          RD$ {paymentsData.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
