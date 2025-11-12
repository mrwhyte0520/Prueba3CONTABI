
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { taxService } from '../../../services/database';

interface IT1Data {
  id?: string;
  period: string;
  total_sales: number;
  itbis_collected: number;
  total_purchases: number;
  itbis_paid: number;
  net_itbis_due: number;
  generated_date: string;
}

interface IT1Summary {
  totalDeclaraciones: number;
  totalVentasGravadas: number;
  totalITBISCobrado: number;
  totalComprasGravadas: number;
  totalITBISPagado: number;
  saldoNeto: number;
  ultimaDeclaracion: string | null;
}

export default function ReportIT1Page() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportData, setReportData] = useState<IT1Data | null>(null);
  const [historicalData, setHistoricalData] = useState<IT1Data[]>([]);
  const [summary, setSummary] = useState<IT1Summary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    // Set current month as default
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    setSelectedPeriod(currentPeriod);
    setSelectedYear(now.getFullYear().toString());
    
    loadDashboardData();
    loadHistoricalData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const summaryData = await taxService.getReportIT1Summary();
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    try {
      // Simular datos históricos ya que no tenemos una función específica
      const mockHistoricalData: IT1Data[] = [
        {
          id: '1',
          period: '2024-01',
          total_sales: 2850000,
          itbis_collected: 513000,
          total_purchases: 1200000,
          itbis_paid: 216000,
          net_itbis_due: 297000,
          generated_date: '2024-02-15T10:30:00Z'
        },
        {
          id: '2',
          period: '2024-02',
          total_sales: 3200000,
          itbis_collected: 576000,
          total_purchases: 1350000,
          itbis_paid: 243000,
          net_itbis_due: 333000,
          generated_date: '2024-03-15T11:15:00Z'
        },
        {
          id: '3',
          period: '2024-03',
          total_sales: 2950000,
          itbis_collected: 531000,
          total_purchases: 1180000,
          itbis_paid: 212400,
          net_itbis_due: 318600,
          generated_date: '2024-04-15T09:45:00Z'
        },
        {
          id: '4',
          period: '2024-04',
          total_sales: 3450000,
          itbis_collected: 621000,
          total_purchases: 1420000,
          itbis_paid: 255600,
          net_itbis_due: 365400,
          generated_date: '2024-05-15T14:20:00Z'
        },
        {
          id: '5',
          period: '2024-05',
          total_sales: 3100000,
          itbis_collected: 558000,
          total_purchases: 1300000,
          itbis_paid: 234000,
          net_itbis_due: 324000,
          generated_date: '2024-06-15T16:10:00Z'
        },
        {
          id: '6',
          period: '2024-06',
          total_sales: 3350000,
          itbis_collected: 603000,
          total_purchases: 1380000,
          itbis_paid: 248400,
          net_itbis_due: 354600,
          generated_date: '2024-07-15T12:30:00Z'
        },
        {
          id: '7',
          period: '2024-07',
          total_sales: 3650000,
          itbis_collected: 657000,
          total_purchases: 1500000,
          itbis_paid: 270000,
          net_itbis_due: 387000,
          generated_date: '2024-08-15T13:45:00Z'
        },
        {
          id: '8',
          period: '2024-08',
          total_sales: 3800000,
          itbis_collected: 684000,
          total_purchases: 1550000,
          itbis_paid: 279000,
          net_itbis_due: 405000,
          generated_date: '2024-09-15T15:20:00Z'
        },
        {
          id: '9',
          period: '2024-09',
          total_sales: 3550000,
          itbis_collected: 639000,
          total_purchases: 1480000,
          itbis_paid: 266400,
          net_itbis_due: 372600,
          generated_date: '2024-10-15T11:55:00Z'
        },
        {
          id: '10',
          period: '2024-10',
          total_sales: 3750000,
          itbis_collected: 675000,
          total_purchases: 1520000,
          itbis_paid: 273600,
          net_itbis_due: 401400,
          generated_date: '2024-11-15T10:40:00Z'
        },
        {
          id: '11',
          period: '2024-11',
          total_sales: 4200000,
          itbis_collected: 756000,
          total_purchases: 1680000,
          itbis_paid: 302400,
          net_itbis_due: 453600,
          generated_date: '2024-12-15T14:15:00Z'
        },
        {
          id: '12',
          period: '2024-12',
          total_sales: 4500000,
          itbis_collected: 810000,
          total_purchases: 1800000,
          itbis_paid: 324000,
          net_itbis_due: 486000,
          generated_date: '2025-01-15T09:30:00Z'
        }
      ];
      setHistoricalData(mockHistoricalData);
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedPeriod) {
      alert('Por favor seleccione un período');
      return;
    }
    
    setGenerating(true);
    try {
      const data = await taxService.generateReportIT1(selectedPeriod);
      setReportData(data);
      setActiveTab('declaration');
      
      // Actualizar datos históricos
      await loadHistoricalData();
      await loadDashboardData();
    } catch (error) {
      console.error('Error generating report IT-1:', error);
      alert('Error al generar el reporte IT-1. Por favor intente nuevamente.');
    } finally {
      setGenerating(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;
    
    const csvContent = [
      ['Campo', 'Valor'],
      ['Período', new Date(reportData.period + '-01').toLocaleDateString('es-DO', { year: 'numeric', month: 'long' })],
      ['Total Ventas Gravadas', `RD$ ${reportData.total_sales.toLocaleString('es-DO')}`],
      ['ITBIS Cobrado', `RD$ ${reportData.itbis_collected.toLocaleString('es-DO')}`],
      ['Total Compras Gravadas', `RD$ ${reportData.total_purchases.toLocaleString('es-DO')}`],
      ['ITBIS Pagado', `RD$ ${reportData.itbis_paid.toLocaleString('es-DO')}`],
      ['ITBIS Neto a Pagar', `RD$ ${reportData.net_itbis_due.toLocaleString('es-DO')}`],
      ['Fecha de Generación', new Date(reportData.generated_date).toLocaleDateString('es-DO')]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `declaracion_it1_${reportData.period}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToTXT = () => {
    if (!reportData) return;
    
    const content = `
DECLARACIÓN JURADA DEL ITBIS (IT-1)
===================================

Período: ${new Date(reportData.period + '-01').toLocaleDateString('es-DO', { year: 'numeric', month: 'long' })}

I. VENTAS Y SERVICIOS GRAVADOS
------------------------------
Total de Ventas y Servicios Gravados: RD$ ${reportData.total_sales.toLocaleString('es-DO')}
ITBIS Cobrado en Ventas: RD$ ${reportData.itbis_collected.toLocaleString('es-DO')}

II. COMPRAS Y GASTOS GRAVADOS
-----------------------------
Total de Compras y Gastos Gravados: RD$ ${reportData.total_purchases.toLocaleString('es-DO')}
ITBIS Pagado en Compras: RD$ ${reportData.itbis_paid.toLocaleString('es-DO')}

III. LIQUIDACIÓN DEL IMPUESTO
-----------------------------
ITBIS Cobrado en Ventas: RD$ ${reportData.itbis_collected.toLocaleString('es-DO')}
(-) ITBIS Pagado en Compras: RD$ ${reportData.itbis_paid.toLocaleString('es-DO')}
ITBIS NETO A PAGAR: RD$ ${reportData.net_itbis_due.toLocaleString('es-DO')}

Generado el: ${new Date(reportData.generated_date).toLocaleDateString('es-DO')} a las ${new Date(reportData.generated_date).toLocaleTimeString('es-DO')}

---
Sistema de Contabilidad - República Dominicana
Cumple con las normativas de la DGII
    `;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `declaracion_it1_${reportData.period}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHistoricalToCSV = () => {
    if (filteredHistoricalData.length === 0) return;
    
    const csvContent = [
      ['Período', 'Total Ventas', 'ITBIS Cobrado', 'Total Compras', 'ITBIS Pagado', 'ITBIS Neto', 'Fecha Generación'],
      ...filteredHistoricalData.map(record => [
        new Date(record.period + '-01').toLocaleDateString('es-DO', { year: 'numeric', month: 'long' }),
        record.total_sales.toLocaleString('es-DO'),
        record.itbis_collected.toLocaleString('es-DO'),
        record.total_purchases.toLocaleString('es-DO'),
        record.itbis_paid.toLocaleString('es-DO'),
        record.net_itbis_due.toLocaleString('es-DO'),
        new Date(record.generated_date).toLocaleDateString('es-DO')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_it1_${selectedYear || 'todos'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistoricalData = historicalData.filter(record => {
    const matchesSearch = !searchTerm || 
      record.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(record.period + '-01').toLocaleDateString('es-DO', { year: 'numeric', month: 'long' }).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = !selectedYear || record.period.startsWith(selectedYear);
    
    return matchesSearch && matchesYear;
  });

  const getMonthName = (period: string) => {
    return new Date(period + '-01').toLocaleDateString('es-DO', { year: 'numeric', month: 'long' });
  };

  const formatCurrency = (amount: number) => {
    return `RD$ ${amount.toLocaleString('es-DO')}`;
  };

  const getStatusColor = (amount: number) => {
    if (amount > 0) return 'text-red-600';
    if (amount < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusText = (amount: number) => {
    if (amount > 0) return 'A Pagar';
    if (amount < 0) return 'Saldo a Favor';
    return 'Sin Saldo';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte IT-1</h1>
            <p className="text-gray-600">Declaración Jurada Mensual del ITBIS</p>
          </div>
          <button
            onClick={() => navigate('/taxes')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Volver a Impuestos
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-dashboard-line mr-2"></i>
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('declaration')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'declaration'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-file-text-line mr-2"></i>
                Generar Declaración
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-history-line mr-2"></i>
                Historial
              </button>
            </nav>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Ejecutivo IT-1</h3>
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <i className="ri-loader-4-line animate-spin text-2xl text-blue-600 mr-3"></i>
                    <span className="text-gray-600">Cargando estadísticas...</span>
                  </div>
                ) : (
                  <>
                    {/* Main Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <div className="bg-blue-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                            <i className="ri-file-list-3-line text-xl text-blue-600"></i>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Declaraciones</p>
                            <p className="text-2xl font-bold text-blue-600">{historicalData.length}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                            <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">ITBIS Cobrado Total</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(historicalData.reduce((sum, item) => sum + item.itbis_collected, 0))}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100">
                            <i className="ri-shopping-cart-line text-xl text-orange-600"></i>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">ITBIS Pagado Total</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {formatCurrency(historicalData.reduce((sum, item) => sum + item.itbis_paid, 0))}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100">
                            <i className="ri-calculator-line text-xl text-red-600"></i>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">ITBIS Neto Total</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(historicalData.reduce((sum, item) => sum + item.net_itbis_due, 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Declarations */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Últimas Declaraciones</h4>
                      <div className="space-y-3">
                        {historicalData.slice(0, 5).map((record) => (
                          <div key={record.id} className="flex items-center justify-between bg-white p-4 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                                <i className="ri-calendar-line text-blue-600"></i>
                              </div>
                              <div className="ml-3">
                                <p className="font-medium text-gray-900">{getMonthName(record.period)}</p>
                                <p className="text-sm text-gray-500">
                                  Generado: {new Date(record.generated_date).toLocaleDateString('es-DO')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${getStatusColor(record.net_itbis_due)}`}>
                                {formatCurrency(Math.abs(record.net_itbis_due))}
                              </p>
                              <p className="text-sm text-gray-500">{getStatusText(record.net_itbis_due)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Declaration Tab */}
          {activeTab === 'declaration' && (
            <div className="p-6">
              {/* Controls */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
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
                            <i className="ri-calendar-check-line mr-2"></i>
                            Generar Declaración
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {reportData && (
                    <div className="flex space-x-2">
                      <button
                        onClick={exportToCSV}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-file-excel-line mr-2"></i>
                        Exportar CSV
                      </button>
                      <button
                        onClick={exportToTXT}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-file-text-line mr-2"></i>
                        Exportar TXT
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Declaration Form */}
              {reportData && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200 bg-blue-50">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Declaración Jurada del ITBIS (IT-1) - {getMonthName(reportData.period)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Formulario oficial según normativas de la DGII
                    </p>
                  </div>
                  <div className="p-6 space-y-8">
                    {/* Sales Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                        I. VENTAS Y SERVICIOS GRAVADOS
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total de Ventas y Servicios Gravados
                          </label>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(reportData.total_sales)}
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ITBIS Cobrado en Ventas
                          </label>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(reportData.itbis_collected)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purchases Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                        II. COMPRAS Y GASTOS GRAVADOS
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total de Compras y Gastos Gravados
                          </label>
                          <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(reportData.total_purchases)}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ITBIS Pagado en Compras
                          </label>
                          <div className="text-2xl font-bold text-purple-600">
                            {formatCurrency(reportData.itbis_paid)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculation Section */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                        III. LIQUIDACIÓN DEL IMPUESTO
                      </h4>
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">ITBIS Cobrado en Ventas:</span>
                            <span className="font-semibold">{formatCurrency(reportData.itbis_collected)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">(-) ITBIS Pagado en Compras:</span>
                            <span className="font-semibold">{formatCurrency(reportData.itbis_paid)}</span>
                          </div>
                          <div className="border-t border-gray-300 pt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-gray-900">
                                {reportData.net_itbis_due >= 0 ? 'ITBIS a Pagar:' : 'Saldo a Favor:'}
                              </span>
                              <span className={`text-2xl font-bold ${getStatusColor(reportData.net_itbis_due)}`}>
                                {formatCurrency(Math.abs(reportData.net_itbis_due))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border-2 border-blue-200 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 mx-auto mb-4">
                          <i className="ri-money-dollar-circle-line text-xl text-blue-600"></i>
                        </div>
                        <h5 className="text-sm font-medium text-gray-600 mb-2">Total Ventas</h5>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(reportData.total_sales)}
                        </p>
                      </div>
                      <div className="bg-white border-2 border-green-200 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 mx-auto mb-4">
                          <i className="ri-percent-line text-xl text-green-600"></i>
                        </div>
                        <h5 className="text-sm font-medium text-gray-600 mb-2">ITBIS Cobrado</h5>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(reportData.itbis_collected)}
                        </p>
                      </div>
                      <div className="bg-white border-2 border-red-200 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100 mx-auto mb-4">
                          <i className="ri-calculator-line text-xl text-red-600"></i>
                        </div>
                        <h5 className="text-sm font-medium text-gray-600 mb-2">
                          {reportData.net_itbis_due >= 0 ? 'ITBIS a Pagar' : 'Saldo a Favor'}
                        </h5>
                        <p className={`text-xl font-bold ${getStatusColor(reportData.net_itbis_due)}`}>
                          {formatCurrency(Math.abs(reportData.net_itbis_due))}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
                      Declaración generada el {new Date(reportData.generated_date).toLocaleDateString('es-DO')} a las {new Date(reportData.generated_date).toLocaleTimeString('es-DO')}
                      <br />
                      <span className="text-xs">Sistema de Contabilidad - Cumple con normativas DGII</span>
                    </div>
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {!reportData && !generating && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 mx-auto mb-4">
                    <i className="ri-calendar-check-line text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay declaración generada</h3>
                  <p className="text-gray-600 mb-4">Seleccione un período y genere la declaración IT-1</p>
                  <button
                    onClick={generateReport}
                    disabled={!selectedPeriod}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Generar Primera Declaración
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="p-6">
              {/* Filters */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buscar
                      </label>
                      <input
                        type="text"
                        placeholder="Buscar por período..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Año
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Todos los años</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                      </select>
                    </div>
                    <div className="pt-6">
                      <span className="text-sm text-gray-600">
                        {filteredHistoricalData.length} declaraciones encontradas
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={exportHistoricalToCSV}
                    disabled={filteredHistoricalData.length === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <i className="ri-download-line mr-2"></i>
                    Exportar Historial
                  </button>
                </div>
              </div>

              {/* Historical Data Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Período
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Ventas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ITBIS Cobrado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ITBIS Pagado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ITBIS Neto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Generación
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHistoricalData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                                <i className="ri-calendar-line text-blue-600"></i>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {getMonthName(record.period)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(record.total_sales)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                            {formatCurrency(record.itbis_collected)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                            {formatCurrency(record.itbis_paid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={getStatusColor(record.net_itbis_due)}>
                              {formatCurrency(Math.abs(record.net_itbis_due))}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.net_itbis_due > 0 
                                ? 'bg-red-100 text-red-800' 
                                : record.net_itbis_due < 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getStatusText(record.net_itbis_due)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.generated_date).toLocaleDateString('es-DO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredHistoricalData.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 mx-auto mb-4">
                      <i className="ri-search-line text-2xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron declaraciones</h3>
                    <p className="text-gray-600">Intente ajustar los filtros de búsqueda</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
