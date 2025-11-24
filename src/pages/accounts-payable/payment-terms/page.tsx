import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { paymentTermsService } from '../../../services/database';

export default function PaymentTermsPage() {
  const { user } = useAuth();
  const [terms, setTerms] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    days: 0,
    description: '',
  });

  const loadTerms = async () => {
    if (!user?.id) {
      setTerms([]);
      return;
    }
    try {
      const rows = await paymentTermsService.getAll(user.id);
      setTerms(rows || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading payment terms', error);
      setTerms([]);
    }
  };

  useEffect(() => {
    loadTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const resetForm = () => {
    setFormData({
      name: '',
      days: 0,
      description: '',
    });
    setEditingTerm(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      alert('Debes iniciar sesión para gestionar términos de pago');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        days: Number(formData.days) || 0,
        description: formData.description || null,
      };

      if (editingTerm?.id) {
        await paymentTermsService.update(editingTerm.id, payload);
      } else {
        await paymentTermsService.create(user.id, payload);
      }
      await loadTerms();
      resetForm();
      alert(editingTerm ? 'Término de pago actualizado' : 'Término de pago creado');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving payment term', error);
      alert('Error al guardar el término de pago');
    }
  };

  const handleEdit = (row: any) => {
    setEditingTerm(row);
    setFormData({
      name: row.name || '',
      days: row.days || 0,
      description: row.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) {
      alert('Debes iniciar sesión para eliminar términos de pago');
      return;
    }
    if (!confirm('¿Eliminar este término de pago?')) return;

    try {
      await paymentTermsService.delete(id);
      await loadTerms();
      alert('Término de pago eliminado');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting payment term', error);
      alert('No se pudo eliminar el término de pago');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Términos de Pago</h1>
            <p className="text-gray-600">Catálogo de condiciones de pago para proveedores</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2" />
            Nuevo Término
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Términos de Pago</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {terms.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.days}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">{t.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(t)}
                          className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                        >
                          <i className="ri-edit-line" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-red-600 hover:text-red-900 whitespace-nowrap"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {terms.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No hay términos de pago registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTerm ? 'Editar Término de Pago' : 'Nuevo Término de Pago'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Días *</label>
                  <input
                    type="number"
                    required
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    {editingTerm ? 'Actualizar' : 'Crear'} Término
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
