import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function InvoicingPage() {
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoices, setInvoices] = useState([
    {
      id: 'FAC-2024-189',
      customer: 'Empresa ABC SRL',
      customerEmail: 'contacto@empresaabc.com',
      amount: 45000,
      tax: 8100,
      total: 53100,
      status: 'paid',
      date: '2024-01-15',
      dueDate: '2024-02-14',
      items: [
        { description: 'Laptop Dell Inspiron 15', quantity: 1, price: 35000, total: 35000 },
        { description: 'Mouse Inalámbrico', quantity: 2, price: 5000, total: 10000 }
      ]
    },
    {
      id: 'FAC-2024-188',
      customer: 'Comercial XYZ EIRL',
      customerEmail: 'ventas@comercialxyz.com',
      amount: 32500,
      tax: 5850,
      total: 38350,
      status: 'pending',
      date: '2024-01-15',
      dueDate: '2024-02-14',
      items: [
        { description: 'Monitor Samsung 24"', quantity: 2, price: 12500, total: 25000 },
        { description: 'Teclado Mecánico', quantity: 1, price: 7500, total: 7500 }
      ]
    },
    {
      id: 'FAC-2024-187',
      customer: 'Distribuidora DEF SA',
      customerEmail: 'compras@distribuidoradef.com',
      amount: 78000,
      tax: 14040,
      total: 92040,
      status: 'paid',
      date: '2024-01-14',
      dueDate: '2024-02-13',
      items: [
        { description: 'Impresora HP LaserJet', quantity: 3, price: 18000, total: 54000 },
        { description: 'Papel A4 (Resma)', quantity: 20, price: 1200, total: 24000 }
      ]
    },
    {
      id: 'FAC-2024-186',
      customer: 'Servicios GHI SRL',
      customerEmail: 'admin@serviciosghi.com',
      amount: 25000,
      tax: 4500,
      total: 29500,
      status: 'overdue',
      date: '2024-01-13',
      dueDate: '2024-01-28',
      items: [
        { description: 'Servicio de Mantenimiento', quantity: 1, price: 25000, total: 25000 }
      ]
    },
    {
      id: 'FAC-2024-185',
      customer: 'Tecnología JKL SA',
      customerEmail: 'info@tecnologiajkl.com',
      amount: 156000,
      tax: 28080,
      total: 184080,
      status: 'draft',
      date: '2024-01-15',
      dueDate: '2024-02-14',
      items: [
        { description: 'Servidor Dell PowerEdge', quantity: 1, price: 120000, total: 120000 },
        { description: 'Switch de Red 24 puertos', quantity: 2, price: 18000, total: 36000 }
      ]
    }
  ]);

  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);

  const customers = [
    { id: '1', name: 'Empresa ABC SRL', email: 'contacto@empresaabc.com', phone: '809-555-0101' },
    { id: '2', name: 'Comercial XYZ EIRL', email: 'ventas@comercialxyz.com', phone: '809-555-0102' },
    { id: '3', name: 'Distribuidora DEF SA', email: 'compras@distribuidoradef.com', phone: '809-555-0103' },
    { id: '4', name: 'Servicios GHI SRL', email: 'admin@serviciosghi.com', phone: '809-555-0104' },
    { id: '5', name: 'Tecnología JKL SA', email: 'info@tecnologiajkl.com', phone: '809-555-0105' }
  ];

  const products = [
    { id: '1', name: 'Laptop Dell Inspiron 15', price: 35000, stock: 25 },
    { id: '2', name: 'Monitor Samsung 24"', price: 12500, stock: 45 },
    { id: '3', name: 'Impresora HP LaserJet', price: 18000, stock: 18 },
    { id: '4', name: 'Teclado Mecánico RGB', price: 7500, stock: 67 },
    { id: '5', name: 'Mouse Inalámbrico', price: 5000, stock: 120 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'pending': return 'Pendiente';
      case 'overdue': return 'Vencida';
      case 'draft': return 'Borrador';
      default: return 'Desconocido';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateInvoice = () => {
    setShowNewInvoiceModal(true);
  };

  const handleViewInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    setSelectedInvoice(invoiceId);
    setIsEditingInvoice(false);
    setShowInvoiceDetailModal(true);
  };

  const handleEditInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    if (invoice.status !== 'draft') {
      alert('Solo se pueden editar facturas en estado Borrador.');
      return;
    }
    setSelectedInvoice(invoiceId);
    setIsEditingInvoice(true);
    setShowInvoiceDetailModal(true);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (!confirm(`¿Está seguro de eliminar la factura ${invoiceId}?`)) return;
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
    if (selectedInvoice === invoiceId) {
      setSelectedInvoice(null);
    }
    alert(`Factura ${invoiceId} eliminada (solo frontend)`);
  };

  const handlePrintInvoice = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura ${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .total { font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Factura #${invoice.id}</h2>
            <p>Fecha: ${new Date(invoice.date).toLocaleDateString('es-DO')}</p>
          </div>
          <div class="details">
            <p><strong>Cliente:</strong> ${invoice.customer}</p>
            <p><strong>Vencimiento:</strong> ${new Date(invoice.dueDate).toLocaleDateString('es-DO')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
                .map(
                  (item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>RD$ ${item.price.toLocaleString()}</td>
                    <td>RD$ ${item.total.toLocaleString()}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="total">Subtotal:</td>
                <td>RD$ ${invoice.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">ITBIS (18%):</td>
                <td>RD$ ${invoice.tax.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="3" class="total">Total:</td>
                <td>RD$ ${invoice.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    if (!confirm(`¿Marcar factura ${invoiceId} como pagada?`)) return;
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === invoiceId ? { ...invoice, status: 'paid' } : invoice
      )
    );
    alert(`Factura ${invoiceId} marcada como pagada (solo frontend)`);
  };

  const handleDuplicateInvoice = (invoiceId: string) => {
    const original = invoices.find((inv) => inv.id === invoiceId);
    if (!original) return;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newId = `FAC-${new Date().getFullYear()}-${randomSuffix}`;
    const today = new Date().toISOString().split('T')[0];

    const duplicated = {
      ...original,
      id: newId,
      date: today,
      status: 'draft'
    };

    setInvoices((prev) => [duplicated, ...prev]);
    alert(`Factura duplicada (solo frontend). Nueva factura: ${newId}`);
  };

  const handleExportInvoices = async (format: 'excel' | 'pdf') => {
    try {
      if (format === 'excel') {
        await exportToExcel();
      } else {
        await exportToPdf();
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos. Por favor, intente nuevamente.');
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Facturas');

    // Encabezados
    worksheet.addRow(['FACTURAS']);
    worksheet.addRow([`Generado el: ${new Date().toLocaleDateString()}`]);
    worksheet.addRow([]);

    // Encabezados de la tabla
    const headerRow = worksheet.addRow([
      'N° Factura',
      'Cliente',
      'Fecha',
      'Vencimiento',
      'Monto',
      'Impuesto',
      'Total',
      'Estado'
    ]);

    // Estilo para los encabezados
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAD3' }
    };

    // Datos
    filteredInvoices.forEach(invoice => {
      worksheet.addRow([
        invoice.id,
        invoice.customer,
        new Date(invoice.date).toLocaleDateString(),
        new Date(invoice.dueDate).toLocaleDateString(),
        invoice.amount,
        invoice.tax,
        invoice.total,
        getStatusText(invoice.status)
      ]);
    });

    // Ajustar anchos de columna
    worksheet.columns = [
      { key: 'id', width: 15 },
      { key: 'customer', width: 30 },
      { key: 'date', width: 12 },
      { key: 'dueDate', width: 12 },
      { key: 'amount', width: 15 },
      { key: 'tax', width: 15 },
      { key: 'total', width: 15 },
      { key: 'status', width: 15 }
    ];

    // Formato de moneda
    const currencyColumns = ['E', 'F', 'G'];
    currencyColumns.forEach(col => {
      for (let i = 5; i <= filteredInvoices.length + 4; i++) {
        const cell = worksheet.getCell(`${col}${i}`);
        cell.numFmt = '#,##0.00';
      }
    });

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    const title = 'REPORTE DE FACTURAS';
    const date = `Generado el: ${new Date().toLocaleDateString()}`;
    
    // Título
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Fecha
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(date, 14, 30);
    
    // Datos de la tabla
    const headers = [
      'N° Factura',
      'Cliente',
      'Fecha',
      'Vencimiento',
      'Monto',
      'Impuesto',
      'Total',
      'Estado'
    ];
    
    const data = filteredInvoices.map(invoice => [
      invoice.id,
      invoice.customer,
      new Date(invoice.date).toLocaleDateString(),
      new Date(invoice.dueDate).toLocaleDateString(),
      invoice.amount.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
      invoice.tax.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
      invoice.total.toLocaleString('es-DO', { minimumFractionDigits: 2 }),
      getStatusText(invoice.status)
    ]);
    
    // Añadir tabla
    (doc as any).autoTable({
      head: [headers],
      body: data,
      startY: 40,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 }
      }
    });
    
    // Guardar el PDF
    doc.save(`facturas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
            <p className="text-gray-600">Gestión completa de facturas y documentos fiscales</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleExportInvoices('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>
              Exportar PDF
            </button>
            <button
              onClick={() => handleExportInvoices('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Exportar Excel
            </button>
            <button
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nueva Factura
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Facturas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100">
                <i className="ri-file-text-line text-xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Facturas Pagadas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Facturas Pendientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {invoices.filter(inv => inv.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100">
                <i className="ri-time-line text-xl text-yellow-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Facturas Vencidas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {invoices.filter(inv => inv.status === 'overdue').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100">
                <i className="ri-alert-line text-xl text-red-600"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por cliente o número de factura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
              >
                <option value="all">Todos los estados</option>
                <option value="paid">Pagadas</option>
                <option value="pending">Pendientes</option>
                <option value="overdue">Vencidas</option>
                <option value="draft">Borradores</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Facturas ({filteredInvoices.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
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
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.customer}</div>
                      <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.date).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      RD$ {invoice.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver factura"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button
                          onClick={() => handleEditInvoice(invoice.id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Editar factura"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(invoice.id)}
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="Imprimir factura"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        {invoice.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Marcar como pagada"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicateInvoice(invoice.id)}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Duplicar factura"
                        >
                          <i className="ri-file-copy-line"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Eliminar factura"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Detail / Edit Modal */}
        {showInvoiceDetailModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isEditingInvoice ? 'Editar factura' : 'Detalle de factura'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isEditingInvoice
                      ? 'Modifique los datos de la factura y guarde los cambios (solo frontend).'
                      : 'Visualización de la plantilla de la factura.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowInvoiceDetailModal(false);
                    setSelectedInvoice(null);
                    setIsEditingInvoice(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="p-6">
                {(() => {
                  const invoice = invoices.find((inv) => inv.id === selectedInvoice);
                  if (!invoice) return null;

                  const handleFieldChange = (field: 'customer' | 'customerEmail' | 'date' | 'dueDate', value: string) => {
                    if (!isEditingInvoice) return;
                    setInvoices((prev) =>
                      prev.map((inv) =>
                        inv.id === invoice.id
                          ? {
                              ...inv,
                              [field]: value
                            }
                          : inv
                      )
                    );
                  };

                  const handleItemChange = (
                    index: number,
                    field: 'description' | 'quantity' | 'price',
                    value: string
                  ) => {
                    if (!isEditingInvoice) return;
                    setInvoices((prev) =>
                      prev.map((inv) => {
                        if (inv.id !== invoice.id) return inv as any;

                        const items = inv.items.map((item: any, i: number) => {
                          if (i !== index) return item;

                          const updated: any = { ...item };
                          if (field === 'description') {
                            updated.description = value;
                          } else {
                            const num = Number(value) || 0;
                            if (field === 'quantity') {
                              updated.quantity = num;
                            }
                            if (field === 'price') {
                              updated.price = num;
                            }
                          }
                          updated.total = (updated.quantity || 0) * (updated.price || 0);
                          return updated;
                        });

                        const newAmount = items.reduce(
                          (sum: number, item: any) => sum + (item.total || 0),
                          0
                        );
                        const newTax = Math.round(newAmount * 0.18);
                        const newTotal = newAmount + newTax;

                        return {
                          ...inv,
                          items,
                          amount: newAmount,
                          tax: newTax,
                          total: newTotal
                        };
                      })
                    );
                  };

                  return (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="text-xs text-gray-500">N° FACTURA</div>
                          <div className="text-lg font-semibold text-gray-900">{invoice.id}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-xs text-gray-500">Estado</div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusText(invoice.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500">Cliente</div>
                          {isEditingInvoice ? (
                            <input
                              type="text"
                              value={invoice.customer}
                              onChange={(e) => handleFieldChange('customer', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">{invoice.customer}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">Correo electrónico</div>
                          {isEditingInvoice ? (
                            <input
                              type="email"
                              value={invoice.customerEmail}
                              onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          ) : (
                            <div className="text-sm text-gray-600">{invoice.customerEmail}</div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-medium text-gray-500">Fecha</div>
                            {isEditingInvoice ? (
                              <input
                                type="date"
                                value={invoice.date}
                                onChange={(e) => handleFieldChange('date', e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 mt-1">
                                {new Date(invoice.date).toLocaleDateString('es-DO')}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-500">Fecha de vencimiento</div>
                            {isEditingInvoice ? (
                              <input
                                type="date"
                                value={invoice.dueDate}
                                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 mt-1">
                                {new Date(invoice.dueDate).toLocaleDateString('es-DO')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {invoice.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {isEditingInvoice ? (
                                    <input
                                      type="text"
                                      value={item.description}
                                      onChange={(e) =>
                                        handleItemChange(index, 'description', e.target.value)
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    item.description
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {isEditingInvoice ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleItemChange(index, 'quantity', e.target.value)
                                      }
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                    />
                                  ) : (
                                    item.quantity
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {isEditingInvoice ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.price}
                                      onChange={(e) =>
                                        handleItemChange(index, 'price', e.target.value)
                                      }
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                    />
                                  ) : (
                                    <>RD$ {item.price.toLocaleString()}</>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  RD$ {item.total.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">Subtotal</td>
                              <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">RD$ {invoice.amount.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">ITBIS (18%)</td>
                              <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">RD$ {invoice.tax.toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Total</td>
                              <td className="px-4 py-2 text-right text-base font-bold text-gray-900">RD$ {invoice.total.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInvoiceDetailModal(false);
                    setSelectedInvoice(null);
                    setIsEditingInvoice(false);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cerrar
                </button>
                {isEditingInvoice && (
                  <button
                    onClick={() => {
                      setShowInvoiceDetailModal(false);
                      setSelectedInvoice(null);
                      setIsEditingInvoice(false);
                      alert('Cambios guardados en memoria (solo frontend).');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Guardar cambios
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Invoice Modal */}
        {showNewInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Nueva Factura</h3>
                  <button
                    onClick={() => setShowNewInvoiceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8">
                      <option value="">Seleccionar cliente...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Productos/Servicios</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3">
                            <select className="w-full px-2 py-1 border border-gray-300 rounded text-sm pr-8">
                              <option value="">Seleccionar producto...</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" min="1" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="number" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium">RD$ 0.00</span>
                          </td>
                          <td className="px-4 py-3">
                            <button className="text-red-600 hover:text-red-800">
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">
                    <i className="ri-add-line mr-2"></i>
                    Agregar Producto
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Notas adicionales..."
                    ></textarea>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium">RD$ 0.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">ITBIS (18%):</span>
                        <span className="text-sm font-medium">RD$ 0.00</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex justify-between">
                          <span className="text-base font-semibold">Total:</span>
                          <span className="text-base font-semibold">RD$ 0.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert('Guardando factura como borrador...');
                    setShowNewInvoiceModal(false);
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors whitespace-nowrap"
                >
                  Guardar Borrador
                </button>
                <button
                  onClick={() => {
                    alert('Creando y enviando factura...');
                    setShowNewInvoiceModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Crear Factura
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}