import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function AdvancesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [advances, setAdvances] = useState([
    {
      id: 1,
      number: 'ADV-2024-001',
      date: '2024-01-15',
      supplier: 'Proveedor Industrial SA',
      amount: 50000,
      reason: 'Anticipo para materiales industriales proyecto Q1',
      status: 'Aprobado',
      approvedBy: 'Juan Pérez',
      dueDate: '2024-02-15',
      remainingBalance: 35000,
      appliedAmount: 15000
    },
    {
      id: 2,
      number: 'ADV-2024-002',
      date: '2024-01-14',
      supplier: 'Distribuidora Nacional SRL',
      amount: 25000,
      reason: 'Anticipo para compra de inventario',
      status: 'Pendiente',
      approvedBy: '',
      dueDate: '2024-02-14',
      remainingBalance: 25000,
      appliedAmount: 0
    },
    {
      id: 3,
      number: 'ADV-2024-003',
      date: '2024-01-13',
      supplier: 'Servicios Técnicos EIRL',
      amount: 15000,
      reason: 'Anticipo para servicios técnicos especializados',
      status: 'Aplicado',
      approvedBy: 'María García',
      dueDate: '2024-01-30',
      remainingBalance: 0,
      appliedAmount: 15000
    },
    {
      id: 4,
      number: 'ADV-2024-004',
      date: '2024-01-12',
      supplier: 'Materiales Construcción SA',
      amount: 75000,
      reason: 'Anticipo para materiales de construcción premium',
      status: 'Rechazado',
      approvedBy: '',
      dueDate: '2024-02-12',
      remainingBalance: 75000,
      appliedAmount: 0
    }
  ]);

  const [formData, setFormData] = useState({
    supplier: '',
    amount: '',
    reason: '',
    dueDate: ''
  });

  const suppliers = [
    'Proveedor Industrial SA',
    'Distribuidora Nacional SRL',
    'Servicios Técnicos EIRL',
    'Materiales Construcción SA'
  ];

  const filteredAdvances = advances.filter(advance => {
    return filterStatus === 'all' || advance.status === filterStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAdvance) {
      setAdvances(advances.map(advance => 
        advance.id === editingAdvance.id 
          ? { 
              ...advance, 
              supplier: formData.supplier,
              amount: parseFloat(formData.amount),
              reason: formData.reason,
              dueDate: formData.dueDate,
              remainingBalance: parseFloat(formData.amount)
            }
          : advance
      ));
    } else {
      const newAdvance = {
        id: advances.length + 1,
        number: `ADV-2024-${String(advances.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        supplier: formData.supplier,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        status: 'Pendiente',
        approvedBy: '',
        dueDate: formData.dueDate,
        remainingBalance: parseFloat(formData.amount),
        appliedAmount: 0
      };
      setAdvances([...advances, newAdvance]);
    }
    
    resetForm();
    alert(editingAdvance ? 'Anticipo actualizado exitosamente' : 'Anticipo creado exitosamente');
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      amount: '',
      reason: '',
      dueDate: ''
    });
    setEditingAdvance(null);
    setShowModal(false);
  };

  const handleEdit = (advance: any) => {
    setEditingAdvance(advance);
    setFormData({
      supplier: advance.supplier,
      amount: advance.amount.toString(),
      reason: advance.reason,
      dueDate: advance.dueDate
    });
    setShowModal(true);
  };

  const handleApprove = (id: number) => {
    if (confirm('¿Aprobar este anticipo?')) {
      setAdvances(advances.map(advance => 
        advance.id === id ? { ...advance, status: 'Aprobado', approvedBy: 'Usuario Actual' } : advance
      ));
      alert('Anticipo aprobado exitosamente');
    }
  };

  const handleReject = (id: number) => {
    if (confirm('¿Rechazar este anticipo?')) {
      setAdvances(advances.map(advance => 
        advance.id === id ? { ...advance, status: 'Rechazado' } : advance
      ));
      alert('Anticipo rechazado');
    }
  };

  const handleApply = (id: number) => {
    const advance = advances.find(a => a.id === id);
    if (advance && confirm(`¿Aplicar anticipo de RD$ ${advance.remainingBalance.toLocaleString()}?`)) {
      setAdvances(advances.map(a => 
        a.id === id ? { 
          ...a, 
          status: 'Aplicado',
          appliedAmount: a.amount,
          remainingBalance: 0
        } : a
      ));
      alert('Anticipo aplicado exitosamente');
    }
  };

  const exportToExcel = () => {
    alert('Exportando anticipos a Excel...');
  };

  const printAdvance = (advance: any) => {
    alert(`Imprimiendo anticipo: ${advance.number}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anticipos a Proveedores</h1>
            <p className="text-gray-600">Gestiona anticipos y pagos adelantados</p>
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
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nuevo Anticipo
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-money-dollar-circle-line text-xl text-blue-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Anticipos</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {advances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-time-line text-xl text-orange-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {advances.filter(a => a.status === 'Pendiente').reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Aprobados</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {advances.filter(a => a.status === 'Aprobado').reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-wallet-line text-xl text-purple-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {advances.reduce((sum, a) => sum + a.remainingBalance, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Aplicado">Aplicado</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button 
                onClick={() => setFilterStatus('all')}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Advances Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Anticipos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdvances.map((advance) => (
                  <tr key={advance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{advance.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{advance.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{advance.supplier}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{advance.reason}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      RD$ {advance.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      RD$ {advance.remainingBalance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{advance.dueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        advance.status === 'Aprobado' ? 'bg-green-100 text-green-800' :
                        advance.status === 'Pendiente' ? 'bg-orange-100 text-orange-800' :
                        advance.status === 'Aplicado' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {advance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => printAdvance(advance)}
                          className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        <button 
                          onClick={() => handleEdit(advance)}
                          className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        {advance.status === 'Pendiente' && (
                          <>
                            <button 
                              onClick={() => handleApprove(advance.id)}
                              className="text-green-600 hover:text-green-900 whitespace-nowrap"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button 
                              onClick={() => handleReject(advance.id)}
                              className="text-red-600 hover:text-red-900 whitespace-nowrap"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        )}
                        {advance.status === 'Aprobado' && advance.remainingBalance > 0 && (
                          <button 
                            onClick={() => handleApply(advance.id)}
                            className="text-blue-600 hover:text-blue-900 whitespace-nowrap"
                          >
                            <i className="ri-wallet-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advance Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingAdvance ? 'Editar Anticipo' : 'Nuevo Anticipo'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor *</label>
                    <select 
                      required
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar proveedor</option>
                      {suppliers.map(supplier => (
                        <option key={supplier} value={supplier}>{supplier}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monto *</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
                    <textarea 
                      required
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe el motivo del anticipo..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento *</label>
                    <input 
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
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
                    {editingAdvance ? 'Actualizar' : 'Crear'} Anticipo
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