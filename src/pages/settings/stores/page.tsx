import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { storesService } from '../../../services/database';

interface Store {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  is_active: boolean;
}

export default function StoresPage() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    manager_name: '',
  });

  const loadStores = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await storesService.getAll(user.id);
      setStores(data as Store[]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadStores();
    }
  }, [user?.id]);

  const resetForm = () => {
    setForm({ name: '', code: '', address: '', city: '', phone: '', email: '', manager_name: '' });
    setEditingStore(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      code: store.code || '',
      address: store.address || '',
      city: store.city || '',
      phone: store.phone || '',
      email: store.email || '',
      manager_name: store.manager_name || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!form.name.trim()) {
      alert('El nombre de la tienda es obligatorio');
      return;
    }

    try {
      if (editingStore) {
        await storesService.update(editingStore.id, {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          manager_name: form.manager_name.trim() || undefined,
        });
      } else {
        await storesService.create(user.id, {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          manager_name: form.manager_name.trim() || undefined,
        });
      }

      await loadStores();
      setShowModal(false);
      resetForm();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving store:', error);
      alert('Error al guardar la tienda');
    }
  };

  const handleToggleActive = async (store: Store) => {
    try {
      await storesService.update(store.id, { is_active: !store.is_active });
      await loadStores();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating store status:', error);
      alert('Error al actualizar el estado de la tienda');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tiendas / Sucursales</h1>
            <p className="text-gray-600">Gestión de tiendas y sucursales de la empresa</p>
          </div>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2" />
            Nueva Tienda
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Listado de Tiendas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gerente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.code || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.city || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{store.manager_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {store.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(store)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Editar"
                        >
                          <i className="ri-edit-line" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(store)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title={store.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <i className={store.is_active ? 'ri-toggle-line' : 'ri-toggle-fill'} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && stores.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-sm text-gray-500 text-center">
                      No hay tiendas registradas.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-sm text-gray-500 text-center">
                      Cargando tiendas...
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingStore ? 'Editar Tienda' : 'Nueva Tienda'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gerente/Responsable</label>
                    <input
                      type="text"
                      value={form.manager_name}
                      onChange={e => setForm({ ...form, manager_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-2">
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
