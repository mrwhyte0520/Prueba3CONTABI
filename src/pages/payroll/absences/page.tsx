import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';

interface Absence {
  id: string;
  employee_id: string;
  absence_type: 'enfermedad' | 'permiso_personal' | 'licencia_maternidad' | 'licencia_paternidad' | 'vacaciones' | 'suspension' | 'otro';
  start_date: string;
  end_date: string;
  days_count: number;
  is_paid: boolean;
  reason: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  approved_by?: string;
  notes?: string;
  created_at: string;
}

export default function AbsencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    absence_type: 'permiso_personal' as Absence['absence_type'],
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_paid: true,
    reason: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [absencesData, employeesData] = await Promise.all([
        supabase.from('employee_absences').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('employees').select('id, first_name, last_name, employee_code').eq('user_id', user.id).eq('status', 'active')
      ]);
      if (absencesData.data) setAbsences(absencesData.data);
      if (employeesData.data) setEmployees(employeesData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const days = calculateDays(formData.start_date, formData.end_date);
    const absenceData = { ...formData, user_id: user.id, days_count: days, status: 'pendiente' };

    try {
      if (editingAbsence) {
        await supabase.from('employee_absences').update(absenceData).eq('id', editingAbsence.id);
      } else {
        await supabase.from('employee_absences').insert([absenceData]);
      }
      await loadData();
      resetForm();
      alert('Ausencia registrada correctamente');
    } catch (error) {
      console.error('Error saving absence:', error);
      alert('Error al guardar la ausencia');
    }
  };

  const handleEdit = (absence: Absence) => {
    setEditingAbsence(absence);
    setFormData({
      employee_id: absence.employee_id,
      absence_type: absence.absence_type,
      start_date: absence.start_date,
      end_date: absence.end_date,
      is_paid: absence.is_paid,
      reason: absence.reason || '',
      notes: absence.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta ausencia?')) return;
    try {
      await supabase.from('employee_absences').delete().eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error deleting absence:', error);
    }
  };

  const changeStatus = async (id: string, newStatus: Absence['status']) => {
    try {
      await supabase.from('employee_absences').update({ status: newStatus, approved_by: user?.id }).eq('id', id);
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      absence_type: 'permiso_personal',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      is_paid: true,
      reason: '',
      notes: ''
    });
    setEditingAbsence(null);
    setShowForm(false);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'N/A';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      enfermedad: 'Enfermedad',
      permiso_personal: 'Permiso Personal',
      licencia_maternidad: 'Licencia de Maternidad',
      licencia_paternidad: 'Licencia de Paternidad',
      vacaciones: 'Vacaciones',
      suspension: 'Suspensión',
      otro: 'Otro'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredAbsences = absences.filter(absence =>
    getEmployeeName(absence.employee_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    absence.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registro de Ausencias</h1>
            <p className="text-gray-600">Control de ausencias y permisos de empleados</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/payroll')} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              <i className="ri-arrow-left-line mr-2"></i>Volver
            </button>
            <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <i className="ri-add-line mr-2"></i>Nueva Ausencia
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <input
            type="text"
            placeholder="Buscar por empleado o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Inicio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Fin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAbsences.map((absence) => (
                  <tr key={absence.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{getEmployeeName(absence.employee_id)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{getTypeLabel(absence.absence_type)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(absence.start_date).toLocaleDateString('es-DO')}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(absence.end_date).toLocaleDateString('es-DO')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{absence.days_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{absence.is_paid ? 'Sí' : 'No'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(absence.status)}`}>
                        {absence.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        {absence.status === 'pendiente' && (
                          <>
                            <button onClick={() => changeStatus(absence.id, 'aprobada')} className="text-green-600 hover:text-green-800" title="Aprobar">
                              <i className="ri-check-line"></i>
                            </button>
                            <button onClick={() => changeStatus(absence.id, 'rechazada')} className="text-red-600 hover:text-red-800" title="Rechazar">
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        )}
                        <button onClick={() => handleEdit(absence)} className="text-blue-600 hover:text-blue-800">
                          <i className="ri-edit-line"></i>
                        </button>
                        <button onClick={() => handleDelete(absence.id)} className="text-red-600 hover:text-red-800">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAbsences.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No se encontraron ausencias</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{editingAbsence ? 'Editar Ausencia' : 'Nueva Ausencia'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empleado *</label>
                    <select value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                      <option value="">Seleccionar empleado</option>
                      {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.employee_code} - {emp.first_name} {emp.last_name}</option>))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ausencia *</label>
                    <select value={formData.absence_type} onChange={(e) => setFormData({ ...formData, absence_type: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                      <option value="enfermedad">Enfermedad</option>
                      <option value="permiso_personal">Permiso Personal</option>
                      <option value="licencia_maternidad">Licencia de Maternidad</option>
                      <option value="licencia_paternidad">Licencia de Paternidad</option>
                      <option value="vacaciones">Vacaciones</option>
                      <option value="suspension">Suspensión</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio *</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin *</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center">
                      <input type="checkbox" checked={formData.is_paid} onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })} className="mr-2" />
                      <span className="text-sm font-medium text-gray-700">Ausencia Pagada</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                    <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas Adicionales</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingAbsence ? 'Actualizar' : 'Registrar'} Ausencia</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
