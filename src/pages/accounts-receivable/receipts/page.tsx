import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Receipt {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'transfer' | 'card';
  reference: string;
  concept: string;
  status: 'active' | 'cancelled';
  invoiceNumbers: string[];
}

export default function ReceiptsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Mock data
  const receipts: Receipt[] = [
    {
      id: '1',
      receiptNumber: 'RC-001',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      date: '2024-01-15',
      amount: 75000,
      paymentMethod: 'transfer',
      reference: 'TRF-001',
      concept: 'Pago de facturas FAC-001, FAC-002',
      status: 'active',
      invoiceNumbers: ['FAC-001', 'FAC-002']
    },
    {
      id: '2',
      receiptNumber: 'RC-002',
      customerId: '2',
      customerName: 'Comercial XYZ',
      date: '2024-01-20',
      amount: 120000,
      paymentMethod: 'check',
      reference: 'CHK-001',
      concept: 'Pago factura FAC-005',
      status: 'active',
      invoiceNumbers: ['FAC-005']
    },
    {
      id: '3',
      receiptNumber: 'RC-003',
      customerId: '1',
      customerName: 'Empresa ABC S.R.L.',
      date: '2024-01-25',
      amount: 50000,
      paymentMethod: 'cash',
      reference: 'EFE-001',
      concept: 'Pago parcial factura FAC-003',
      status: 'active',
      invoiceNumbers: ['FAC-003']
    },
    {
      id: '4',
      receiptNumber: 'RC-004',
      customerId: '3',
      customerName: 'Distribuidora DEF',
      date: '2024-01-28',
      amount: 85000,
      paymentMethod: 'card',
      reference: 'TDC-001',
      concept: 'Pago factura FAC-006',
      status: 'active',
      invoiceNumbers: ['FAC-006']
    },
    {
      id: '5',
      receiptNumber: 'RC-005',
      customerId: '2',
      customerName: 'Comercial XYZ',
      date: '2024-01-30',
      amount: 45000,
      paymentMethod: 'transfer',
      reference: 'TRF-002',
      concept: 'Pago anticipado',
      status: 'cancelled',
      invoiceNumbers: []
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
      case 'active': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'cancelled': return 'Anulado';
      default: return 'Desconocido';
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    const matchesPaymentMethod = paymentMethodFilter === 'all' || receipt.paymentMethod === paymentMethodFilter;
    return matchesSearch && matchesStatus && matchesPaymentMethod;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Recibos de Cobro', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Estado: ${statusFilter === 'all' ? 'Todos' : statusFilter}`, 20, 50);
    doc.text(`Método de pago: ${paymentMethodFilter === 'all' ? 'Todos' : getPaymentMethodName(paymentMethodFilter)}`, 20, 60);
    
    // Estadísticas
    const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const activeReceipts = filteredReceipts.filter(r => r.status === 'active').length;
    const cancelledReceipts = filteredReceipts.filter(r => r.status === 'cancelled').length;
    
    doc.setFontSize(14);
    doc.text('Resumen de Recibos', 20, 80);
    
    const summaryData = [
      ['Concepto', 'Valor'],
      ['Total Recibido', `RD$ ${totalAmount.toLocaleString()}`],
      ['Recibos Activos', activeReceipts.toString()],
      ['Recibos Anulados', cancelledReceipts.toString()],
      ['Total de Recibos', filteredReceipts.length.toString()]
    ];
    
    (doc as any).autoTable({
      startY: 90,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Tabla de recibos
    doc.setFontSize(14);
    doc.text('Detalle de Recibos', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const receiptData = filteredReceipts.map(receipt => [
      receipt.receiptNumber,
      receipt.customerName,
      receipt.date,
      `RD$ ${receipt.amount.toLocaleString()}`,
      getPaymentMethodName(receipt.paymentMethod),
      receipt.reference,
      getStatusName(receipt.status)
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Recibo', 'Cliente', 'Fecha', 'Monto', 'Método', 'Referencia', 'Estado']],
      body: receiptData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`recibos-cobro-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const activeReceipts = filteredReceipts.filter(r => r.status === 'active').length;
    const cancelledReceipts = filteredReceipts.filter(r => r.status === 'cancelled').length;
    
    const csvContent = [
      ['Reporte de Recibos de Cobro'],
      [`Fecha de generación: ${new Date().toLocaleDateString()}`],
      [`Estado: ${statusFilter === 'all' ? 'Todos' : statusFilter}`],
      [`Método de pago: ${paymentMethodFilter === 'all' ? 'Todos' : getPaymentMethodName(paymentMethodFilter)}`],
      [''],
      ['RESUMEN'],
      ['Total Recibido', `RD$ ${totalAmount.toLocaleString()}`],
      ['Recibos Activos', activeReceipts.toString()],
      ['Recibos Anulados', cancelledReceipts.toString()],
      ['Total de Recibos', filteredReceipts.length.toString()],
      [''],
      ['DETALLE DE RECIBOS'],
      ['Recibo', 'Cliente', 'Fecha', 'Monto', 'Método', 'Referencia', 'Concepto', 'Estado'],
      ...filteredReceipts.map(receipt => [
        receipt.receiptNumber,
        receipt.customerName,
        receipt.date,
        receipt.amount,
        getPaymentMethodName(receipt.paymentMethod),
        receipt.reference,
        receipt.concept,
        getStatusName(receipt.status)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `recibos-cobro-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleNewReceipt = () => {
    setSelectedReceipt(null);
    setShowReceiptModal(true);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptDetails(true);
  };

  const handlePrintReceipt = (receipt: Receipt) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('RECIBO DE COBRO', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Recibo No: ${receipt.receiptNumber}`, 20, 50);
    doc.text(`Fecha: ${receipt.date}`, 20, 60);
    
    doc.text(`Cliente: ${receipt.customerName}`, 20, 80);
    doc.text(`Concepto: ${receipt.concept}`, 20, 90);
    doc.text(`Método de Pago: ${getPaymentMethodName(receipt.paymentMethod)}`, 20, 100);
    doc.text(`Referencia: ${receipt.reference}`, 20, 110);
    
    doc.setFontSize(16);
    doc.text(`Monto: RD$ ${receipt.amount.toLocaleString()}`, 20, 130);
    
    if (receipt.invoiceNumbers.length > 0) {
      doc.setFontSize(12);
      doc.text('Facturas aplicadas:', 20, 150);
      receipt.invoiceNumbers.forEach((invoice, index) => {
        doc.text(`- ${invoice}`, 30, 160 + (index * 10));
      });
    }
    
    doc.save(`recibo-${receipt.receiptNumber}.pdf`);
  };

  const handleCancelReceipt = (receiptId: string) => {
    if (confirm('¿Está seguro de que desea anular este recibo?')) {
      alert('Recibo anulado exitosamente');
    }
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Recibo creado exitosamente');
    setShowReceiptModal(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recibos de Cobro</h1>
            <nav className="flex space-x-2 text-sm text-gray-600 mt-2">
              <Link to="/accounts-receivable" className="hover:text-blue-600">Cuentas por Cobrar</Link>
              <span>/</span>
              <span>Recibos de Cobro</span>
            </nav>
          </div>
          <button 
            onClick={handleNewReceipt}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Recibo
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recibido</p>
                <p className="text-2xl font-bold text-green-600">
                  RD${filteredReceipts.filter(r => r.status === 'active').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-money-dollar-circle-line text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recibos Activos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredReceipts.filter(r => r.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-file-list-line text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recibos Anulados</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredReceipts.filter(r => r.status === 'cancelled').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-close-circle-line text-2xl text-red-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio por Recibo</p>
                <p className="text-2xl font-bold text-purple-600">
                  RD${filteredReceipts.length > 0 ? Math.round(filteredReceipts.reduce((sum, r) => sum + r.amount, 0) / filteredReceipts.length).toLocaleString() : '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-bar-chart-line text-2xl text-purple-600"></i>
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
                placeholder="Buscar por cliente, número de recibo o referencia..."
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
              <option value="active">Activos</option>
              <option value="cancelled">Anulados</option>
            </select>
          </div>

          <div className="w-full md:w-48">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
            >
              <option value="all">Todos los Métodos</option>
              <option value="cash">Efectivo</option>
              <option value="check">Cheque</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
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

        {/* Receipts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recibo
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
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referencia
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
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.receiptNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD${receipt.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodName(receipt.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                        {getStatusName(receipt.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewReceipt(receipt)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalles"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(receipt)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Imprimir recibo"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        {receipt.status === 'active' && (
                          <button
                            onClick={() => handleCancelReceipt(receipt.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Anular recibo"
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

        {/* New Receipt Modal */}
        {showReceiptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nuevo Recibo de Cobro</h3>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <form onSubmit={handleSaveReceipt} className="space-y-4">
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
                    placeholder="Número de referencia"
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
                    placeholder="Descripción del pago recibido..."
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Recibo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receipt Details Modal */}
        {showReceiptDetails && selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Detalles del Recibo</h3>
                <button
                  onClick={() => {
                    setShowReceiptDetails(false);
                    setSelectedReceipt(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Recibo</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedReceipt.receiptNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cliente</label>
                    <p className="text-gray-900">{selectedReceipt.customerName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha</label>
                    <p className="text-gray-900">{selectedReceipt.date}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Monto</label>
                    <p className="text-2xl font-bold text-green-600">RD${selectedReceipt.amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Método de Pago</label>
                    <p className="text-gray-900">{getPaymentMethodName(selectedReceipt.paymentMethod)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Referencia</label>
                    <p className="text-gray-900">{selectedReceipt.reference}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Estado</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReceipt.status)}`}>
                      {getStatusName(selectedReceipt.status)}
                    </span>
                  </div>
                  
                  {selectedReceipt.invoiceNumbers.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Facturas Aplicadas</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedReceipt.invoiceNumbers.map((invoice, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {invoice}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500">Concepto</label>
                <p className="text-gray-900 mt-1">{selectedReceipt.concept}</p>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-printer-line mr-2"></i>
                  Imprimir Recibo
                </button>
                {selectedReceipt.status === 'active' && (
                  <button
                    onClick={() => handleCancelReceipt(selectedReceipt.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-close-circle-line mr-2"></i>
                    Anular Recibo
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