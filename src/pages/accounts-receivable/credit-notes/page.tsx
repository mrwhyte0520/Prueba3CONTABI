import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CreditNote {
  id: string;
  noteNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  appliedAmount: number;
  balance: number;
  reason: string;
  concept: string;
  status: 'pending' | 'applied' | 'partial' | 'cancelled';
  relatedInvoice?: string;
  appliedInvoices: string[];
}

export default function CreditNotesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showNoteDetails, setShowNoteDetails] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);

  // Mock data
  const creditNotes: CreditNote[] = [
    {
      id: '1',
      noteNumber: 'NC-001',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      date: '2024-01-15',
      amount: 25000,
      appliedAmount: 25000,
      balance: 0,
      reason: 'Devolución de mercancía',
      concept: 'Devolución por productos defectuosos',
      status: 'applied',
      relatedInvoice: 'FAC-001',
      appliedInvoices: ['FAC-004']
    },
    {
      id: '2',
      noteNumber: 'NC-002',
      customerId: '2',
      customerName: 'Comercial XYZ',
      date: '2024-01-20',
      amount: 15000,
      appliedAmount: 0,
      balance: 15000,
      reason: 'Descuento por volumen',
      concept: 'Descuento especial por compra mayor',
      status: 'pending',
      appliedInvoices: []
    },
    {
      id: '3',
      noteNumber: 'NC-003',
      customerId: '3',
      customerName: 'Distribuidora DEF',
      date: '2024-01-25',
      amount: 30000,
      appliedAmount: 20000,
      balance: 10000,
      reason: 'Error en facturación',
      concept: 'Corrección de precio facturado',
      status: 'partial',
      relatedInvoice: 'FAC-003',
      appliedInvoices: ['FAC-005']
    },
    {
      id: '4',
      noteNumber: 'NC-004',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      date: '2024-01-28',
      amount: 40000,
      appliedAmount: 0,
      balance: 40000,
      reason: 'Bonificación comercial',
      concept: 'Bonificación por fidelidad del cliente',
      status: 'pending',
      appliedInvoices: []
    },
    {
      id: '5',
      noteNumber: 'NC-005',
      customerId: '2',
      customerName: 'Comercial XYZ',
      date: '2024-01-30',
      amount: 20000,
      appliedAmount: 0,
      balance: 0,
      reason: 'Cancelación de servicio',
      concept: 'Nota de crédito cancelada',
      status: 'cancelled',
      appliedInvoices: []
    }
  ];

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
      case 'applied': return 'Aplicada';
      case 'partial': return 'Parcial';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  const filteredNotes = creditNotes.filter(note => {
    const matchesSearch = note.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.noteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Notas de Crédito', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Estado: ${statusFilter === 'all' ? 'Todos' : getStatusName(statusFilter)}`, 20, 50);
    
    // Estadísticas
    const totalAmount = filteredNotes.reduce((sum, note) => sum + note.amount, 0);
    const totalApplied = filteredNotes.reduce((sum, note) => sum + note.appliedAmount, 0);
    const totalBalance = filteredNotes.reduce((sum, note) => sum + note.balance, 0);
    const pendingNotes = filteredNotes.filter(n => n.status === 'pending').length;
    
    doc.setFontSize(14);
    doc.text('Resumen de Notas de Crédito', 20, 70);
    
    const summaryData = [
      ['Concepto', 'Valor'],
      ['Total Notas de Crédito', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Aplicado', `RD$ ${totalApplied.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Notas Pendientes', pendingNotes.toString()],
      ['Total de Notas', filteredNotes.length.toString()]
    ];
    
    (doc as any).autoTable({
      startY: 80,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Tabla de notas
    doc.setFontSize(14);
    doc.text('Detalle de Notas de Crédito', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const noteData = filteredNotes.map(note => [
      note.noteNumber,
      note.customerName,
      note.date,
      `RD$ ${note.amount.toLocaleString()}`,
      `RD$ ${note.appliedAmount.toLocaleString()}`,
      `RD$ ${note.balance.toLocaleString()}`,
      note.reason,
      getStatusName(note.status)
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Nota', 'Cliente', 'Fecha', 'Monto', 'Aplicado', 'Saldo', 'Motivo', 'Estado']],
      body: noteData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`notas-credito-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const totalAmount = filteredNotes.reduce((sum, note) => sum + note.amount, 0);
    const totalApplied = filteredNotes.reduce((sum, note) => sum + note.appliedAmount, 0);
    const totalBalance = filteredNotes.reduce((sum, note) => sum + note.balance, 0);
    const pendingNotes = filteredNotes.filter(n => n.status === 'pending').length;
    
    const csvContent = [
      ['Reporte de Notas de Crédito'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [`Estado: ${statusFilter === 'all' ? 'Todos' : getStatusName(statusFilter)}`],
      [''],
      ['RESUMEN'],
      ['Total Notas de Crédito', `RD$ ${totalAmount.toLocaleString()}`],
      ['Total Aplicado', `RD$ ${totalApplied.toLocaleString()}`],
      ['Saldo Pendiente', `RD$ ${totalBalance.toLocaleString()}`],
      ['Notas Pendientes', pendingNotes.toString()],
      ['Total de Notas', filteredNotes.length.toString()],
      [''],
      ['DETALLE DE NOTAS DE CRÉDITO'],
      ['Nota', 'Cliente', 'Fecha', 'Monto', 'Aplicado', 'Saldo', 'Motivo', 'Concepto', 'Estado'],
      ...filteredNotes.map(note => [
        note.noteNumber,
        note.customerName,
        note.date,
        note.amount,
        note.appliedAmount,
        note.balance,
        note.reason,
        note.concept,
        getStatusName(note.status)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notas-credito-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setShowNoteModal(true);
  };

  const handleViewNote = (note: CreditNote) => {
    setSelectedNote(note);
    setShowNoteDetails(true);
  };

  const handleApplyNote = (note: CreditNote) => {
    setSelectedNote(note);
    setShowApplyModal(true);
  };

  const handleCancelNote = (noteId: string) => {
    if (confirm('¿Está seguro de que desea cancelar esta nota de crédito?')) {
      alert('Nota de crédito cancelada exitosamente');
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Nota de crédito creada exitosamente');
    setShowNoteModal(false);
  };

  const handleSaveApplication = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Nota de crédito aplicada exitosamente');
    setShowApplyModal(false);
    setSelectedNote(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notas de Crédito</h1>
            <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
              <Link to="/accounts-receivable" className="hover:text-blue-600">Cuentas por Cobrar</Link>
              <span>/</span>
              <span>Notas de Crédito</span>
            </nav>
          </div>
          <button 
            onClick={handleNewNote}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nueva Nota de Crédito
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Notas</p>
                <p className="text-2xl font-bold text-blue-600">
                  RD${filteredNotes.reduce((sum, n) => sum + n.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-file-text-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Disponible</p>
                <p className="text-2xl font-bold text-green-600">
                  RD${filteredNotes.reduce((sum, n) => sum + n.balance, 0).toLocaleString()}
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
                  RD${filteredNotes.reduce((sum, n) => sum + n.appliedAmount, 0).toLocaleString()}
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
                <p className="text-sm font-medium text-gray-600">Notas Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredNotes.filter(n => n.status === 'pending').length}
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
                placeholder="Buscar por cliente, número de nota o motivo..."
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
              <option value="applied">Aplicadas</option>
              <option value="cancelled">Canceladas</option>
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

        {/* Credit Notes Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nota
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
                    Motivo
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
                {filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {note.noteNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {note.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {note.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${note.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RD${note.appliedAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      RD${note.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {note.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                        {getStatusName(note.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewNote(note)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        {note.balance > 0 && note.status !== 'cancelled' && (
                          <button
                            onClick={() => handleApplyNote(note)}
                            className="text-green-600 hover:text-green-900"
                            title="Aplicar nota"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                        {note.status === 'pending' && (
                          <button
                            onClick={() => handleCancelNote(note.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Cancelar nota"
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

        {/* New Credit Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nueva Nota de Crédito</h3>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSaveNote} className="space-y-4">
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
                      Monto
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
                      Factura Relacionada (Opcional)
                    </label>
                    <select 
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                    >
                      <option value="">Seleccionar factura</option>
                      <option value="FAC-001">FAC-001</option>
                      <option value="FAC-002">FAC-002</option>
                      <option value="FAC-003">FAC-003</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo
                  </label>
                  <select 
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar motivo</option>
                    <option value="Devolución de mercancía">Devolución de mercancía</option>
                    <option value="Descuento por volumen">Descuento por volumen</option>
                    <option value="Error en facturación">Error en facturación</option>
                    <option value="Bonificación comercial">Bonificación comercial</option>
                    <option value="Cancelación de servicio">Cancelación de servicio</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concepto
                  </label>
                  <textarea
                    rows={3}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción detallada de la nota de crédito..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Nota de Crédito
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Apply Credit Note Modal */}
        {showApplyModal && selectedNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Aplicar Nota de Crédito</h3>
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setSelectedNote(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Nota: <span className="font-medium">{selectedNote.noteNumber}</span></p>
                <p className="text-sm text-gray-600">Cliente: <span className="font-medium">{selectedNote.customerName}</span></p>
                <p className="text-lg font-semibold text-green-600">Saldo disponible: RD${selectedNote.balance.toLocaleString()}</p>
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
                    max={selectedNote.balance}
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
                    placeholder="Observaciones sobre la aplicación de la nota..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyModal(false);
                      setSelectedNote(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Aplicar Nota
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Credit Note Details Modal */}
        {showNoteDetails && selectedNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Detalles de la Nota de Crédito</h3>
                <button
                  onClick={() => {
                    setShowNoteDetails(false);
                    setSelectedNote(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Nota</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedNote.noteNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cliente</label>
                    <p className="text-gray-900">{selectedNote.customerName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha</label>
                    <p className="text-gray-900">{selectedNote.date}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto Original</label>
                    <p className="text-2xl font-bold text-blue-600">RD${selectedNote.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Motivo</label>
                    <p className="text-gray-900">{selectedNote.reason}</p>
                  </div>
                  
                  {selectedNote.relatedInvoice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Factura Relacionada</label>
                      <p className="text-gray-900">{selectedNote.relatedInvoice}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto Aplicado</label>
                    <p className="text-lg font-semibold text-purple-600">RD${selectedNote.appliedAmount.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Saldo Disponible</label>
                    <p className="text-2xl font-bold text-green-600">RD${selectedNote.balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Estado</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedNote.status)} mt-1`}>
                  {getStatusName(selectedNote.status)}
                </span>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Concepto</label>
                <p className="text-gray-900 mt-1">{selectedNote.concept}</p>
              </div>
              
              {selectedNote.appliedInvoices.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-500">Facturas Aplicadas</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedNote.appliedInvoices.map((invoice, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {invoice}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 mt-6">
                {selectedNote.balance > 0 && selectedNote.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      setShowNoteDetails(false);
                      setShowApplyModal(true);
                    }}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-check-line mr-2"></i>
                    Aplicar Nota
                  </button>
                )}
                {selectedNote.status === 'pending' && (
                  <button
                    onClick={() => handleCancelNote(selectedNote.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-close-circle-line mr-2"></i>
                    Cancelar Nota
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