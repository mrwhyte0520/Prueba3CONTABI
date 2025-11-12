import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface Revaluation {
  id: string;
  assetCode: string;
  assetName: string;
  category: string;
  originalValue: number;
  previousValue: number;
  newValue: number;
  revaluationAmount: number;
  revaluationDate: string;
  reason: string;
  method: string;
  appraiser: string;
  status: string;
  approvedBy: string;
  notes: string;
}

export default function RevaluationPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingRevaluation, setEditingRevaluation] = useState<Revaluation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReason, setFilterReason] = useState('');

  const [revaluations] = useState<Revaluation[]>([
    {
      id: '1',
      assetCode: 'ACT-001',
      assetName: 'Edificio Principal',
      category: 'Edificios y Construcciones',
      originalValue: 4200000,
      previousValue: 3780000,
      newValue: 4500000,
      revaluationAmount: 720000,
      revaluationDate: '2024-01-15',
      reason: 'Incremento del Mercado',
      method: 'Avalúo Profesional',
      appraiser: 'Avalúos Profesionales SA',
      status: 'Aprobado',
      approvedBy: 'Juan Pérez',
      notes: 'Revalorización por incremento en el valor del mercado inmobiliario'
    },
    {
      id: '2',
      assetCode: 'ACT-045',
      assetName: 'Maquinaria Industrial A',
      category: 'Maquinaria y Equipo',
      originalValue: 280000,
      previousValue: 140000,
      newValue: 180000,
      revaluationAmount: 40000,
      revaluationDate: '2023-12-10',
      reason: 'Mejoras y Actualizaciones',
      method: 'Costo de Reposición',
      appraiser: 'Técnicos Especializados',
      status: 'Aprobado',
      approvedBy: 'María González',
      notes: 'Revalorización por mejoras técnicas implementadas'
    },
    {
      id: '3',
      assetCode: 'ACT-089',
      assetName: 'Servidor Dell PowerEdge',
      category: 'Equipo de Computación',
      originalValue: 45000,
      previousValue: 33750,
      newValue: 28000,
      revaluationAmount: -5750,
      revaluationDate: '2023-11-20',
      reason: 'Obsolescencia Tecnológica',
      method: 'Valor de Mercado',
      appraiser: 'Evaluaciones IT',
      status: 'Pendiente',
      approvedBy: '',
      notes: 'Ajuste por obsolescencia tecnológica acelerada'
    },
    {
      id: '4',
      assetCode: 'ACT-156',
      assetName: 'Mobiliario de Oficina',
      category: 'Mobiliario y Equipo de Oficina',
      originalValue: 25000,
      previousValue: 23750,
      newValue: 27000,
      revaluationAmount: 3250,
      revaluationDate: '2024-01-05',
      reason: 'Incremento del Mercado',
      method: 'Avalúo Profesional',
      appraiser: 'Muebles y Avalúos',
      status: 'En Revisión',
      approvedBy: '',
      notes: 'Incremento por demanda en mobiliario de oficina'
    }
  ]);

  const revaluationReasons = [
    'Incremento del Mercado',
    'Mejoras y Actualizaciones',
    'Obsolescencia Tecnológica',
    'Deterioro Físico',
    'Cambios Regulatorios',
    'Ajuste por Inflación'
  ];

  const revaluationMethods = [
    'Avalúo Profesional',
    'Valor de Mercado',
    'Costo de Reposición',
    'Valor Presente Neto',
    'Comparación de Ventas'
  ];

  const filteredRevaluations = revaluations.filter(rev => {
    const matchesSearch = rev.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rev.assetCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || rev.status === filterStatus;
    const matchesReason = !filterReason || rev.reason === filterReason;
    
    return matchesSearch && matchesStatus && matchesReason;
  });

  const totalRevaluationAmount = filteredRevaluations.reduce((sum, rev) => sum + rev.revaluationAmount, 0);
  const positiveRevaluations = filteredRevaluations.filter(rev => rev.revaluationAmount > 0);
  const negativeRevaluations = filteredRevaluations.filter(rev => rev.revaluationAmount < 0);

  const handleAddRevaluation = () => {
    setEditingRevaluation(null);
    setShowModal(true);
  };

  const handleEditRevaluation = (revaluation: Revaluation) => {
    setEditingRevaluation(revaluation);
    setShowModal(true);
  };

  const handleDeleteRevaluation = (revaluationId: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta revalorización?')) {
      alert('Revalorización eliminada correctamente');
    }
  };

  const handleApproveRevaluation = (revaluationId: string) => {
    if (confirm('¿Está seguro de que desea aprobar esta revalorización?')) {
      alert('Revalorización aprobada correctamente');
    }
  };

  const handleRejectRevaluation = (revaluationId: string) => {
    if (confirm('¿Está seguro de que desea rechazar esta revalorización?')) {
      alert('Revalorización rechazada');
    }
  };

  const handleSaveRevaluation = (e: React.FormEvent) => {
    e.preventDefault();
    alert(editingRevaluation ? 'Revalorización actualizada correctamente' : 'Revalorización registrada correctamente');
    setShowModal(false);
  };

  const exportToPDF = () => {
    // Crear contenido del PDF
    const filteredData = filteredRevaluations;

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
        <title>Revalorización de Activos Fijos</title>
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
          .status-aprobado { color: #059669; font-weight: bold; }
          .status-pendiente { color: #d97706; font-weight: bold; }
          .status-revision { color: #2563eb; font-weight: bold; }
          .status-rechazado { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Revalorización de Activos Fijos</h1>
          <p>Reporte generado el ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}</p>
        </div>
        
        <div class="summary">
          <h3>Resumen de Revalorizaciones</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Revalorización Total</div>
              <div class="summary-value ${totalRevaluationAmount >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalRevaluationAmount)}</div>
            </div>
            <div class="summary-item">
              <div>Incrementos</div>
              <div class="summary-value">${positiveRevaluations.length}</div>
            </div>
            <div class="summary-item">
              <div>Decrementos</div>
              <div class="summary-value">${negativeRevaluations.length}</div>
            </div>
            <div class="summary-item">
              <div>Total Revalorizaciones</div>
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
              <th>Valor Anterior</th>
              <th>Nuevo Valor</th>
              <th>Revalorización</th>
              <th>Motivo</th>
              <th>Método</th>
              <th>Evaluador</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(rev => `
              <tr>
                <td>${rev.assetCode}</td>
                <td>${rev.assetName}</td>
                <td>${rev.category}</td>
                <td class="currency">${formatCurrency(rev.previousValue)}</td>
                <td class="currency">${formatCurrency(rev.newValue)}</td>
                <td class="currency ${rev.revaluationAmount >= 0 ? 'positive' : 'negative'}">
                  ${rev.revaluationAmount >= 0 ? '+' : ''}${formatCurrency(rev.revaluationAmount)}
                </td>
                <td>${rev.reason}</td>
                <td>${rev.method}</td>
                <td>${rev.appraiser}</td>
                <td>${new Date(rev.revaluationDate).toLocaleDateString('es-DO')}</td>
                <td class="status-${rev.status.toLowerCase().replace(' ', '')}">${rev.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Sistema de Gestión de Activos Fijos - Revalorizaciones</p>
          <p>Filtros aplicados: ${searchTerm ? `Búsqueda: "${searchTerm}"` : ''} ${filterStatus ? `Estado: "${filterStatus}"` : ''} ${filterReason ? `Motivo: "${filterReason}"` : ''}</p>
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
    const filteredData = filteredRevaluations;

    // Crear contenido CSV
    const headers = [
      'Código Activo',
      'Nombre del Activo',
      'Categoría',
      'Valor Original',
      'Valor Anterior',
      'Nuevo Valor',
      'Monto Revalorización',
      'Fecha Revalorización',
      'Motivo',
      'Método Evaluación',
      'Evaluador/Tasador',
      'Estado',
      'Aprobado Por',
      'Notas'
    ];

    const csvContent = [
      // Encabezados del resumen
      ['REVALORIZACIÓN DE ACTIVOS FIJOS'],
      [`Reporte generado: ${new Date().toLocaleDateString('es-DO')} ${new Date().toLocaleTimeString('es-DO')}`],
      [''],
      ['RESUMEN DE REVALORIZACIONES'],
      ['Revalorización Total', totalRevaluationAmount.toFixed(2)],
      ['Incrementos', positiveRevaluations.length],
      ['Decrementos', negativeRevaluations.length],
      ['Total de Revalorizaciones', filteredData.length],
      [''],
      ['FILTROS APLICADOS'],
      ['Búsqueda', searchTerm || 'Ninguno'],
      ['Estado', filterStatus || 'Todos'],
      ['Motivo', filterReason || 'Todos'],
      [''],
      ['DETALLE DE REVALORIZACIONES'],
      headers,
      ...filteredData.map(rev => [
        rev.assetCode,
        rev.assetName,
        rev.category,
        rev.originalValue.toFixed(2),
        rev.previousValue.toFixed(2),
        rev.newValue.toFixed(2),
        rev.revaluationAmount.toFixed(2),
        new Date(rev.revaluationDate).toLocaleDateString('es-DO'),
        rev.reason,
        rev.method,
        rev.appraiser,
        rev.status,
        rev.approvedBy,
        rev.notes
      ])
    ].map(row => row.join(',')).join('\n');

    // Crear y descargar el archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revalorizaciones_${new Date().toISOString().split('T')[0]}.csv`);
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
            <h1 className="text-2xl font-bold text-gray-900">Revalorización de Activos</h1>
            <p className="text-gray-600">Gestión de revalorizaciones y ajustes de valor</p>
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
              onClick={handleAddRevaluation}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Revalorización
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revalorización Total</p>
                <p className={`text-2xl font-bold ${totalRevaluationAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalRevaluationAmount)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-trending-up-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Incrementos</p>
                <p className="text-2xl font-bold text-green-600">{positiveRevaluations.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <i className="ri-arrow-up-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Decrementos</p>
                <p className="text-2xl font-bold text-red-600">{negativeRevaluations.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100">
                <i className="ri-arrow-down-line text-xl text-red-600"></i>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revalorizaciones</p>
                <p className="text-2xl font-bold text-purple-600">{filteredRevaluations.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100">
                <i className="ri-refresh-line text-xl text-purple-600"></i>
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
                <option value="En Revisión">En Revisión</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo
              </label>
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los motivos</option>
                {revaluationReasons.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                  setFilterReason('');
                }}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Revaluations Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Revalorizaciones Registradas ({filteredRevaluations.length})
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
                    Valor Anterior
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nuevo Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revalorización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
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
                {filteredRevaluations.map((revaluation) => (
                  <tr key={revaluation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{revaluation.assetName}</div>
                        <div className="text-sm text-gray-500">{revaluation.assetCode} - {revaluation.category}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(revaluation.previousValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(revaluation.newValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={revaluation.revaluationAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {revaluation.revaluationAmount >= 0 ? '+' : ''}{formatCurrency(revaluation.revaluationAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {revaluation.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(revaluation.revaluationDate).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        revaluation.status === 'Aprobado' ? 'bg-green-100 text-green-800' :
                        revaluation.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        revaluation.status === 'En Revisión' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {revaluation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditRevaluation(revaluation)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        {revaluation.status === 'Pendiente' && (
                          <>
                            <button
                              onClick={() => handleApproveRevaluation(revaluation.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Aprobar"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button
                              onClick={() => handleRejectRevaluation(revaluation.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Rechazar"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteRevaluation(revaluation.id)}
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

        {/* Revaluation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingRevaluation ? 'Editar Revalorización' : 'Nueva Revalorización'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSaveRevaluation} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código del Activo *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingRevaluation?.assetCode || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ACT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Anterior *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      defaultValue={editingRevaluation?.previousValue || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nuevo Valor *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      defaultValue={editingRevaluation?.newValue || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Revalorización *
                    </label>
                    <input
                      type="date"
                      required
                      defaultValue={editingRevaluation?.revaluationDate || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo de Revalorización *
                    </label>
                    <select
                      required
                      defaultValue={editingRevaluation?.reason || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar motivo</option>
                      {revaluationReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Evaluación *
                    </label>
                    <select
                      required
                      defaultValue={editingRevaluation?.method || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar método</option>
                      {revaluationMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evaluador/Tasador
                    </label>
                    <input
                      type="text"
                      defaultValue={editingRevaluation?.appraiser || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del evaluador"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      defaultValue={editingRevaluation?.status || 'Pendiente'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Revisión">En Revisión</option>
                      <option value="Aprobado">Aprobado</option>
                      <option value="Rechazado">Rechazado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas y Observaciones
                  </label>
                  <textarea
                    rows={4}
                    defaultValue={editingRevaluation?.notes || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Detalles adicionales sobre la revalorización"
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
                    {editingRevaluation ? 'Actualizar' : 'Registrar'} Revalorización
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