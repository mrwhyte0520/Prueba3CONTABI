import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface AssetDisposal {
  id: string;
  assetCode: string;
  assetName: string;
  category: string;
  originalCost: number;
  accumulatedDepreciation: number;
  bookValue: number;
  disposalDate: string;
  disposalMethod: string;
  disposalReason: string;
  salePrice: number;
  gainLoss: number;
  authorizedBy: string;
  status: string;
  notes: string;
  buyer: string;
}

export default function AssetDisposalPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingDisposal, setEditingDisposal] = useState<AssetDisposal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  const [disposals] = useState<AssetDisposal[]>([
    {
      id: '1',
      assetCode: 'ACT-078',
      assetName: 'Computadora Dell Optiplex',
      category: 'Equipo de Computación',
      originalCost: 35000,
      accumulatedDepreciation: 32000,
      bookValue: 3000,
      disposalDate: '2024-01-15',
      disposalMethod: 'Venta',
      disposalReason: 'Obsolescencia Tecnológica',
      salePrice: 5000,
      gainLoss: 2000,
      authorizedBy: 'Juan Pérez',
      status: 'Completado',
      notes: 'Venta a empleado por actualización tecnológica',
      buyer: 'Carlos Martínez'
    },
    {
      id: '2',
      assetCode: 'ACT-134',
      assetName: 'Vehículo Nissan Sentra 2015',
      category: 'Vehículos',
      originalCost: 450000,
      accumulatedDepreciation: 400000,
      bookValue: 50000,
      disposalDate: '2023-12-20',
      disposalMethod: 'Venta',
      disposalReason: 'Fin de Vida Útil',
      salePrice: 75000,
      gainLoss: 25000,
      authorizedBy: 'María González',
      status: 'Completado',
      notes: 'Venta por alto kilometraje y costos de mantenimiento',
      buyer: 'AutoUsados SA'
    },
    {
      id: '3',
      assetCode: 'ACT-089',
      assetName: 'Maquinaria Antigua',
      category: 'Maquinaria y Equipo',
      originalCost: 180000,
      accumulatedDepreciation: 180000,
      bookValue: 0,
      disposalDate: '2024-01-10',
      disposalMethod: 'Desecho',
      disposalReason: 'Daño Irreparable',
      salePrice: 0,
      gainLoss: 0,
      authorizedBy: 'Pedro Rodríguez',
      status: 'Completado',
      notes: 'Equipo dañado sin posibilidad de reparación',
      buyer: ''
    },
    {
      id: '4',
      assetCode: 'ACT-201',
      assetName: 'Mobiliario de Oficina Antiguo',
      category: 'Mobiliario y Equipo de Oficina',
      originalCost: 15000,
      accumulatedDepreciation: 12000,
      bookValue: 3000,
      disposalDate: '2024-02-01',
      disposalMethod: 'Donación',
      disposalReason: 'Renovación de Oficinas',
      salePrice: 0,
      gainLoss: -3000,
      authorizedBy: 'Ana López',
      status: 'Pendiente',
      notes: 'Donación a institución educativa',
      buyer: 'Escuela Primaria San José'
    }
  ]);

  const disposalMethods = [
    'Venta',
    'Donación',
    'Desecho',
    'Intercambio',
    'Transferencia'
  ];

  const disposalReasons = [
    'Obsolescencia Tecnológica',
    'Fin de Vida Útil',
    'Daño Irreparable',
    'Renovación de Equipos',
    'Falta de Uso',
    'Cambio de Operaciones'
  ];

  const filteredDisposals = disposals.filter(disposal => {
    const matchesSearch = disposal.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disposal.assetCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || disposal.status === filterStatus;
    const matchesMethod = !filterMethod || disposal.disposalMethod === filterMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalGainLoss = filteredDisposals.reduce((sum, disposal) => sum + disposal.gainLoss, 0);
  const totalSaleValue = filteredDisposals.reduce((sum, disposal) => sum + disposal.salePrice, 0);
  const totalBookValue = filteredDisposals.reduce((sum, disposal) => sum + disposal.bookValue, 0);

  const handleAddDisposal = () => {
    setEditingDisposal(null);
    setShowModal(true);
  };

  const handleEditDisposal = (disposal: AssetDisposal) => {
    setEditingDisposal(disposal);
    setShowModal(true);
  };

  const handleDeleteDisposal = (disposalId: string) => {
    if (confirm('¿Está seguro de que desea eliminar este registro de baja?')) {
      alert('Registro de baja eliminado correctamente');
    }
  };

  const handleApproveDisposal = (disposalId: string) => {
    if (confirm('¿Está seguro de que desea aprobar esta baja de activo?')) {
      alert('Baja de activo aprobada correctamente');
    }
  };

  const handleSaveDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    alert(editingDisposal ? 'Baja de activo actualizada correctamente' : 'Baja de activo registrada correctamente');
    setShowModal(false);
  };

  const exportToPDF = () => {
    // Crear contenido del PDF
    const filteredData = filteredDisposals;

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
        <title>Retiro de Activos Fijos</title>
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
          .positive { color: #059669; font-weight: bold; }
          .negative { color: #dc2626; font-weight: bold; }
          .status-completado { color: #059669; font-weight: bold; }
          .status-pendiente { color: #d97706; font-weight: bold; }
          .status-proceso { color: #2563eb; font-weight: bold; }
          .status-cancelado { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Retiro de Activos Fijos</h1>
          <p>Reporte generado el ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}</p>
        </div>
        
        <div class="summary">
          <h3>Resumen de Bajas de Activos</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Ganancia/Pérdida Total</div>
              <div class="summary-value ${totalGainLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalGainLoss)}</div>
            </div>
            <div class="summary-item">
              <div>Valor de Venta Total</div>
              <div class="summary-value">${formatCurrency(totalSaleValue)}</div>
            </div>
            <div class="summary-item">
              <div>Valor en Libros</div>
              <div class="summary-value">${formatCurrency(totalBookValue)}</div>
            </div>
            <div class="summary-item">
              <div>Activos Dados de Baja</div>
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
              <th>Costo Original</th>
              <th>Depreciación Acumulada</th>
              <th>Valor en Libros</th>
              <th>Precio de Venta</th>
              <th>Ganancia/Pérdida</th>
              <th>Método</th>
              <th>Motivo</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(disposal => `
              <tr>
                <td>${disposal.assetCode}</td>
                <td>${disposal.assetName}</td>
                <td>${disposal.category}</td>
                <td class="currency">${formatCurrency(disposal.originalCost)}</td>
                <td class="currency">${formatCurrency(disposal.accumulatedDepreciation)}</td>
                <td class="currency">${formatCurrency(disposal.bookValue)}</td>
                <td class="currency">${formatCurrency(disposal.salePrice)}</td>
                <td class="currency ${disposal.gainLoss >= 0 ? 'positive' : 'negative'}">
                  ${disposal.gainLoss >= 0 ? '+' : ''}${formatCurrency(disposal.gainLoss)}
                </td>
                <td>${disposal.disposalMethod}</td>
                <td>${disposal.disposalReason}</td>
                <td>${new Date(disposal.disposalDate).toLocaleDateString('es-DO')}</td>
                <td class="status-${disposal.status.toLowerCase().replace(' ', '')}">${disposal.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Sistema de Gestión de Activos Fijos - Retiro de Activos</p>
          <p>Filtros aplicados: ${searchTerm ? `Búsqueda: "${searchTerm}"` : ''} ${filterStatus ? `Estado: "${filterStatus}"` : ''} ${filterMethod ? `Método: "${filterMethod}"` : ''}</p>
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
    const filteredData = filteredDisposals;

    // Crear contenido CSV
    const headers = [
      'Código Activo',
      'Nombre del Activo',
      'Categoría',
      'Costo Original',
      'Depreciación Acumulada',
      'Valor en Libros',
      'Fecha de Disposición',
      'Método de Disposición',
      'Motivo de Disposición',
      'Precio de Venta',
      'Ganancia/Pérdida',
      'Comprador/Receptor',
      'Autorizado Por',
      'Estado',
      'Notas'
    ];

    const csvContent = [
      // Encabezados del resumen
      ['RETIRO DE ACTIVOS FIJOS'],
      [`Reporte generado: ${new Date().toLocaleDateString('es-DO')} ${new Date().toLocaleTimeString('es-DO')}`],
      [''],
      ['RESUMEN DE BAJAS DE ACTIVOS'],
      ['Ganancia/Pérdida Total', totalGainLoss.toFixed(2)],
      ['Valor de Venta Total', totalSaleValue.toFixed(2)],
      ['Valor en Libros Total', totalBookValue.toFixed(2)],
      ['Total de Activos Dados de Baja', filteredData.length],
      [''],
      ['FILTROS APLICADOS'],
      ['Búsqueda', searchTerm || 'Ninguno'],
      ['Estado', filterStatus || 'Todos'],
      ['Método de Disposición', filterMethod || 'Todos'],
      [''],
      ['DETALLE DE BAJAS DE ACTIVOS'],
      headers,
      ...filteredData.map(disposal => [
        disposal.assetCode,
        disposal.assetName,
        disposal.category,
        disposal.originalCost.toFixed(2),
        disposal.accumulatedDepreciation.toFixed(2),
        disposal.bookValue.toFixed(2),
        new Date(disposal.disposalDate).toLocaleDateString('es-DO'),
        disposal.disposalMethod,
        disposal.disposalReason,
        disposal.salePrice.toFixed(2),
        disposal.gainLoss.toFixed(2),
        disposal.buyer,
        disposal.authorizedBy,
        disposal.status,
        disposal.notes
      ])
    ].map(row => row.join(',')).join('\n');

    // Crear y descargar el archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `retiro_activos_${new Date().toISOString().split('T')[0]}.csv`);
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
            <h1 className="text-2xl font-bold text-gray-900">Retiro de Activos</h1>
            <p className="text-gray-600">Gestión de bajas y disposición de activos fijos</p>
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
              onClick={handleAddDisposal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Baja
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ganancia/Pérdida Total</p>
                <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalGainLoss)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-exchange-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor de Venta Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSaleValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor en Libros</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalBookValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100">
                <i className="ri-book-line text-xl text-orange-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos Dados de Baja</p>
                <p className="text-2xl font-bold text-purple-600">{filteredDisposals.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                <i className="ri-delete-bin-line text-xl text-purple-600"></i>
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
                Estado
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Completado">Completado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Disposición
              </label>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los métodos</option>
                {disposalMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                  setFilterMethod('');
                }}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Disposals Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Bajas de Activos Registradas ({filteredDisposals.length})
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
                    Valor en Libros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio de Venta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ganancia/Pérdida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
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
                {filteredDisposals.map((disposal) => (
                  <tr key={disposal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{disposal.assetName}</div>
                        <div className="text-sm text-gray-500">{disposal.assetCode} - {disposal.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(disposal.bookValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(disposal.salePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={disposal.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {disposal.gainLoss >= 0 ? '+' : ''}{formatCurrency(disposal.gainLoss)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disposal.disposalMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(disposal.disposalDate).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        disposal.status === 'Completado' ? 'bg-green-100 text-green-800' :
                        disposal.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        disposal.status === 'En Proceso' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {disposal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditDisposal(disposal)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        {disposal.status === 'Pendiente' && (
                          <button
                            onClick={() => handleApproveDisposal(disposal.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Aprobar"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDisposal(disposal.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disposal Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingDisposal ? 'Editar Baja de Activo' : 'Nueva Baja de Activo'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSaveDisposal} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código del Activo *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingDisposal?.assetCode || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ACT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor en Libros *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      defaultValue={editingDisposal?.bookValue || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio de Venta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={editingDisposal?.salePrice || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Disposición *
                    </label>
                    <input
                      type="date"
                      required
                      defaultValue={editingDisposal?.disposalDate || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Disposición *
                    </label>
                    <select
                      required
                      defaultValue={editingDisposal?.disposalMethod || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar método</option>
                      {disposalMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo de Disposición *
                    </label>
                    <select
                      required
                      defaultValue={editingDisposal?.disposalReason || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar motivo</option>
                      {disposalReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comprador/Receptor
                    </label>
                    <input
                      type="text"
                      defaultValue={editingDisposal?.buyer || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del comprador o receptor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Autorizado por *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingDisposal?.authorizedBy || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del autorizador"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas y Observaciones
                  </label>
                  <textarea
                    rows={4}
                    defaultValue={editingDisposal?.notes || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Detalles adicionales sobre la disposición del activo"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    {editingDisposal ? 'Actualizar' : 'Registrar'} Baja
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