import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { salesRepTypesService } from '../../../services/database';

interface SalesRepType {
  id: string;
  name: string;
  description: string | null;
  default_commission_rate: number | null;
  max_discount_percent: number | null;
  is_active: boolean;
}

export default function SalesRepTypesPage() {
  const { user } = useAuth();
  const [types, setTypes] = useState<SalesRepType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<SalesRepType | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    default_commission_rate: '',
    max_discount_percent: '',
  });

  const loadTypes = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await salesRepTypesService.getAll(user.id);
      setTypes(data as SalesRepType[]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading sales rep types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTypes();
    }
  }, [user?.id]);

  const resetForm = () => {
    setForm({ name: '', description: '', default_commission_rate: '', max_discount_percent: '' });
    setEditingType(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (t: SalesRepType) => {
    setEditingType(t);
    setForm({
      name: t.name,
      description: t.description || '',
      default_commission_rate: t.default_commission_rate != null ? String(t.default_commission_rate) : '',
      max_discount_percent: t.max_discount_percent != null ? String(t.max_discount_percent) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!form.name.trim()) {
      alert('El nombre del tipo de vendedor es obligatorio');
      return;
    }

    const defaultCommission = form.default_commission_rate ? Number(form.default_commission_rate) : null;
    const maxDiscount = form.max_discount_percent ? Number(form.max_discount_percent) : null;

    try {
      if (editingType) {
        await salesRepTypesService.update(editingType.id, {
          name: form.name.trim(),
          description: form.description.trim() || '',
          default_commission_rate: defaultCommission,
          max_discount_percent: maxDiscount,
        });
      } else {
        await salesRepTypesService.create(user.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          default_commission_rate: defaultCommission ?? undefined,
          max_discount_percent: maxDiscount ?? undefined,
        });
      }

      await loadTypes();
      setShowModal(false);
      resetForm();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving sales rep type:', error);
      alert('Error al guardar el tipo de vendedor');
    }
  };

  const handleToggleActive = async (t: SalesRepType) => {
    try {
      await salesRepTypesService.update(t.id, { is_active: !t.is_active });
      await loadTypes();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating sales rep type status:', error);
      alert('Error al actualizar el estado del tipo de vendedor');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de Vendedor</h1>
            <p className="text-gray-600">Clasificación de vendedores y condiciones generales sugeridas</p>
          </div>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2" />
            Nuevo Tipo
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Listado de Tipos de Vendedor</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisión por defecto (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descuento máx. sugerido (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {types.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">{t.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t.default_commission_rate != null ? `${t.default_commission_rate}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t.max_discount_percent != null ? `${t.max_discount_percent}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {t.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(t)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Editar"
                        >
                          <i className="ri-edit-line" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(t)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title={t.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <i className={t.is_active ? 'ri-toggle-line' : 'ri-toggle-fill'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && types.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No hay tipos de vendedor registrados.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                      Cargando tipos de vendedor...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingType ? 'Editar Tipo de Vendedor' : 'Nuevo Tipo de Vendedor'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Descripción opcional del tipo de vendedor"
                  ></textarea>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comisión por defecto (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.default_commission_rate}
                      onChange={e => setForm({ ...form, default_commission_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descuento máx. sugerido (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.max_discount_percent}
                      onChange={e => setForm({ ...form, max_discount_percent: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Guardar
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
