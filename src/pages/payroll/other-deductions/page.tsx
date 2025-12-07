import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { resolveTenantId } from '../../../services/database';

interface OtherDeduction {
  id: string;
  employee_id: string;
  period_id?: string;
  name: string;
  description: string;
  amount: number;
  deduction_date: string;
  category: 'multa' | 'descuento' | 'adelanto' | 'dano_equipo' | 'faltante' | 'otro';
  is_one_time: boolean;
  status: 'pendiente' | 'aplicada' | 'cancelada';
  created_at: string;
}

export default function OtherDeductionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deductions, setDeductions] = useState<OtherDeduction[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<OtherDeduction | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    description: '',
    amount: 0,
    deduction_date: new Date().toISOString().split('T')[0],
    category: 'otro' as OtherDeduction['category']
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const tenantId = await resolveTenantId(user.id);
      if (!tenantId) {
        setDeductions([]);
        setEmployees([]);
        return;
      }

      const [deductionsData, employeesData] = await Promise.all([
        supabase
          .from('other_deductions')
          .select('*')
          .eq('user_id', tenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('employees')
          .select('id, first_name, last_name, employee_code')
          .eq('user_id', tenantId)
          .eq('status', 'active')
      ]);

      if (deductionsData.data) setDeductions(deductionsData.data);
      if (employeesData.data) setEmployees(employeesData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const tenantId = await resolveTenantId(user.id);
      if (!tenantId) {
        alert('No se pudo determinar la empresa del usuario.');
        return;
      }

      const deductionData = {
        ...formData,
        user_id: tenantId,
        is_one_time: true,
        status: 'pendiente'
      };

      if (editingDeduction) {
        await supabase
          .from('other_deductions')
          .update(deductionData)
          .eq('id', editingDeduction.id);
      } else {
        await supabase
          .from('other_deductions')
          .insert([deductionData]);
      }

      await loadData();
      resetForm();
      alert('Deducción guardada correctamente');
    } catch (error) {
      console.error('Error saving deduction:', error);
      alert('Error al guardar la deducción');
    }
  };

  const handleEdit = (deduction: OtherDeduction) => {
    setEditingDeduction(deduction);
    setFormData({
      employee_id: deduction.employee_id,
      name: deduction.name,
      description: deduction.description || '',
      amount: deduction.amount,
      deduction_date: deduction.deduction_date,
      category: deduction.category
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta deducción?')) return;

    try {
      await supabase
        .from('other_deductions')
        .delete()
        .eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error deleting deduction:', error);
      alert('Error al eliminar la deducción');
    }
  };

  const changeStatus = async (id: string, newStatus: OtherDeduction['status']) => {
    try {
      await supabase
        .from('other_deductions')
        .update({ status: newStatus })
        .eq('id', id);
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
      amount: 0,
      deduction_date: new Date().toISOString().split('T')[0],
      category: 'otro'
    });
    setEditingDeduction(null);
    setShowForm(false);
  };

  const filteredDeductions = deductions.filter(deduction => {
    const matchesSearch = deduction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deduction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'todos' || deduction.category === categoryFilter;
    const matchesStatus = statusFilter === 'todos' || deduction.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'N/A';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      multa: 'Multa',
      descuento: 'Descuento',
      adelanto: 'Adelanto de Salario',
      dano_equipo: 'Daño a Equipo',
      faltante: 'Faltante de Caja',
      otro: 'Otro'
    };
    return labels[category] || category;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aplicada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const totalPendiente = filteredDeductions
    .filter(d => d.status === 'pendiente')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalAplicada = filteredDeductions
    .filter(d => d.status === 'aplicada')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Otras Deducciones</h1>
            <p className="text-gray-600">Gestión de deducciones eventuales y únicas</p>
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100 mr-4">
                <i className="ri-time-line text-xl text-yellow-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Deducciones Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  RD$ {totalPendiente.toLocaleString('es-DO')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 mr-4">
                <i className="ri-checkbox-circle-line text-xl text-green-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Deducciones Aplicadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  RD$ {totalAplicada.toLocaleString('es-DO')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 mr-4">
                <i className="ri-file-list-line text-xl text-blue-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Deducciones</p>
                <p className="text-2xl font-bold text-gray-900">{filteredDeductions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre..."
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
                <option value="multa">Multa</option>
                <option value="descuento">Descuento</option>
                <option value="adelanto">Adelanto de Salario</option>
                <option value="dano_equipo">Daño a Equipo</option>
                <option value="faltante">Faltante de Caja</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aplicada">Aplicada</option>
                <option value="cancelada">Cancelada</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
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
                      {new Date(deduction.deduction_date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      RD$ {deduction.amount.toLocaleString('es-DO')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(deduction.status)}`}>
                        {deduction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        {deduction.status === 'pendiente' && (
                          <>
                            <button
                              onClick={() => changeStatus(deduction.id, 'aplicada')}
                              className="text-green-600 hover:text-green-800"
                              title="Marcar como aplicada"
                            >
                              <i className="ri-checkbox-circle-line"></i>
                            </button>
                            <button
                              onClick={() => handleEdit(deduction)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Editar"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button
                              onClick={() => changeStatus(deduction.id, 'cancelada')}
                              className="text-red-600 hover:text-red-800"
                              title="Cancelar"
                            >
                              <i className="ri-close-circle-line"></i>
                            </button>
                          </>
                        )}
                        {deduction.status !== 'pendiente' && (
                          <button
                            onClick={() => handleDelete(deduction.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDeductions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No se encontraron deducciones
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
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingDeduction ? 'Editar Deducción' : 'Nueva Deducción'}
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
                      placeholder="Ej: Multa por tardanza"
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
                      placeholder="Detalles adicionales..."
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
                      <option value="multa">Multa</option>
                      <option value="descuento">Descuento</option>
                      <option value="adelanto">Adelanto de Salario</option>
                      <option value="dano_equipo">Daño a Equipo</option>
                      <option value="faltante">Faltante de Caja</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto (RD$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Aplicación *
                    </label>
                    <input
                      type="date"
                      value={formData.deduction_date}
                      onChange={(e) => setFormData({ ...formData, deduction_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
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
