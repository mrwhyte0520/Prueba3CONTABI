import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Advance {
  id: string;
  advanceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  appliedAmount: number;
  balance: number;
  paymentMethod: 'cash' | 'check' | 'transfer' | 'card';
  reference: string;
  concept: string;
  status: 'pending' | 'applied' | 'partial' | 'cancelled';
  appliedInvoices: string[];
}

export default function AdvancesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showAdvanceDetails, setShowAdvanceDetails] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);

  // Mock data
  const advances: Advance[] = [
    {
      id: '1',
      advanceNumber: 'ANT-001',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      date: '2024-01-10',
      amount: 100000,
      appliedAmount: 75000,
      balance: 25000,
      paymentMethod: 'transfer',
      reference: 'TRF-ANT-001',
      concept: 'Anticipo para futuras compras',
      status: 'partial',
      appliedInvoices: ['FAC-001', 'FAC-002']
    },
    {
      id: '2',
      advanceNumber: 'ANT-002',
      customerId: '2',
      customerName: 'Comercial XYZ',
      date: '2024-01-15',
      amount: 150000,
      appliedAmount: 0,
      balance: 150000,
      paymentMethod: 'check',
      reference: 'CHK-ANT-001',
      concept: 'Anticipo por servicios futuros',
      status: 'pending',
      appliedInvoices: []
    },
    {
      id: '3',
      advanceNumber: 'ANT-003',
      customerId: '3',
      customerName: 'Distribuidora DEF',
      date: '2024-01-20',
      amount: 80000,
      appliedAmount: 80000,
      balance: 0,
      paymentMethod: 'cash',
      reference: 'EFE-ANT-001',
      concept: 'Anticipo aplicado completamente',
      status: 'applied',
      appliedInvoices: ['FAC-003']
    },
    {
      id: '4',
      advanceNumber: 'ANT-004',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      date: '2024-01-25',
      amount: 200000,
      appliedAmount: 0,
      balance: 200000,
      paymentMethod: 'card',
      reference: 'TDC-ANT-001',
      concept: 'Anticipo para proyecto especial',
      status: 'pending',
      appliedInvoices: []
    },
    {
      id: '5',
      advanceNumber: 'ANT-005',
      customerId: '2',
      customerName: 'Comercial XYZ',
      date: '2024-01-28',
      amount: 50000,
      appliedAmount: 0,
      balance: 0,
      paymentMethod: 'transfer',
      reference: 'TRF-ANT-002',
      concept: 'Anticipo cancelado',
      status: 'cancelled',
      appliedInvoices: []
    }
  ];

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'check': return 'Cheque';
      case 'transfer': return 'Transferencia';
      case 'card': return 'Tarjeta';
      default: return 'Otro';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'applied': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'applied': return 'Aplicado';
      case 'partial': return 'Parcial';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const filteredAdvances = advances.filter(advance => {
    const matchesSearch = advance.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         advance.advanceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         advance.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || advance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Anticipos de Clientes', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Estado: ${statusFilter === 'all' ? 'Todos' : getStatusName(statusFilter)}`, 20, 50);
    
    // Estadísticas
    const totalAmount = filteredAdvances.reduce((sum, advance) => sum + advance.amount, 0);
    const totalApplied = filteredAdvances.reduce((sum, advance) => sum + advance.appliedAmount, 0);
    const totalBalance = filteredAdvances.reduce((sum, advance) => sum + advance.balance, 0);
    const pendingAdvances = filteredAdvances.filter(a => a.status === 'pending').length;
    
    doc.setFontSize(14);
    doc.text('Resumen de Anticipos', 20, 70);
    
    const summaryData = [
      ['Concepto', 'Valor'],
      ['Total Anticipos', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Aplicado', `RD$ ${totalApplied.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Anticipos Pendientes', pendingAdvances.toString()],
      ['Total de Anticipos', filteredAdvances.length.toString()]
    ];
    
    (doc as any).autoTable({
      startY: 80,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Tabla de anticipos
    doc.setFontSize(14);
    doc.text('Detalle de Anticipos', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const advanceData = filteredAdvances.map(advance => [
      advance.advanceNumber,
      advance.customerName,
      advance.date,
      `RD$ ${advance.amount.toLocaleString()}`,
      `RD$ ${advance.appliedAmount.toLocaleString()}`,
      `RD$ ${advance.balance.toLocaleString()}`,
      getStatusName(advance.status)
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Anticipo', 'Cliente', 'Fecha', 'Monto', 'Aplicado', 'Saldo', 'Estado']],
      body: advanceData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`anticipos-clientes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const totalAmount = filteredAdvances.reduce((sum, advance) => sum + advance.amount, 0);
    const totalApplied = filteredAdvances.reduce((sum, advance) => sum + advance.appliedAmount, 0);
    const totalBalance = filteredAdvances.reduce((sum, advance) => sum + advance.balance, 0);
    const pendingAdvances = filteredAdvances.filter(a => a.status === 'pending').length;
    
    const csvContent = [
      ['Reporte de Anticipos de Clientes'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [`Estado: ${statusFilter === 'all' ? 'Todos' : getStatusName(statusFilter)}`],
      [''],
      ['RESUMEN'],
      ['Total Anticipos', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Aplicado', `RD$ ${totalApplied.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Anticipos Pendientes', pendingAdvances.toString()],
      ['Total de Anticipos', filteredAdvances.length.toString()],
      [''],
      ['DETALLE DE ANTICIPOS'],
      ['Anticipo', 'Cliente', 'Fecha', 'Monto', 'Aplicado', 'Saldo', 'Método Pago', 'Referencia', 'Estado'],
      ...filteredAdvances.map(advance => [
        advance.advanceNumber,
        advance.customerName,
        advance.date,
        advance.amount,
        advance.appliedAmount,
        advance.balance,
        getPaymentMethodName(advance.paymentMethod),
        advance.reference,
        getStatusName(advance.status)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `anticipos-clientes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewAdvance = () => {
    setSelectedAdvance(null);
    setShowAdvanceModal(true);
  };

  const handleViewAdvance = (advance: Advance) => {
    setSelectedAdvance(advance);
    setShowAdvanceDetails(true);
  };

  const handleApplyAdvance = (advance: Advance) => {
    setSelectedAdvance(advance);
    setShowApplyModal(true);
  };

  const handleCancelAdvance = (advanceId: string) => {
    if (confirm('¿Está seguro de que desea cancelar este anticipo?')) {
      alert('Anticipo cancelado exitosamente');
    }
  };

  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Anticipo creado exitosamente');
    setShowAdvanceModal(false);
  };

  const handleSaveApplication = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Anticipo aplicado exitosamente');
    setShowApplyModal(false);
    setSelectedAdvance(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anticipos de Clientes</h1>
            <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
              <Link to="/accounts-receivable" className="hover:text-blue-600">Cuentas por Cobrar</Link>
              <span>/</span>
              <span>Anticipos</span>
            </nav>
          </div>
          <button 
            onClick={handleNewAdvance}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Anticipo
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Anticipos</p>
                <p className="text-2xl font-bold text-blue-600">
                  RD${filteredAdvances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Disponible</p>
                <p className="text-2xl font-bold text-green-600">
                  RD${filteredAdvances.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-wallet-line text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monto Aplicado</p>
                <p className="text-2xl font-bold text-purple-600">
                  RD${filteredAdvances.reduce((sum, a) => sum + a.appliedAmount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-check-double-line text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Anticipos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredAdvances.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="ri-time-line text-2xl text-orange-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Export */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Buscar por cliente, número de anticipo o referencia..."
              />
            </div>
          </div>
          
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
            >
              <option value="all">Todos los Estados</option>
              <option value="pending">Pendientes</option>
              <option value="partial">Parciales</option>
              <option value="applied">Aplicados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={exportToPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>PDF
            </button>
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>Excel
            </button>
          </div>
        </div>

        {/* Advances Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anticipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aplicado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
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
                {filteredAdvances.map((advance) => (
                  <tr key={advance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {advance.advanceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advance.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advance.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${advance.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${advance.appliedAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      RD${advance.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(advance.status)}`}>
                        {getStatusName(advance.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewAdvance(advance)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        {advance.balance > 0 && advance.status !== 'cancelled' && (
                          <button
                            onClick={() => handleApplyAdvance(advance)}
                            className="text-green-600 hover:text-green-900"
                            title="Aplicar anticipo"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                        {advance.status === 'pending' && (
                          <button
                            onClick={() => handleCancelAdvance(advance.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar anticipo"
                          >
                            <i className="ri-close-circle-line"></i>
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

        {/* New Advance Modal */}
        {showAdvanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nuevo Anticipo de Cliente</h3>
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSaveAdvance} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cliente
                    </label>
                    <select 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Seleccionar cliente</option>
                      <option value="1">Empresa ABC S.R.L.</option>
                      <option value="2">Comercial XYZ</option>
                      <option value="3">Distribuidora DEF</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha
                    </label>
                    <input
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto del Anticipo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Pago
                    </label>
                    <select 
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="check">Cheque</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Número de referencia del pago"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concepto
                  </label>
                  <textarea
                    rows={3}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción del anticipo recibido..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanceModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Anticipo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Apply Advance Modal */}
        {showApplyModal && selectedAdvance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Aplicar Anticipo</h3>
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setSelectedAdvance(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Anticipo: <span className="font-medium">{selectedAdvance.advanceNumber}</span></p>
                <p className="text-sm text-gray-600">Cliente: <span className="font-medium">{selectedAdvance.customerName}</span></p>
                <p className="text-lg font-semibold text-green-600">Saldo disponible: RD${selectedAdvance.balance.toLocaleString()}</p>
              </div>
              
              <form onSubmit={handleSaveApplication} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Factura a Aplicar
                  </label>
                  <select 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar factura</option>
                    <option value="FAC-001">FAC-001 - RD$ 50,000</option>
                    <option value="FAC-002">FAC-002 - RD$ 75,000</option>
                    <option value="FAC-003">FAC-003 - RD$ 100,000</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Aplicar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    max={selectedAdvance.balance}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Observaciones sobre la aplicación del anticipo..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyModal(false);
                      setSelectedAdvance(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Aplicar Anticipo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Advance Details Modal */}
        {showAdvanceDetails && selectedAdvance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Detalles del Anticipo</h3>
                <button
                  onClick={() => {
                    setShowAdvanceDetails(false);
                    setSelectedAdvance(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Anticipo</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedAdvance.advanceNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cliente</label>
                    <p className="text-gray-900">{selectedAdvance.customerName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha</label>
                    <p className="text-gray-900">{selectedAdvance.date}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto Original</label>
                    <p className="text-2xl font-bold text-blue-600">RD${selectedAdvance.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Método de Pago</label>
                    <p className="text-gray-900">{getPaymentMethodName(selectedAdvance.paymentMethod)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Referencia</label>
                    <p className="text-gray-900">{selectedAdvance.reference}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto Aplicado</label>
                    <p className="text-lg font-semibold text-purple-600">RD${selectedAdvance.appliedAmount.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Saldo Disponible</label>
                    <p className="text-2xl font-bold text-green-600">RD${selectedAdvance.balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Estado</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAdvance.status)} mt-1`}>
                  {getStatusName(selectedAdvance.status)}
                </span>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Concepto</label>
                <p className="text-gray-900 mt-1">{selectedAdvance.concept}</p>
              </div>
              
              {selectedAdvance.appliedInvoices.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-500">Facturas Aplicadas</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedAdvance.appliedInvoices.map((invoice, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {invoice}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 mt-6">
                {selectedAdvance.balance > 0 && selectedAdvance.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setShowAdvanceDetails(false);
                      setShowApplyModal(true);
                    }}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-check-line mr-2"></i>
                    Aplicar Anticipo
                  </button>
                )}
                {selectedAdvance.status === 'pending' && (
                  <button
                    onClick={() => handleCancelAdvance(selectedAdvance.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-close-circle-line mr-2"></i>
                    Cancelar Anticipo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}