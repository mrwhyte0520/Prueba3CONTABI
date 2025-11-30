import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';

interface PeriodicDeduction {
  id: string;
  employee_id: string;
  name: string;
  description: string;
  type: 'fijo' | 'porcentaje';
  amount: number;
  percentage?: number;
  frequency: 'semanal' | 'quincenal' | 'mensual';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  category: 'prestamo' | 'pension_alimenticia' | 'seguro' | 'sindicato' | 'cooperativa' | 'otro';
  created_at: string;
}

export default function PeriodicDeductionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deductions, setDeductions] = useState<PeriodicDeduction[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<PeriodicDeduction | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    description: '',
    type: 'fijo' as 'fijo' | 'porcentaje',
    amount: 0,
    percentage: 0,
    frequency: 'mensual' as 'semanal' | 'quincenal' | 'mensual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    category: 'otro' as PeriodicDeduction['category']
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [deductionsData, employeesData] = await Promise.all([
        supabase
          .from('periodic_deductions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('employees')
          .select('id, first_name, last_name, employee_code')
          .eq('user_id', user.id)
          .eq('status', 'active')
      ]);

      if (deductionsData.data) setDeductions(deductionsData.data);
      if (employeesData.data) setEmployees(employeesData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const deductionData = {
        ...formData,
        user_id: user.id,
        is_active: true
      };

      if (editingDeduction) {
        await supabase
          .from('periodic_deductions')
          .update(deductionData)
          .eq('id', editingDeduction.id);
      } else {
        await supabase
          .from('periodic_deductions')
          .insert([deductionData]);
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving deduction:', error);
      alert('Error al guardar la deducción');
    }
  };

  const handleEdit = (deduction: PeriodicDeduction) => {
    setEditingDeduction(deduction);
    setFormData({
      employee_id: deduction.employee_id,
      name: deduction.name,
      description: deduction.description || '',
      type: deduction.type,
      amount: deduction.amount,
      percentage: deduction.percentage || 0,
      frequency: deduction.frequency,
      start_date: deduction.start_date,
      end_date: deduction.end_date || '',
      category: deduction.category
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta deducción periódica?')) return;

    try {
      await supabase
        .from('periodic_deductions')
        .delete()
        .eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error deleting deduction:', error);
      alert('Error al eliminar la deducción');
    }
  };

  const toggleStatus = async (deduction: PeriodicDeduction) => {
    try {
      await supabase
        .from('periodic_deductions')
        .update({ is_active: !deduction.is_active })
        .eq('id', deduction.id);
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      name: '',
      description: '',
      type: 'fijo',
      amount: 0,
      percentage: 0,
      frequency: 'mensual',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      category: 'otro'
    });
    setEditingDeduction(null);
    setShowForm(false);
  };

  const filteredDeductions = deductions.filter(deduction => {
    const matchesSearch = deduction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deduction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'todos' || deduction.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'N/A';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      prestamo: 'Préstamo',
      pension_alimenticia: 'Pensión Alimenticia',
      seguro: 'Seguro',
      sindicato: 'Sindicato',
      cooperativa: 'Cooperativa',
      otro: 'Otro'
    };
    return labels[category] || category;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deducciones Periódicas</h1>
            <p className="text-gray-600">Gestión de deducciones recurrentes por empleado</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/payroll')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Volver
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Deducción
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todas las categorías</option>
                <option value="prestamo">Préstamo</option>
                <option value="pension_alimenticia">Pensión Alimenticia</option>
                <option value="seguro">Seguro</option>
                <option value="sindicato">Sindicato</option>
                <option value="cooperativa">Cooperativa</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Deductions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deducción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDeductions.map((deduction) => (
                  <tr key={deduction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getEmployeeName(deduction.employee_id)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{deduction.name}</div>
                      {deduction.description && (
                        <div className="text-xs text-gray-500">{deduction.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getCategoryLabel(deduction.category)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {deduction.type === 'fijo' ? 'Monto Fijo' : 'Porcentaje'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {deduction.type === 'fijo'
                        ? `RD$ ${deduction.amount.toLocaleString('es-DO')}`
                        : `${deduction.percentage}%`
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                      {deduction.frequency}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(deduction)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          deduction.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {deduction.is_active ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(deduction)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(deduction.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDeductions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No se encontraron deducciones periódicas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingDeduction ? 'Editar Deducción Periódica' : 'Nueva Deducción Periódica'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empleado *
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Seleccionar empleado</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employee_code} - {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la Deducción *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="prestamo">Préstamo</option>
                      <option value="pension_alimenticia">Pensión Alimenticia</option>
                      <option value="seguro">Seguro</option>
                      <option value="sindicato">Sindicato</option>
                      <option value="cooperativa">Cooperativa</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Deducción *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="fijo">Monto Fijo</option>
                      <option value="porcentaje">Porcentaje</option>
                    </select>
                  </div>

                  {formData.type === 'fijo' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto (RD$) *
                      </label>
                      <input
                        type="number" min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Porcentaje (%) *
                      </label>
                      <input
                        type="number" min="0"
                        step="0.01"
                        value={formData.percentage}
                        onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frecuencia *
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Inicio *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Fin (Opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingDeduction ? 'Actualizar' : 'Crear'} Deducción
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
