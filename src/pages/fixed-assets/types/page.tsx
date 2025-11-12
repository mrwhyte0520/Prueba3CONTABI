import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface AssetType {
  id: string;
  name: string;
  description: string;
  depreciationRate: number;
  usefulLife: number;
  depreciationMethod: string;
  account: string;
  depreciationAccount: string;
  accumulatedDepreciationAccount: string;
  isActive: boolean;
  createdAt: string;
}

export default function AssetTypesPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AssetType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [assetTypes] = useState<AssetType[]>([
    {
      id: '1',
      name: 'Edificios y Construcciones',
      description: 'Inmuebles, edificios, construcciones y mejoras',
      depreciationRate: 2,
      usefulLife: 50,
      depreciationMethod: 'Línea Recta',
      account: '1210 - Edificios',
      depreciationAccount: '5120 - Depreciación Edificios',
      accumulatedDepreciationAccount: '1211 - Depreciación Acumulada Edificios',
      isActive: true,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Maquinaria y Equipo',
      description: 'Maquinaria industrial, equipos de producción',
      depreciationRate: 10,
      usefulLife: 10,
      depreciationMethod: 'Línea Recta',
      account: '1220 - Maquinaria y Equipo',
      depreciationAccount: '5121 - Depreciación Maquinaria',
      accumulatedDepreciationAccount: '1221 - Depreciación Acumulada Maquinaria',
      isActive: true,
      createdAt: '2024-01-15'
    },
    {
      id: '3',
      name: 'Vehículos',
      description: 'Automóviles, camiones, motocicletas',
      depreciationRate: 20,
      usefulLife: 5,
      depreciationMethod: 'Línea Recta',
      account: '1230 - Vehículos',
      depreciationAccount: '5122 - Depreciación Vehículos',
      accumulatedDepreciationAccount: '1231 - Depreciación Acumulada Vehículos',
      isActive: true,
      createdAt: '2024-01-15'
    },
    {
      id: '4',
      name: 'Mobiliario y Equipo de Oficina',
      description: 'Muebles, escritorios, sillas, archivadores',
      depreciationRate: 10,
      usefulLife: 10,
      depreciationMethod: 'Línea Recta',
      account: '1240 - Mobiliario y Equipo de Oficina',
      depreciationAccount: '5123 - Depreciación Mobiliario',
      accumulatedDepreciationAccount: '1241 - Depreciación Acumulada Mobiliario',
      isActive: true,
      createdAt: '2024-01-15'
    },
    {
      id: '5',
      name: 'Equipo de Computación',
      description: 'Computadoras, servidores, equipos de red',
      depreciationRate: 25,
      usefulLife: 4,
      depreciationMethod: 'Línea Recta',
      account: '1250 - Equipo de Computación',
      depreciationAccount: '5124 - Depreciación Equipo Computación',
      accumulatedDepreciationAccount: '1251 - Depreciación Acumulada Equipo Computación',
      isActive: true,
      createdAt: '2024-01-15'
    },
    {
      id: '6',
      name: 'Herramientas y Equipos Menores',
      description: 'Herramientas, equipos menores de trabajo',
      depreciationRate: 33.33,
      usefulLife: 3,
      depreciationMethod: 'Línea Recta',
      account: '1260 - Herramientas',
      depreciationAccount: '5125 - Depreciación Herramientas',
      accumulatedDepreciationAccount: '1261 - Depreciación Acumulada Herramientas',
      isActive: false,
      createdAt: '2024-01-15'
    }
  ]);

  const depreciationMethods = [
    'Línea Recta',
    'Saldo Decreciente',
    'Suma de Dígitos',
    'Unidades de Producción'
  ];

  const filteredTypes = assetTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddType = () => {
    setEditingType(null);
    setShowModal(true);
  };

  const handleEditType = (type: AssetType) => {
    setEditingType(type);
    setShowModal(true);
  };

  const handleDeleteType = (typeId: string) => {
    if (confirm('¿Está seguro de que desea eliminar este tipo de activo?')) {
      alert('Tipo de activo eliminado correctamente');
    }
  };

  const handleToggleStatus = (typeId: string) => {
    alert('Estado del tipo de activo actualizado');
  };

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    alert(editingType ? 'Tipo de activo actualizado correctamente' : 'Tipo de activo creado correctamente');
    setShowModal(false);
  };

  const exportToPDF = () => {
    // Crear contenido del PDF
    const filteredData = filteredTypes;
    const totalTypes = filteredData.length;
    const activeTypes = filteredData.filter(type => type.isActive).length;
    const inactiveTypes = filteredData.filter(type => !type.isActive).length;
    const avgDepreciationRate = filteredData.length > 0 ? filteredData.reduce((sum, type) => sum + type.depreciationRate, 0) / filteredData.length : 0;

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
        <title>Tipos de Activos Fijos</title>
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
          .status-active { color: #059669; font-weight: bold; }
          .status-inactive { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Tipos de Activos Fijos</h1>
          <p>Reporte generado el ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}</p>
        </div>
        
        <div class="summary">
          <h3>Resumen de Configuración</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Total de Tipos</div>
              <div class="summary-value">${totalTypes}</div>
            </div>
            <div class="summary-item">
              <div>Tipos Activos</div>
              <div class="summary-value">${activeTypes}</div>
            </div>
            <div class="summary-item">
              <div>Tipos Inactivos</div>
              <div class="summary-value">${inactiveTypes}</div>
            </div>
            <div class="summary-item">
              <div>Tasa Promedio</div>
              <div class="summary-value">${avgDepreciationRate.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tipo de Activo</th>
              <th>Descripción</th>
              <th>Tasa Depreciación</th>
              <th>Vida Útil</th>
              <th>Método</th>
              <th>Cuenta Contable</th>
              <th>Cuenta Depreciación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(type => `
              <tr>
                <td>${type.name}</td>
                <td>${type.description}</td>
                <td>${type.depreciationRate}% anual</td>
                <td>${type.usefulLife} años</td>
                <td>${type.depreciationMethod}</td>
                <td>${type.account}</td>
                <td>${type.depreciationAccount}</td>
                <td class="${type.isActive ? 'status-active' : 'status-inactive'}">${type.isActive ? 'Activo' : 'Inactivo'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Sistema de Gestión de Activos Fijos - Configuración de Tipos</p>
          <p>Filtros aplicados: ${searchTerm ? `Búsqueda: "${searchTerm}"` : 'Ninguno'}</p>
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
    const filteredData = filteredTypes;
    const totalTypes = filteredData.length;
    const activeTypes = filteredData.filter(type => type.isActive).length;
    const inactiveTypes = filteredData.filter(type => !type.isActive).length;
    const avgDepreciationRate = filteredData.reduce((sum, type) => sum + type.depreciationRate, 0) / filteredData.length;

    // Crear contenido CSV
    const headers = [
      'Tipo de Activo',
      'Descripción',
      'Tasa Depreciación (%)',
      'Vida Útil (años)',
      'Método Depreciación',
      'Cuenta de Activo',
      'Cuenta de Depreciación',
      'Cuenta Depreciación Acumulada',
      'Estado',
      'Fecha Creación'
    ];

    const csvContent = [
      // Encabezados del resumen
      ['TIPOS DE ACTIVOS FIJOS'],
      [`Reporte generado: ${new Date().toLocaleDateString('es-DO')} ${new Date().toLocaleTimeString('es-DO')}`],
      [''],
      ['RESUMEN DE CONFIGURACIÓN'],
      ['Total de Tipos', totalTypes],
      ['Tipos Activos', activeTypes],
      ['Tipos Inactivos', inactiveTypes],
      ['Tasa Promedio de Depreciación', `${avgDepreciationRate.toFixed(2)}%`],
      [''],
      ['FILTROS APLICADOS'],
      ['Búsqueda', searchTerm || 'Ninguno'],
      [''],
      ['DETALLE DE TIPOS DE ACTIVOS'],
      headers,
      ...filteredData.map(type => [
        type.name,
        type.description,
        type.depreciationRate,
        type.usefulLife,
        type.depreciationMethod,
        type.account,
        type.depreciationAccount,
        type.accumulatedDepreciationAccount,
        type.isActive ? 'Activo' : 'Inactivo',
        new Date(type.createdAt).toLocaleDateString('es-DO')
      ])
    ].map(row => row.join(',')).join('\n');

    // Crear y descargar el archivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tipos_activos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Activos</h1>
            <p className="text-gray-600">Configuración de categorías y tipos de activos fijos</p>
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
              onClick={handleAddType}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nuevo Tipo
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Tipos de Activos
              </label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setSearchTerm('')}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors whitespace-nowrap"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Asset Types Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Tipos de Activos Configurados ({filteredTypes.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Activo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasa Depreciación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vida Útil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuenta Contable
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
                {filteredTypes.map((type) => (
                  <tr key={type.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.depreciationRate}% anual
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.usefulLife} años
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.depreciationMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type.account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(type.id)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer ${
                          type.isActive 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {type.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditType(type)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteType(type.id)}
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

        {/* Type Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingType ? 'Editar Tipo de Activo' : 'Nuevo Tipo de Activo'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSaveType} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Tipo *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingType?.name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Maquinaria y Equipo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tasa de Depreciación (%) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      max="100"
                      defaultValue={editingType?.depreciationRate || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vida Útil (años) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      defaultValue={editingType?.usefulLife || ''}
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
                      defaultValue={editingType?.depreciationMethod || ''}
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
                      Cuenta de Activo *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingType?.account || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1220 - Maquinaria y Equipo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cuenta de Depreciación *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingType?.depreciationAccount || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="5121 - Depreciación Maquinaria"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cuenta de Depreciación Acumulada *
                    </label>
                    <input
                      type="text"
                      required
                      defaultValue={editingType?.accumulatedDepreciationAccount || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1221 - Depreciación Acumulada Maquinaria"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={editingType?.description || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción detallada del tipo de activo"
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
                    {editingType ? 'Actualizar' : 'Crear'} Tipo
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