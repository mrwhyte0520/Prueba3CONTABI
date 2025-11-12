import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface PettyCashFund {
  id: string;
  name: string;
  location: string;
  custodian: string;
  initialAmount: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface PettyCashExpense {
  id: string;
  fundId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  receipt: string;
  approvedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

const PettyCashPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'funds' | 'expenses' | 'reimbursements'>('funds');
  const [funds, setFunds] = useState<PettyCashFund[]>([]);
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([]);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState<PettyCashFund | null>(null);

  // Datos de ejemplo
  useEffect(() => {
    const mockFunds: PettyCashFund[] = [
      {
        id: '1',
        name: 'Caja Chica Oficina Principal',
        location: 'Santo Domingo - Oficina Central',
        custodian: 'María González',
        initialAmount: 50000,
        currentBalance: 32500,
        status: 'active',
        createdAt: '2024-01-15'
      },
      {
        id: '2',
        name: 'Caja Chica Sucursal Norte',
        location: 'Santiago - Sucursal Norte',
        custodian: 'Carlos Rodríguez',
        initialAmount: 30000,
        currentBalance: 18750,
        status: 'active',
        createdAt: '2024-02-01'
      },
      {
        id: '3',
        name: 'Caja Chica Almacén',
        location: 'Santo Domingo - Almacén Central',
        custodian: 'Ana Martínez',
        initialAmount: 25000,
        currentBalance: 15200,
        status: 'active',
        createdAt: '2024-01-20'
      }
    ];

    const mockExpenses: PettyCashExpense[] = [
      {
        id: '1',
        fundId: '1',
        date: '2024-03-15',
        description: 'Compra de materiales de oficina',
        category: 'Suministros de Oficina',
        amount: 2500,
        receipt: 'REC-001',
        approvedBy: 'Luis Pérez',
        status: 'approved'
      },
      {
        id: '2',
        fundId: '1',
        date: '2024-03-14',
        description: 'Viáticos para reunión cliente',
        category: 'Viáticos',
        amount: 3200,
        receipt: 'REC-002',
        approvedBy: 'Luis Pérez',
        status: 'approved'
      },
      {
        id: '3',
        fundId: '2',
        date: '2024-03-13',
        description: 'Transporte de documentos urgentes',
        category: 'Transporte',
        amount: 1500,
        receipt: 'REC-003',
        approvedBy: 'Carmen Silva',
        status: 'pending'
      },
      {
        id: '4',
        fundId: '1',
        date: '2024-03-12',
        description: 'Reparación menor equipo oficina',
        category: 'Mantenimiento',
        amount: 4800,
        receipt: 'REC-004',
        approvedBy: 'Luis Pérez',
        status: 'approved'
      }
    ];

    setFunds(mockFunds);
    setExpenses(mockExpenses);
  }, []);

  const handleCreateFund = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const newFund: PettyCashFund = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      location: formData.get('location') as string,
      custodian: formData.get('custodian') as string,
      initialAmount: parseFloat(formData.get('initialAmount') as string),
      currentBalance: parseFloat(formData.get('initialAmount') as string),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setFunds([...funds, newFund]);
    setShowFundModal(false);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const newExpense: PettyCashExpense = {
      id: Date.now().toString(),
      fundId: formData.get('fundId') as string,
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      amount: parseFloat(formData.get('amount') as string),
      receipt: formData.get('receipt') as string,
      approvedBy: '',
      status: 'pending'
    };

    setExpenses([...expenses, newExpense]);
    setShowExpenseModal(false);
  };

  const getTotalFunds = () => funds.reduce((sum, fund) => sum + fund.currentBalance, 0);
  const getTotalExpenses = () => expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const getPendingExpenses = () => expenses.filter(expense => expense.status === 'pending').length;

  const downloadExcel = () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Caja Chica\n';
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Fecha,Descripción,Categoría,Monto,Estado,Aprobado Por\n';
      
      expenses.forEach(expense => {
        const row = [
          expense.date,
          `"${expense.description}"`,
          expense.category,
          expense.amount.toLocaleString(),
          expense.status === 'approved' ? 'Aprobado' : expense.status === 'pending' ? 'Pendiente' : 'Rechazado',
          expense.approvedBy || 'N/A'
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar resumen
      csvContent += '\nResumen:\n';
      csvContent += `Total Gastos:,${expenses.length}\n`;
      csvContent += `Gastos Aprobados:,${expenses.filter(e => e.status === 'approved').length}\n`;
      csvContent += `Gastos Pendientes:,${expenses.filter(e => e.status === 'pending').length}\n`;
      csvContent += `Total Monto:,RD$${getTotalExpenses().toLocaleString()}\n`;
      csvContent += `Saldo Total Fondos:,RD$${getTotalFunds().toLocaleString()}\n`;

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `caja_chica_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Caja Chica</h1>
            <p className="text-gray-600">Gestión de fondos de gastos menores</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadExcel}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Descargar Excel
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-home-line mr-2"></i>
              Volver al Inicio
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-wallet-3-line text-xl text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total en Fondos</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${getTotalFunds().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Fondos Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {funds.filter(f => f.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <i className="ri-file-list-3-line text-xl text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gastos Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{getPendingExpenses()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <i className="ri-shopping-cart-line text-xl text-red-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Gastos</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${getTotalExpenses().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('funds')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'funds'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-wallet-3-line mr-2"></i>
                Fondos de Caja Chica
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'expenses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-shopping-cart-line mr-2"></i>
                Gastos y Comprobantes
              </button>
              <button
                onClick={() => setActiveTab('reimbursements')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'reimbursements'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-refund-2-line mr-2"></i>
                Reembolsos
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Fondos */}
            {activeTab === 'funds' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Fondos de Caja Chica</h2>
                  <button
                    onClick={() => setShowFundModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Crear Fondo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {funds.map((fund) => (
                    <div key={fund.id} className="bg-gray-50 p-6 rounded-lg border">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-gray-900">{fund.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          fund.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {fund.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><i className="ri-map-pin-line mr-2"></i>{fund.location}</p>
                        <p><i className="ri-user-line mr-2"></i>Custodio: {fund.custodian}</p>
                        <p><i className="ri-calendar-line mr-2"></i>Creado: {fund.createdAt}</p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Monto Inicial:</span>
                          <span className="font-medium">${fund.initialAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Balance Actual:</span>
                          <span className="font-bold text-lg text-blue-600">
                            ${fund.currentBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex space-x-2">
                        <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors whitespace-nowrap">
                          Ver Detalles
                        </button>
                        <button className="flex-1 bg-gray-600 text-white py-2 px-3 rounded text-sm hover:bg-gray-700 transition-colors whitespace-nowrap">
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Gastos */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Gastos y Comprobantes</h2>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Registrar Gasto
                  </button>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
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
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.date}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {expense.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${expense.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              expense.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : expense.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {expense.status === 'approved' ? 'Aprobado' : 
                               expense.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                              Ver
                            </button>
                            <button className="text-green-600 hover:text-green-900 mr-3">
                              Aprobar
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              Rechazar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Reembolsos */}
            {activeTab === 'reimbursements' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Solicitudes de Reembolso</h2>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                    <i className="ri-add-line mr-2"></i>
                    Nueva Solicitud
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <i className="ri-information-line text-yellow-600 mr-3 mt-1"></i>
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">
                        Proceso de Reembolso
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Los reembolsos se procesan cuando el saldo de caja chica está bajo. 
                        Se requiere aprobación del supervisor y comprobantes válidos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-12">
                  <i className="ri-refund-2-line text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay solicitudes de reembolso
                  </h3>
                  <p className="text-gray-500">
                    Las solicitudes de reembolso aparecerán aquí cuando se creen.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Crear Fondo */}
        {showFundModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Fondo</h3>
              
              <form onSubmit={handleCreateFund} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Fondo
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Caja Chica Oficina Principal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    name="location"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Santo Domingo - Oficina Central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custodio Responsable
                  </label>
                  <input
                    type="text"
                    name="custodian"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre del responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Inicial (RD$)
                  </label>
                  <input
                    type="number"
                    name="initialAmount"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Fondo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Registrar Gasto */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Gasto</h3>
              
              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fondo de Caja Chica
                  </label>
                  <select
                    name="fundId"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar fondo</option>
                    {funds.filter(f => f.status === 'active').map(fund => (
                      <option key={fund.id} value={fund.id}>{fund.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    name="description"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción del gasto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Suministros de Oficina">Suministros de Oficina</option>
                    <option value="Viáticos">Viáticos</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Comunicaciones">Comunicaciones</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto (RD$)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Recibo
                  </label>
                  <input
                    type="text"
                    name="receipt"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: REC-001"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PettyCashPage;