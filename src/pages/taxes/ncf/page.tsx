import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { taxService } from '../../../services/database';

interface NcfSeries {
  id?: string;
  document_type: string;
  series_prefix: string;
  current_number: number;
  start_number: number;
  end_number: number;
  status: string;
  expiration_date: string;
}

export default function NcfManagementPage() {
  const navigate = useNavigate();
  const [series, setSeries] = useState<NcfSeries[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<NcfSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NcfSeries>({
    document_type: 'B01',
    series_prefix: '',
    current_number: 1,
    start_number: 1,
    end_number: 1000,
    status: 'active',
    expiration_date: ''
  });

  const documentTypes = [
    { value: 'B01', label: 'B01 - Crédito Fiscal' },
    { value: 'B02', label: 'B02 - Consumidor Final' },
    { value: 'B03', label: 'B03 - Nota de Débito' },
    { value: 'B04', label: 'B04 - Nota de Crédito' },
    { value: 'B11', label: 'B11 - Proveedores Informales' },
    { value: 'B12', label: 'B12 - Registro Único de Ingresos' },
    { value: 'B13', label: 'B13 - Gastos Menores' },
    { value: 'B14', label: 'B14 - Régimen Especial' },
    { value: 'B15', label: 'B15 - Gubernamental' },
    { value: 'B16', label: 'B16 - Exportaciones' }
  ];

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      const data = await taxService.getNcfSeries();
      setSeries(data);
    } catch (error) {
      console.error('Error loading NCF series:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingSeries?.id) {
        await taxService.updateNcfSeries(editingSeries.id, formData);
      } else {
        await taxService.createNcfSeries(formData);
      }
      
      await loadSeries();
      setShowModal(false);
      setEditingSeries(null);
      resetForm();
    } catch (error) {
      console.error('Error saving NCF series:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (seriesItem: NcfSeries) => {
    setEditingSeries(seriesItem);
    setFormData(seriesItem);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta serie NCF?')) {
      try {
        await taxService.deleteNcfSeries(id);
        await loadSeries();
      } catch (error) {
        console.error('Error deleting NCF series:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      document_type: 'B01',
      series_prefix: '',
      current_number: 1,
      start_number: 1,
      end_number: 1000,
      status: 'active',
      expiration_date: ''
    });
  };

  const getRemainingNumbers = (seriesItem: NcfSeries) => {
    return seriesItem.end_number - seriesItem.current_number + 1;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión NCF/E-CF</h1>
            <p className="text-gray-600">Administrar series de comprobantes fiscales</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                resetForm();
                setEditingSeries(null);
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Serie
            </button>
            <button
              onClick={() => navigate('/taxes')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Volver
            </button>
          </div>
        </div>

        {/* Series List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Series NCF Activas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rango
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restantes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {series.map((seriesItem) => (
                  <tr key={seriesItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {documentTypes.find(t => t.value === seriesItem.document_type)?.label || seriesItem.document_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seriesItem.series_prefix}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seriesItem.current_number.toString().padStart(8, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seriesItem.start_number} - {seriesItem.end_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getRemainingNumbers(seriesItem)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(seriesItem.status)}`}>
                        {seriesItem.status === 'active' ? 'Activa' : 
                         seriesItem.status === 'inactive' ? 'Inactiva' : 'Vencida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seriesItem.expiration_date ? new Date(seriesItem.expiration_date).toLocaleDateString('es-DO') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(seriesItem)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => seriesItem.id && handleDelete(seriesItem.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {series.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No hay series NCF configuradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingSeries ? 'Editar Serie NCF' : 'Nueva Serie NCF'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, document_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {documentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prefijo de Serie
                  </label>
                  <input
                    type="text"
                    value={formData.series_prefix}
                    onChange={(e) => setFormData(prev => ({ ...prev, series_prefix: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: B0100000001"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número Inicial
                    </label>
                    <input
                      type="number"
                      value={formData.start_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_number: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número Final
                    </label>
                    <input
                      type="number"
                      value={formData.end_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_number: parseInt(e.target.value) || 1000 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiration_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                    <option value="expired">Vencida</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
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