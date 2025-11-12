import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

export default function PaymentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');

  const [payments, setPayments] = useState([
    {
      id: 1,
      date: '2024-01-15',
      supplier: 'Proveedor Industrial SA',
      reference: 'PAY-2024-001',
      invoice: 'INV-001234',
      method: 'Transferencia',
      amount: 125000,
      status: 'Completado',
      description: 'Pago de factura por materiales industriales',
      bankAccount: 'Banco Popular - 1234567890'
    },
    {
      id: 2,
      date: '2024-01-14',
      supplier: 'Distribuidora Nacional SRL',
      reference: 'PAY-2024-002',
      invoice: 'INV-001235',
      method: 'Cheque',
      amount: 85000,
      status: 'Pendiente',
      description: 'Pago de productos de distribución',
      bankAccount: 'Banco BHD - 0987654321'
    },
    {
      id: 3,
      date: '2024-01-13',
      supplier: 'Servicios Técnicos EIRL',
      reference: 'PAY-2024-003',
      invoice: 'INV-001236',
      method: 'Efectivo',
      amount: 45000,
      status: 'Completado',
      description: 'Servicios técnicos especializados',
      bankAccount: 'Caja General'
    },
    {
      id: 4,
      date: '2024-01-12',
      supplier: 'Materiales Construcción SA',
      reference: 'PAY-2024-004',
      invoice: 'INV-001237',
      method: 'Transferencia',
      amount: 195000,
      status: 'Rechazado',
      description: 'Materiales de construcción premium',
      bankAccount: 'Banco Reservas - 5555666677'
    }
  ]);

  const [formData, setFormData] = useState({
    supplier: '',
    invoice: '',
    method: 'Transferencia',
    amount: '',
    description: '',
    bankAccount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const suppliers = [
    'Proveedor Industrial SA',
    'Distribuidora Nacional SRL',
    'Servicios Técnicos EIRL',
    'Materiales Construcción SA'
  ];

  const paymentMethods = ['Transferencia', 'Cheque', 'Efectivo', 'Tarjeta de Crédito'];
  const bankAccounts = [
    'Banco Popular - 1234567890',
    'Banco BHD - 0987654321', 
    'Banco Reservas - 5555666677',
    'Caja General'
  ];

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || payment.method === filterMethod;
    return matchesStatus && matchesMethod;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPayment = {
      id: payments.length + 1,
      date: formData.date,
      supplier: formData.supplier,
      reference: `PAY-2024-${String(payments.length + 1).padStart(3, '0')}`,
      invoice: formData.invoice,
      method: formData.method,
      amount: parseFloat(formData.amount),
      status: 'Pendiente',
      description: formData.description,
      bankAccount: formData.bankAccount
    };
    
    setPayments([...payments, newPayment]);
    resetForm();
    alert('Pago registrado exitosamente');
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      invoice: '',
      method: 'Transferencia',
      amount: '',
      description: '',
      bankAccount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowModal(false);
  };

  const handleApprovePayment = (id: number) => {
    if (confirm('¿Confirmar este pago?')) {
      setPayments(payments.map(payment => 
        payment.id === id ? { ...payment, status: 'Completado' } : payment
      ));
      alert('Pago aprobado exitosamente');
    }
  };

  const handleRejectPayment = (id: number) => {
    if (confirm('¿Rechazar este pago?')) {
      setPayments(payments.map(payment => 
        payment.id === id ? { ...payment, status: 'Rechazado' } : payment
      ));
      alert('Pago rechazado');
    }
  };

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
  };

  const exportToExcel = () => {
    // Preparar datos para exportación
    const csvData = [
      ['Reporte de Pagos a Proveedores'],
      ['Fecha de Generación:', new Date().toLocaleDateString()],
      [''],
      ['Estadísticas Generales:'],
      ['Total Pagado:', `RD$ ${payments.filter(p => p.status === 'Completado').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}`],
      ['Pagos Pendientes:', `RD$ ${payments.filter(p => p.status === 'Pendiente').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}`],
      ['Total Pagos Completados:', payments.filter(p => p.status === 'Completado').length],
      ['Total Pagos Rechazados:', payments.filter(p => p.status === 'Rechazado').length],
      [''],
      ['Detalle de Pagos:'],
      ['Fecha', 'Proveedor', 'Referencia', 'Factura', 'Método', 'Monto', 'Estado', 'Descripción', 'Cuenta Bancaria']
    ];

    // Agregar datos de pagos filtrados
    filteredPayments.forEach(payment => {
      csvData.push([
        payment.date,
        payment.supplier,
        payment.reference,
        payment.invoice,
        payment.method,
        `RD$ ${payment.amount.toLocaleString()}`,
        payment.status,
        payment.description,
        payment.bankAccount
      ]);
    });

    // Agregar resumen por método de pago
    csvData.push(['']);
    csvData.push(['Resumen por Método de Pago:']);
    csvData.push(['Método', 'Cantidad', 'Monto Total']);
    
    paymentMethods.forEach(method => {
      const methodPayments = filteredPayments.filter(p => p.method === method);
      const methodTotal = methodPayments.reduce((sum, p) => sum + p.amount, 0);
      if (methodPayments.length > 0) {
        csvData.push([
          method,
          methodPayments.length,
          `RD$ ${methodTotal.toLocaleString()}`
        ]);
      }
    });

    // Convertir a CSV
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pagos_proveedores_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPayment = (payment: any) => {
    alert(`Imprimiendo comprobante de pago: ${payment.reference}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Procesamiento de Pagos</h1>
            <p className="text-gray-600">Gestiona pagos a proveedores</p>
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
              Nuevo Pago
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
                <p className="text-sm font-medium text-gray-600">Total Pagado</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {payments.filter(p => p.status === 'Completado').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-gray-900">RD$ {payments.filter(p => p.status === 'Pendiente').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pagos Completados</p>
                <p className="text-2xl font-bold text-gray-900">{payments.filter(p => p.status === 'Completado').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-close-line text-xl text-red-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Rechazados</p>
                <p className="text-2xl font-bold text-gray-900">{payments.filter(p => p.status === 'Rechazado').length}</p>
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
                <option value="Completado">Completado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
              <select 
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los Métodos</option>
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {setFilterStatus('all'); setFilterMethod('all');}}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Pagos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payment.supplier}</div>
                        <div className="text-sm text-gray-500">{payment.invoice}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.reference}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        payment.method === 'Transferencia' ? 'bg-blue-100 text-blue-800' :
                        payment.method === 'Cheque' ? 'bg-green-100 text-green-800' :
                        payment.method === 'Efectivo' ? 'bg-orange-100 text-orange-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      RD$ {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        payment.status === 'Completado' ? 'bg-green-100 text-green-800' :
                        payment.status === 'Pendiente' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewDetails(payment)}
                          className="text-blue-600 hover:text-blue-900 whitespace-nowrap"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button 
                          onClick={() => printPayment(payment)}
                          className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        {payment.status === 'Pendiente' && (
                          <>
                            <button 
                              onClick={() => handleApprovePayment(payment.id)}
                              className="text-green-600 hover:text-green-900 whitespace-nowrap"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button 
                              onClick={() => handleRejectPayment(payment.id)}
                              className="text-red-600 hover:text-red-900 whitespace-nowrap"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Payment Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo Pago</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Factura</label>
                    <input 
                      type="text"
                      value={formData.invoice}
                      onChange={(e) => setFormData({...formData, invoice: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="INV-001234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago *</label>
                    <select 
                      required
                      value={formData.method}
                      onChange={(e) => setFormData({...formData, method: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta Bancaria</label>
                    <select 
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar cuenta</option>
                      {bankAccounts.map(account => (
                        <option key={account} value={account}>{account}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                    <input 
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Descripción del pago..."
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
                    Registrar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Detalles del Pago</h3>
                  <button 
                    onClick={() => setSelectedPayment(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Referencia</p>
                    <p className="text-sm text-gray-900">{selectedPayment.reference}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fecha</p>
                    <p className="text-sm text-gray-900">{selectedPayment.date}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-600">Proveedor</p>
                    <p className="text-sm text-gray-900">{selectedPayment.supplier}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Factura</p>
                    <p className="text-sm text-gray-900">{selectedPayment.invoice}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Método</p>
                    <p className="text-sm text-gray-900">{selectedPayment.method}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monto</p>
                    <p className="text-lg font-bold text-gray-900">RD$ {selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Estado</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      selectedPayment.status === 'Completado' ? 'bg-green-100 text-green-800' :
                      selectedPayment.status === 'Pendiente' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedPayment.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-600">Cuenta Bancaria</p>
                    <p className="text-sm text-gray-900">{selectedPayment.bankAccount}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-600">Descripción</p>
                    <p className="text-sm text-gray-900">{selectedPayment.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}