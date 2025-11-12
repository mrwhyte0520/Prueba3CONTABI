import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

// Importación dinámica de jsPDF para evitar errores de compilación
const loadJsPDF = async () => {
  const jsPDF = await import('jspdf');
  await import('jspdf-autotable');
  return jsPDF.default;
};

export default function CashClosingPage() {
  const [showNewClosingModal, setShowNewClosingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('María González');
  const [selectedShift, setSelectedShift] = useState('Mañana (8:00 AM - 4:00 PM)');

  const cashClosings = [
    {
      id: 'CC-2024-015',
      date: '2024-01-15',
      cashier: 'María González',
      shift: 'Mañana (8:00 AM - 4:00 PM)',
      openingBalance: 5000,
      totalSales: 185450,
      cashSales: 75200,
      cardSales: 65150,
      transferSales: 35100,
      otherSales: 10000,
      totalExpenses: 2500,
      expectedBalance: 77700,
      actualBalance: 77500,
      difference: -200,
      status: 'closed',
      notes: 'Diferencia menor por cambio no registrado'
    },
    {
      id: 'CC-2024-014',
      date: '2024-01-15',
      cashier: 'Carlos Rodríguez',
      shift: 'Tarde (4:00 PM - 12:00 AM)',
      openingBalance: 3000,
      totalSales: 125300,
      cashSales: 45800,
      cardSales: 52500,
      transferSales: 22000,
      otherSales: 5000,
      totalExpenses: 1200,
      expectedBalance: 47600,
      actualBalance: 47600,
      difference: 0,
      status: 'closed',
      notes: 'Cierre perfecto'
    },
    {
      id: 'CC-2024-013',
      date: '2024-01-14',
      cashier: 'Ana Martínez',
      shift: 'Completo (8:00 AM - 8:00 PM)',
      openingBalance: 4000,
      totalSales: 245600,
      cashSales: 98400,
      cardSales: 89200,
      transferSales: 45000,
      otherSales: 13000,
      totalExpenses: 3200,
      expectedBalance: 99200,
      actualBalance: 99500,
      difference: 300,
      status: 'closed',
      notes: 'Sobrante por propina no registrada'
    },
    {
      id: 'CC-2024-012',
      date: '2024-01-14',
      cashier: 'Luis Pérez',
      shift: 'Noche (8:00 PM - 2:00 AM)',
      openingBalance: 2500,
      totalSales: 89750,
      cashSales: 32500,
      cardSales: 38250,
      transferSales: 15000,
      otherSales: 4000,
      totalExpenses: 800,
      expectedBalance: 34200,
      actualBalance: 34000,
      difference: -200,
      status: 'pending_review',
      notes: 'Pendiente de revisión por diferencia'
    }
  ];

  const currentShift = {
    cashier: 'María González',
    shift: 'Mañana (8:00 AM - 4:00 PM)',
    startTime: '08:00',
    openingBalance: 5000,
    currentSales: 45600,
    cashSales: 18200,
    cardSales: 16400,
    transferSales: 8500,
    otherSales: 2500,
    expenses: 500
  };

  const paymentMethods = [
    { name: 'Efectivo', amount: currentShift.cashSales, icon: 'ri-money-dollar-circle-line', color: 'green' },
    { name: 'Tarjeta', amount: currentShift.cardSales, icon: 'ri-bank-card-line', color: 'blue' },
    { name: 'Transferencia', amount: currentShift.transferSales, icon: 'ri-exchange-line', color: 'purple' },
    { name: 'Otros', amount: currentShift.otherSales, icon: 'ri-more-line', color: 'orange' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-green-100 text-green-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'discrepancy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'closed': return 'Cerrado';
      case 'pending_review': return 'Pendiente Revisión';
      case 'discrepancy': return 'Con Discrepancia';
      default: return 'Desconocido';
    }
  };

  const getDifferenceColor = (difference: number) => {
    if (difference === 0) return 'text-green-600';
    if (difference > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const filteredClosings = cashClosings.filter(closing => {
    const matchesSearch = closing.cashier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         closing.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleStartNewClosing = () => {
    setShowNewClosingModal(true);
  };

  const handleViewClosing = (closingId: string) => {
    alert(`Visualizando cierre: ${closingId}`);
  };

  const handlePrintClosing = (closingId: string) => {
    alert(`Imprimiendo cierre: ${closingId}`);
  };

  const handleReviewClosing = (closingId: string) => {
    alert(`Revisando cierre: ${closingId}`);
  };

  const handleExportClosings = (format: string) => {
    alert(`Exportando cierres en formato ${format.toUpperCase()}`);
  };

  const expectedCashBalance = currentShift.openingBalance + currentShift.cashSales - currentShift.expenses;

  const exportToPDF = async () => {
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF();
      
      // Configurar el documento
      doc.setFontSize(20);
      doc.text('Reporte de Cierre de Caja', 20, 20);
      
      // Información del cierre
      doc.setFontSize(12);
      doc.text(`Fecha: ${selectedDate}`, 20, 40);
      doc.text(`Cajero: ${currentShift.cashier}`, 20, 50);
      doc.text(`Turno: ${currentShift.shift}`, 20, 60);
      
      // Resumen de ventas
      doc.setFontSize(14);
      doc.text('Resumen de Ventas', 20, 80);
      
      const salesData = [
        ['Concepto', 'Cantidad', 'Monto'],
        ['Ventas en Efectivo', '45', `RD$ ${currentShift.cashSales.toLocaleString()}.00`],
        ['Ventas con Tarjeta', '32', `RD$ ${currentShift.cardSales.toLocaleString()}.00`],
        ['Ventas por Transferencia', '18', `RD$ ${currentShift.transferSales.toLocaleString()}.00`],
        ['Otros Métodos', '8', `RD$ ${currentShift.otherSales.toLocaleString()}.00`],
        ['Total Ventas', '103', `RD$ ${currentShift.currentSales.toLocaleString()}.00`]
      ];

      (doc as any).autoTable({
        startY: 90,
        head: [salesData[0]],
        body: salesData.slice(1),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Desglose de efectivo
      doc.setFontSize(14);
      doc.text('Desglose de Efectivo', 20, (doc as any).lastAutoTable.finalY + 20);
      
      const cashData = [
        ['Denominación', 'Cantidad', 'Subtotal'],
        ['RD$ 2,000', '5', 'RD$ 10,000.00'],
        ['RD$ 1,000', '8', 'RD$ 8,000.00'],
        ['RD$ 500', '12', 'RD$ 6,000.00'],
        ['RD$ 200', '15', 'RD$ 3,000.00'],
        ['RD$ 100', '20', 'RD$ 2,000.00'],
        ['RD$ 50', '10', 'RD$ 500.00'],
        ['RD$ 20', '25', 'RD$ 500.00'],
        ['RD$ 10', '30', 'RD$ 300.00'],
        ['RD$ 5', '20', 'RD$ 100.00'],
        ['RD$ 1', '50', 'RD$ 50.00'],
        ['Total Efectivo', '', `RD$ ${expectedCashBalance.toLocaleString()}.00`]
      ];

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 30,
        head: [cashData[0]],
        body: cashData.slice(1),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [34, 197, 94] }
      });

      // Resumen final
      doc.setFontSize(14);
      doc.text('Resumen Final', 20, (doc as any).lastAutoTable.finalY + 20);
      
      const summaryData = [
        ['Concepto', 'Monto'],
        ['Saldo Inicial', `RD$ ${currentShift.openingBalance.toLocaleString()}.00`],
        ['Total Ventas del Día', `RD$ ${currentShift.currentSales.toLocaleString()}.00`],
        ['Ventas en Efectivo', `RD$ ${currentShift.cashSales.toLocaleString()}.00`],
        ['Gastos del Turno', `RD$ ${currentShift.expenses.toLocaleString()}.00`],
        ['Efectivo Esperado', `RD$ ${expectedCashBalance.toLocaleString()}.00`],
        ['Estado', 'Turno Activo']
      ];

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 30,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [239, 68, 68] }
      });

      // Pie de página
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.text('Generado automáticamente por Sistema Contable', 20, pageHeight - 20);
      doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 20, pageHeight - 10);

      // Descargar el PDF
      doc.save(`cierre-caja-${selectedDate}-${currentShift.cashier.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja</h1>
            <p className="text-gray-600">Control y reconciliación diaria de efectivo</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>
              Exportar PDF
            </button>
            <button
              onClick={handleStartNewClosing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-calculator-line mr-2"></i>
              Nuevo Cierre
            </button>
          </div>
        </div>

        {/* Current Shift Summary */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Turno Actual</h3>
              <p className="text-blue-100">{currentShift.cashier} - {currentShift.shift}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100">Inicio: {currentShift.startTime}</p>
              <p className="text-blue-100">Fecha: {new Date().toLocaleDateString('es-DO')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Saldo Inicial</p>
              <p className="text-2xl font-bold">RD$ {currentShift.openingBalance.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Ventas Actuales</p>
              <p className="text-2xl font-bold">RD$ {currentShift.currentSales.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Gastos</p>
              <p className="text-2xl font-bold">RD$ {currentShift.expenses.toLocaleString()}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Efectivo Esperado</p>
              <p className="text-2xl font-bold">RD$ {expectedCashBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {paymentMethods.map((method, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{method.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    RD$ {method.amount.toLocaleString()}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${method.color}-100`}>
                  <i className={`${method.icon} text-xl text-${method.color}-600`}></i>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-${method.color}-600 h-2 rounded-full`}
                    style={{ width: `${(method.amount / currentShift.currentSales) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {((method.amount / currentShift.currentSales) * 100).toFixed(1)}% del total
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por cajero o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Cash Closings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Cierres de Caja ({filteredClosings.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cajero
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Turno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ventas Totales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efectivo Esperado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efectivo Real
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClosings.map((closing) => (
                  <tr key={closing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{closing.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(closing.date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{closing.cashier}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{closing.shift}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD$ {closing.totalSales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {closing.expectedBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD$ {closing.actualBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getDifferenceColor(closing.difference)}`}>
                        {closing.difference >= 0 ? '+' : ''}RD$ {closing.difference.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(closing.status)}`}>
                        {getStatusText(closing.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewClosing(closing.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver cierre"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button
                          onClick={() => handlePrintClosing(closing.id)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Imprimir cierre"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        {closing.status === 'pending_review' && (
                          <button
                            onClick={() => handleReviewClosing(closing.id)}
                            className="text-yellow-600 hover:text-yellow-900 p-1"
                            title="Revisar cierre"
                          >
                            <i className="ri-search-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Closing Modal */}
        {showNewClosingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Nuevo Cierre de Caja</h3>
                  <button
                    onClick={() => setShowNewClosingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cajero</label>
                    <input
                      type="text"
                      value={currentShift.cashier}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Turno</label>
                    <input
                      type="text"
                      value={currentShift.shift}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Saldo Inicial</label>
                    <input
                      type="number"
                      value={currentShift.openingBalance}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ventas en Efectivo</label>
                    <input
                      type="number"
                      value={currentShift.cashSales}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gastos</label>
                    <input
                      type="number"
                      value={currentShift.expenses}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Efectivo Esperado</label>
                    <input
                      type="number"
                      value={expectedCashBalance}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-semibold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Efectivo Real Contado</label>
                    <input
                      type="number"
                      placeholder="Ingrese el efectivo contado físicamente"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas del Cierre</label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Observaciones, incidencias o comentarios sobre el cierre..."
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewClosingModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert('Procesando cierre de caja...');
                    setShowNewClosingModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Procesar Cierre
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}