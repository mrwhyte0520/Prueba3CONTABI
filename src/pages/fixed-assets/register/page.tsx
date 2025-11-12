import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface Asset {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  acquisitionDate: string;
  acquisitionCost: number;
  usefulLife: number;
  depreciationMethod: string;
  currentValue: number;
  accumulatedDepreciation: number;
  status: string;
  supplier: string;
  description: string;
}

export default function AssetRegisterPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [assets] = useState<Asset[]>([
    {
      id: '1',
      code: 'ACT-001',
      name: 'Edificio Principal',
      category: 'Edificios y Construcciones',
      location: 'Sede Central',
      acquisitionDate: '2020-01-15',
      acquisitionCost: 4200000,
      usefulLife: 50,
      depreciationMethod: 'Línea Recta',
      currentValue: 3780000,
      accumulatedDepreciation: 420000,
      status: 'Activo',
      supplier: 'Constructora ABC',
      description: 'Edificio principal de oficinas administrativas'
    },
    {
      id: '2',
      code: 'ACT-045',
      name: 'Maquinaria Industrial A',
      category: 'Maquinaria y Equipo',
      location: 'Planta de Producción',
      acquisitionDate: '2021-03-10',
      acquisitionCost: 280000,
      usefulLife: 10,
      depreciationMethod: 'Línea Recta',
      currentValue: 210000,
      accumulatedDepreciation: 70000,
      status: 'Activo',
      supplier: 'Equipos Industriales SA',
      description: 'Maquinaria para proceso de producción principal'
    },
    {
      id: '3',
      code: 'ACT-123',
      name: 'Vehículo Toyota Hilux',
      category: 'Vehículos',
      location: 'Flota Empresarial',
      acquisitionDate: '2022-06-20',
      acquisitionCost: 85000,
      usefulLife: 5,
      depreciationMethod: 'Línea Recta',
      currentValue: 68000,
      accumulatedDepreciation: 17000,
      status: 'Activo',
      supplier: 'Toyota Dominicana',
      description: 'Vehículo para transporte ejecutivo'
    },
    {
      id: '4',
      code: 'ACT-089',
      name: 'Servidor Dell PowerEdge',
      category: 'Equipo de Computación',
      location: 'Centro de Datos',
      acquisitionDate: '2023-01-15',
      acquisitionCost: 45000,
      usefulLife: 4,
      depreciationMethod: 'Línea Recta',
      currentValue: 33750,
      accumulatedDepreciation: 11250,
      status: 'Activo',
      supplier: 'Dell Technologies',
      description: 'Servidor principal para aplicaciones empresariales'
    },
    {
      id: '5',
      code: 'ACT-156',
      name: 'Mobiliario de Oficina',
      category: 'Mobiliario y Equipo de Oficina',
      location: 'Oficinas Administrativas',
      acquisitionDate: '2023-08-10',
      acquisitionCost: 25000,
      usefulLife: 10,
      depreciationMethod: 'Línea Recta',
      currentValue: 23750,
      accumulatedDepreciation: 1250,
      status: 'Activo',
      supplier: 'Muebles Modernos',
      description: 'Conjunto de escritorios y sillas ejecutivas'
    }
  ]);

  const categories = [
    'Edificios y Construcciones',
    'Maquinaria y Equipo',
    'Vehículos',
    'Mobiliario y Equipo de Oficina',
    'Equipo de Computación'
  ];

  const depreciationMethods = [
    'Línea Recta',
    'Saldo Decreciente',
    'Suma de Dígitos',
    'Unidades de Producción'
  ];

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || asset.category === filterCategory;
    const matchesStatus = !filterStatus || asset.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAddAsset = () => {
    setEditingAsset(null);
    setShowModal(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleDeleteAsset = (assetId: string) => {
    if (confirm('¿Está seguro de que desea eliminar este activo?')) {
      alert('Activo eliminado correctamente');
    }
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    alert(editingAsset ? 'Activo actualizado correctamente' : 'Activo registrado correctamente');
    setShowModal(false);
  };

  const exportToPDF = () => {
    // Crear contenido del PDF
    const filteredData = filteredAssets;
    const totalAssets = filteredData.length;
    const totalCost = filteredData.reduce((sum, asset) => sum + asset.acquisitionCost, 0);
    const totalCurrentValue = filteredData.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalDepreciation = filteredData.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0);

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
        <title>Registro de Activos Fijos</title>
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
          .status-active { color: #059669; font-weight: bold; }
          .status-inactive { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Registro de Activos Fijos</h1>
          <p>Reporte generado el ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}</p>
        </div>
        
        <div class="summary">
          <h3>Resumen Ejecutivo</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Total de Activos</div>
              <div class="summary-value">${totalAssets}</div>
            </div>
            <div class="summary-item">
              <div>Costo Total de Adquisición</div>
              <div class="summary-value">${formatCurrency(totalCost)}</div>
            </div>
            <div class="summary-item">
              <div>Valor Actual Total</div>
              <div class="summary-value">${formatCurrency(totalCurrentValue)}</div>
            </div>
            <div class="summary-item">
              <div>Depreciación Acumulada</div>
              <div class="summary-value">${formatCurrency(totalDepreciation)}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre del Activo</th>
              <th>Categoría</th>
              <th>Ubicación</th>
              <th>Fecha Adquisición</th>
              <th>Costo Adquisición</th>
              <th>Valor Actual</th>
              <th>Depreciación Acumulada</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(asset => `
              <tr>
                <td>${asset.code}</td>
                <td>${asset.name}</td>
                <td>${asset.category}</td>
                <td>${asset.location}</td>
                <td>${new Date(asset.acquisitionDate).toLocaleDateString('es-DO')}</td>
                <td class="currency">${formatCurrency(asset.acquisitionCost)}</td>
                <td class="currency">${formatCurrency(asset.currentValue)}</td>
                <td class="currency">${formatCurrency(asset.accumulatedDepreciation)}</td>
                <td class="${asset.status === 'Activo' ? 'status-active' : 'status-inactive'}">${asset.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Sistema de Gestión de Activos Fijos - Reporte generado automáticamente</p>
          <p>Filtros aplicados: ${searchTerm ? `Búsqueda: "${searchTerm}"` : ''} ${filterCategory ? `Categoría: "${filterCategory}"` : ''} ${filterStatus ? `Estado: "${filterStatus}"` : ''}</p>
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
    const filteredData = filteredAssets;
    const totalAssets = filteredData.length;
    const totalCost = filteredData.reduce((sum, asset) => sum + asset.acquisitionCost, 0);
    const totalCurrentValue = filteredData.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalDepreciation = filteredData.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0);

    // Crear contenido CSV
    const headers = [
      'Código',
      'Nombre del Activo',
      'Categoría',
      'Ubicación',
      'Fecha Adquisición',
      'Costo Adquisición',
      'Vida Útil (años)',
      'Método Depreciación',
      'Valor Actual',
      'Depreciación Acumulada',
      'Estado',
      'Proveedor',
      'Descripción'
    ];

    const csvContent = [
      // Encabezados del resumen
      ['REGISTRO DE ACTIVOS FIJOS'],
      [`Reporte generado: ${new Date().toLocaleDateString('es-DO')} ${new Date().toLocaleTimeString('es-DO')}`],
      [''],
      ['RESUMEN EJECUTIVO'],
      ['Total de Activos', totalAssets],
      ['Costo Total de Adquisición', totalCost.toFixed(2)],
      ['Valor Actual Total', totalCurrentValue.toFixed(2)],
      ['Depreciación Acumulada Total', totalDepreciation.toFixed(2)],
      [''],
      ['FILTROS APLICADOS'],
      ['Búsqueda', searchTerm || 'Ninguno'],
      ['Categoría', filterCategory || 'Todas'],
      ['Estado', filterStatus || 'Todos'],
      [''],
      ['DETALLE DE ACTIVOS'],
      headers,
      ...filteredData.map(asset => [
        asset.code,
        asset.name,
        asset.category,
        asset.location,
        new Date(asset.acquisitionDate).toLocaleDateString('es-DO'),
        asset.acquisitionCost.toFixed(2),
        asset.usefulLife,
        asset.depreciationMethod,
        asset.currentValue.toFixed(2),
        asset.accumulatedDepreciation.toFixed(2),
        asset.status,
        asset.supplier,
        asset.description
      ])
    ].map(row => row.join(',')).join('\n');

    // Crear y descargar el archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registro_activos_${new Date().toISOString().split('T')[0]}.csv`);
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
            <h1 className="text-2xl font-bold text-gray-900">Registro de Activos</h1>
            <p className="text-gray-600">Gestión y mantenimiento de activos fijos</p>
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
              onClick={handleAddAsset}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nuevo Activo
            </button>
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
                  placeholder="Buscar por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
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
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="En Mantenimiento">En Mantenimiento</option>
                <option value="Dado de Baja">Dado de Baja</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setFilterStatus('');
                }}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Activos Registrados ({filteredAssets.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo Adquisición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Actual
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
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {asset.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                        <div className="text-sm text-gray-500">{asset.location}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(asset.acquisitionCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(asset.currentValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        asset.status === 'Activo' ? 'bg-green-100 text-green-800' :
                        asset.status === 'Inactivo' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditAsset(asset)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-red-600 hover:text-red-900"
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

        {/* Asset Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingAsset ? 'Editar Activo' : 'Nuevo Activo'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSaveAsset} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código del Activo *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingAsset?.code || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ACT-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Activo *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingAsset?.name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del activo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría *
                    </label>
                    <select
                      required
                      defaultValue={editingAsset?.category || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      defaultValue={editingAsset?.location || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ubicación del activo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Adquisición *
                    </label>
                    <input
                      type="date"
                      required
                      defaultValue={editingAsset?.acquisitionDate || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Costo de Adquisición *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      defaultValue={editingAsset?.acquisitionCost || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vida Útil (años) *
                    </label>
                    <input
                      type="number"
                      required
                      defaultValue={editingAsset?.usefulLife || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Depreciación *
                    </label>
                    <select
                      required
                      defaultValue={editingAsset?.depreciationMethod || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar método</option>
                      {depreciationMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proveedor
                    </label>
                    <input
                      type="text"
                      defaultValue={editingAsset?.supplier || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      defaultValue={editingAsset?.status || 'Activo'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="En Mantenimiento">En Mantenimiento</option>
                      <option value="Dado de Baja">Dado de Baja</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={editingAsset?.description || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción detallada del activo"
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
                    {editingAsset ? 'Actualizar' : 'Registrar'} Activo
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