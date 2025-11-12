import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface DepreciationEntry {
  id: string;
  assetCode: string;
  assetName: string;
  category: string;
  acquisitionCost: number;
  accumulatedDepreciation: number;
  monthlyDepreciation: number;
  remainingValue: number;
  depreciationDate: string;
  period: string;
  status: string;
  method: string;
}

export default function DepreciationPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [depreciations] = useState<DepreciationEntry[]>([
    {
      id: '1',
      assetCode: 'ACT-001',
      assetName: 'Edificio Principal',
      category: 'Edificios y Construcciones',
      acquisitionCost: 4200000,
      accumulatedDepreciation: 420000,
      monthlyDepreciation: 7000,
      remainingValue: 3780000,
      depreciationDate: '2024-01-01',
      period: '2024-01',
      status: 'Calculado',
      method: 'Línea Recta'
    },
    {
      id: '2',
      assetCode: 'ACT-045',
      assetName: 'Maquinaria Industrial A',
      category: 'Maquinaria y Equipo',
      acquisitionCost: 280000,
      accumulatedDepreciation: 140000,
      monthlyDepreciation: 2333,
      remainingValue: 140000,
      depreciationDate: '2024-01-01',
      period: '2024-01',
      status: 'Calculado',
      method: 'Línea Recta'
    },
    {
      id: '3',
      assetCode: 'ACT-123',
      assetName: 'Vehículo Toyota Hilux',
      category: 'Vehículos',
      acquisitionCost: 85000,
      accumulatedDepreciation: 85000,
      monthlyDepreciation: 1417,
      remainingValue: 68000,
      depreciationDate: '2024-01-01',
      period: '2024-01',
      status: 'Calculado',
      method: 'Línea Recta'
    },
    {
      id: '4',
      assetCode: 'ACT-089',
      assetName: 'Servidor Dell PowerEdge',
      category: 'Equipo de Computación',
      acquisitionCost: 45000,
      accumulatedDepreciation: 11250,
      monthlyDepreciation: 938,
      remainingValue: 33750,
      depreciationDate: '2024-01-01',
      period: '2024-01',
      status: 'Calculado',
      method: 'Línea Recta'
    },
    {
      id: '5',
      assetCode: 'ACT-156',
      assetName: 'Mobiliario de Oficina',
      category: 'Mobiliario y Equipo de Oficina',
      acquisitionCost: 25000,
      accumulatedDepreciation: 1250,
      monthlyDepreciation: 208,
      remainingValue: 23750,
      depreciationDate: '2024-01-01',
      period: '2024-01',
      status: 'Pendiente',
      method: 'Línea Recta'
    }
  ]);

  const periods = ['2024-01', '2023-12', '2023-11', '2023-10'];

  const filteredDepreciations = depreciations.filter(dep => {
    const matchesSearch = dep.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dep.assetCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPeriod = !filterPeriod || dep.period === filterPeriod;
    const matchesStatus = !filterStatus || dep.status === filterStatus;
    
    return matchesSearch && matchesPeriod && matchesStatus;
  });

  const totalDepreciationMonth = filteredDepreciations.reduce((sum, dep) => sum + dep.monthlyDepreciation, 0);
  const totalAccumulated = filteredDepreciations.reduce((sum, dep) => sum + dep.accumulatedDepreciation, 0);
  const totalRemainingValue = filteredDepreciations.reduce((sum, dep) => sum + dep.remainingValue, 0);

  const handleCalculateDepreciation = () => {
    setShowCalculateModal(true);
  };

  const handleProcessDepreciation = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Depreciación calculada y registrada correctamente');
    setShowCalculateModal(false);
  };

  const handleViewDetails = (depreciationId: string) => {
    alert(`Mostrando detalles de la depreciación ${depreciationId}`);
  };

  const handleReverseDepreciation = (depreciationId: string) => {
    if (confirm('¿Está seguro de que desea reversar esta depreciación?')) {
      alert('Depreciación reversada correctamente');
    }
  };

  const exportToPDF = () => {
    // Crear contenido del PDF
    const filteredData = filteredDepreciations;

    // Función auxiliar para formatear moneda
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP'
      }).format(amount);
    };

    // Generar contenido HTML para el PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Depreciación de Activos Fijos</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 18px; font-weight: bold; color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .currency { text-align: right; }
          .negative { color: #dc2626; }
          .positive { color: #059669; }
          .status-calculado { color: #059669; font-weight: bold; }
          .status-pendiente { color: #d97706; font-weight: bold; }
          .status-reversado { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Depreciación de Activos Fijos</h1>
          <p>Reporte generado el ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}</p>
        </div>
        
        <div class="summary">
          <h3>Resumen de Depreciaciones</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Depreciación del Mes</div>
              <div class="summary-value">${formatCurrency(totalDepreciationMonth)}</div>
            </div>
            <div class="summary-item">
              <div>Depreciación Acumulada</div>
              <div class="summary-value">${formatCurrency(totalAccumulated)}</div>
            </div>
            <div class="summary-item">
              <div>Valor Remanente</div>
              <div class="summary-value">${formatCurrency(totalRemainingValue)}</div>
            </div>
            <div class="summary-item">
              <div>Activos Depreciados</div>
              <div class="summary-value">${filteredData.length}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Activo</th>
              <th>Categoría</th>
              <th>Costo Adquisición</th>
              <th>Depreciación Mensual</th>
              <th>Depreciación Acumulada</th>
              <th>Valor Remanente</th>
              <th>Período</th>
              <th>Método</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(dep => `
              <tr>
                <td>${dep.assetCode}</td>
                <td>${dep.assetName}</td>
                <td>${dep.category}</td>
                <td class="currency">${formatCurrency(dep.acquisitionCost)}</td>
                <td class="currency negative">-${formatCurrency(dep.monthlyDepreciation)}</td>
                <td class="currency negative">-${formatCurrency(dep.accumulatedDepreciation)}</td>
                <td class="currency positive">${formatCurrency(dep.remainingValue)}</td>
                <td>${dep.period}</td>
                <td>${dep.method}</td>
                <td class="status-${dep.status.toLowerCase()}">${dep.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Sistema de Gestión de Activos Fijos - Depreciaciones</p>
          <p>Filtros aplicados: ${searchTerm ? `Búsqueda: "${searchTerm}"` : ''} ${filterPeriod ? `Período: "${filterPeriod}"` : ''} ${filterStatus ? `Estado: "${filterStatus}"` : ''}</p>
        </div>
      </body>
      </html>
    `;

    // Crear y abrir ventana para imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
    }
  };

  const exportToExcel = () => {
    // Preparar datos para Excel
    const filteredData = filteredDepreciations;

    // Crear contenido CSV
    const headers = [
      'Código Activo',
      'Nombre del Activo',
      'Categoría',
      'Costo Adquisición',
      'Depreciación Mensual',
      'Depreciación Acumulada',
      'Valor Remanente',
      'Fecha Depreciación',
      'Período',
      'Método Depreciación',
      'Estado'
    ];

    const csvContent = [
      // Encabezados del resumen
      ['DEPRECIACIÓN DE ACTIVOS FIJOS'],
      [`Reporte generado: ${new Date().toLocaleDateString('es-DO')} ${new Date().toLocaleTimeString('es-DO')}`],
      [''],
      ['RESUMEN DE DEPRECIACIONES'],
      ['Depreciación del Mes', totalDepreciationMonth.toFixed(2)],
      ['Depreciación Acumulada Total', totalAccumulated.toFixed(2)],
      ['Valor Remanente Total', totalRemainingValue.toFixed(2)],
      ['Total de Activos', filteredData.length],
      [''],
      ['FILTROS APLICADOS'],
      ['Búsqueda', searchTerm || 'Ninguno'],
      ['Período', filterPeriod || 'Todos'],
      ['Estado', filterStatus || 'Todos'],
      [''],
      ['DETALLE DE DEPRECIACIONES'],
      headers,
      ...filteredData.map(dep => [
        dep.assetCode,
        dep.assetName,
        dep.category,
        dep.acquisitionCost.toFixed(2),
        dep.monthlyDepreciation.toFixed(2),
        dep.accumulatedDepreciation.toFixed(2),
        dep.remainingValue.toFixed(2),
        new Date(dep.depreciationDate).toLocaleDateString('es-DO'),
        dep.period,
        dep.method,
        dep.status
      ])
    ].map(row => row.join(',')).join('\n');

    // Crear y descargar el archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `depreciaciones_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/fixed-assets')}
              className="flex items-center text-blue-600 hover:text-blue-700 mb-2"
            >
              <i className="ri-arrow-left-line mr-1"></i>
              Volver a Activos Fijos
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Depreciación de Activos</h1>
            <p className="text-gray-600">Cálculo y registro de depreciaciones mensuales</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Exportar Excel
            </button>
            <button
              onClick={handleCalculateDepreciation}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-calculator-line mr-2"></i>
              Calcular Depreciación
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Depreciación del Mes</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalDepreciationMonth)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-calendar-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Depreciación Acumulada</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalAccumulated)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100">
                <i className="ri-line-chart-line text-xl text-red-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Remanente</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRemainingValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos Depreciados</p>
                <p className="text-2xl font-bold text-purple-600">{filteredDepreciations.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                <i className="ri-archive-line text-xl text-purple-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar por activo o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los períodos</option>
                {periods.map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="Calculado">Calculado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Reversado">Reversado</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterPeriod('');
                  setFilterStatus('');
                }}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Depreciation Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Depreciaciones Registradas ({filteredDepreciations.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo Adquisición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depreciación Mensual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depreciación Acumulada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Remanente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
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
                {filteredDepreciations.map((depreciation) => (
                  <tr key={depreciation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{depreciation.assetName}</div>
                        <div className="text-sm text-gray-500">{depreciation.assetCode} - {depreciation.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(depreciation.acquisitionCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      -{formatCurrency(depreciation.monthlyDepreciation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      -{formatCurrency(depreciation.accumulatedDepreciation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatCurrency(depreciation.remainingValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {depreciation.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        depreciation.status === 'Calculado' ? 'bg-green-100 text-green-800' :
                        depreciation.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {depreciation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(depreciation.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        {depreciation.status === 'Calculado' && (
                          <button
                            onClick={() => handleReverseDepreciation(depreciation.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reversar depreciación"
                          >
                            <i className="ri-arrow-go-back-line"></i>
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

        {/* Calculate Depreciation Modal */}
        {showCalculateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Calcular Depreciación Mensual
                </h3>
                <button
                  onClick={() => setShowCalculateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleProcessDepreciation} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Período de Depreciación *
                    </label>
                    <input
                      type="month"
                      required
                      defaultValue="2024-01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Proceso *
                    </label>
                    <input
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categorías a Incluir
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm">Edificios y Construcciones</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm">Maquinaria y Equipo</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm">Vehículos</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm">Mobiliario y Equipo de Oficina</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm">Equipo de Computación</span>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Resumen del Cálculo</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Activos a depreciar: 5</p>
                    <p>• Depreciación total estimada: {formatCurrency(11896)}</p>
                    <p>• Período: Enero 2024</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCalculateModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Procesar Depreciación
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}