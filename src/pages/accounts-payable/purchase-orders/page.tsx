import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function PurchaseOrdersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');

  const [orders, setOrders] = useState([
    {
      id: 1,
      number: 'PO-2024-001',
      date: '2024-01-15',
      supplier: 'Proveedor Industrial SA',
      products: [
        { name: 'Tornillos M8x40', quantity: 100, price: 25, total: 2500 },
        { name: 'Arandelas Planas', quantity: 200, price: 5, total: 1000 }
      ],
      subtotal: 3500,
      itbis: 630,
      total: 4130,
      deliveryDate: '2024-01-25',
      status: 'Pendiente',
      notes: 'Entrega urgente requerida'
    },
    {
      id: 2,
      number: 'PO-2024-002',
      date: '2024-01-14',
      supplier: 'Distribuidora Nacional SRL',
      products: [
        { name: 'Cables Eléctricos 12AWG', quantity: 50, price: 120, total: 6000 },
        { name: 'Interruptores', quantity: 25, price: 85, total: 2125 }
      ],
      subtotal: 8125,
      itbis: 1462.5,
      total: 9587.5,
      deliveryDate: '2024-01-28',
      status: 'Aprobada',
      notes: 'Material para proyecto eléctrico'
    },
    {
      id: 3,
      number: 'PO-2024-003',
      date: '2024-01-13',
      supplier: 'Servicios Técnicos EIRL',
      products: [
        { name: 'Servicio de Instalación', quantity: 1, price: 15000, total: 15000 }
      ],
      subtotal: 15000,
      itbis: 2700,
      total: 17700,
      deliveryDate: '2024-01-30',
      status: 'Recibida',
      notes: 'Servicio completado satisfactoriamente'
    }
  ]);

  const [formData, setFormData] = useState({
    supplier: '',
    deliveryDate: '',
    notes: '',
    products: [{ name: '', quantity: 1, price: 0 }]
  });

  const suppliers = [
    'Proveedor Industrial SA',
    'Distribuidora Nacional SRL',
    'Servicios Técnicos EIRL',
    'Materiales Construcción SA'
  ];

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSupplier = filterSupplier === 'all' || order.supplier === filterSupplier;
    return matchesStatus && matchesSupplier;
  });

  const calculateSubtotal = () => {
    return formData.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
  };

  const calculateItbis = () => {
    return calculateSubtotal() * 0.18;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateItbis();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subtotal = calculateSubtotal();
    const itbis = calculateItbis();
    const total = calculateTotal();

    const productsWithTotals = formData.products.map(product => ({
      ...product,
      total: product.quantity * product.price
    }));

    if (editingOrder) {
      setOrders(orders.map(order => 
        order.id === editingOrder.id 
          ? { 
              ...order, 
              supplier: formData.supplier,
              deliveryDate: formData.deliveryDate,
              notes: formData.notes,
              products: productsWithTotals,
              subtotal,
              itbis,
              total
            }
          : order
      ));
    } else {
      const newOrder = {
        id: orders.length + 1,
        number: `PO-2024-${String(orders.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        supplier: formData.supplier,
        products: productsWithTotals,
        subtotal,
        itbis,
        total,
        deliveryDate: formData.deliveryDate,
        status: 'Pendiente',
        notes: formData.notes
      };
      setOrders([...orders, newOrder]);
    }
    
    resetForm();
    alert(editingOrder ? 'Orden de compra actualizada exitosamente' : 'Orden de compra creada exitosamente');
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      deliveryDate: '',
      notes: '',
      products: [{ name: '', quantity: 1, price: 0 }]
    });
    setEditingOrder(null);
    setShowModal(false);
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    setFormData({
      supplier: order.supplier,
      deliveryDate: order.deliveryDate,
      notes: order.notes,
      products: order.products
    });
    setShowModal(true);
  };

  const handleApprove = (id: number) => {
    if (confirm('¿Aprobar esta orden de compra?')) {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: 'Aprobada' } : order
      ));
      alert('Orden de compra aprobada exitosamente');
    }
  };

  const handleReceive = (id: number) => {
    if (confirm('¿Marcar esta orden como recibida?')) {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: 'Recibida' } : order
      ));
      alert('Orden marcada como recibida');
    }
  };

  const handleCancel = (id: number) => {
    if (confirm('¿Cancelar esta orden de compra?')) {
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status: 'Cancelada' } : order
      ));
      alert('Orden de compra cancelada');
    }
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { name: '', quantity: 1, price: 0 }]
    });
  };

  const removeProduct = (index: number) => {
    if (formData.products.length > 1) {
      setFormData({
        ...formData,
        products: formData.products.filter((_, i) => i !== index)
      });
    }
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const updatedProducts = formData.products.map((product, i) =>
      i === index ? { ...product, [field]: value } : product
    );
    setFormData({ ...formData, products: updatedProducts });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Órdenes de Compra', 20, 20);
    
    // Información del reporte
    doc.setFontSize(12);
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Total de Órdenes: ${filteredOrders.length}`, 20, 50);
    
    // Preparar datos para la tabla
    const tableData = filteredOrders.map(order => [
      order.number,
      order.date,
      order.supplier,
      `RD$ ${order.total.toLocaleString()}`,
      order.deliveryDate,
      order.status
    ]);

    // Crear la tabla
    doc.autoTable({
      head: [['Número', 'Fecha', 'Proveedor', 'Total', 'Entrega', 'Estado']],
      body: tableData,
      startY: 70,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
      columnStyles: {
        3: { halign: 'right' },
        5: { halign: 'center' }
      }
    });

    // Estadísticas
    const totalAmount = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = filteredOrders.filter(o => o.status === 'Pendiente').length;
    const approvedOrders = filteredOrders.filter(o => o.status === 'Aprobada').length;

    doc.autoTable({
      body: [
        ['Total en Órdenes:', `RD$ ${totalAmount.toLocaleString()}`],
        ['Órdenes Pendientes:', `${pendingOrders}`],
        ['Órdenes Aprobadas:', `${approvedOrders}`]
      ],
      startY: doc.lastAutoTable.finalY + 20,
      theme: 'plain',
      styles: { fontStyle: 'bold' }
    });

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 50, doc.internal.pageSize.height - 10);
      doc.text('Sistema Contable - Órdenes de Compra', 20, doc.internal.pageSize.height - 10);
    }

    doc.save(`ordenes-compra-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    let csvContent = 'Órdenes de Compra\n\n';
    csvContent += 'Número,Fecha,Proveedor,Subtotal,ITBIS,Total,Fecha Entrega,Estado,Notas\n';
    
    filteredOrders.forEach(order => {
      csvContent += `${order.number},${order.date},"${order.supplier}",${order.subtotal},${order.itbis},${order.total},${order.deliveryDate},"${order.status}","${order.notes}"\n`;
    });

    // Detalle de productos
    csvContent += '\n\nDetalle de Productos\n';
    csvContent += 'Orden,Producto,Cantidad,Precio Unitario,Total\n';
    
    filteredOrders.forEach(order => {
      order.products.forEach(product => {
        csvContent += `${order.number},"${product.name}",${product.quantity},${product.price},${product.total}\n`;
      });
    });

    // Estadísticas
    const totalAmount = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = filteredOrders.filter(o => o.status === 'Pendiente').length;
    const approvedOrders = filteredOrders.filter(o => o.status === 'Aprobada').length;

    csvContent += `\nEstadísticas\n`;
    csvContent += `Total en Órdenes,${totalAmount}\n`;
    csvContent += `Órdenes Pendientes,${pendingOrders}\n`;
    csvContent += `Órdenes Aprobadas,${approvedOrders}\n`;
    csvContent += `Total Órdenes,${filteredOrders.length}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ordenes-compra-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printOrder = (order: any) => {
    alert(`Imprimiendo orden de compra: ${order.number}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
            <p className="text-gray-600">Gestiona órdenes de compra y seguimiento</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={exportToPDF}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-pdf-line mr-2"></i>
              Exportar PDF
            </button>
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
              Nueva Orden
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-shopping-cart-line text-xl text-blue-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Órdenes</p>
                <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'Pendiente').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-bold text-gray-900">{orders.filter(o => o.status === 'Aprobada').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-money-dollar-circle-line text-xl text-purple-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}</p>
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
                <option value="Aprobada">Aprobada</option>
                <option value="Recibida">Recibida</option>
                <option value="Cancelada">Cancelada</option>
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

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Órdenes de Compra</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrega</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.supplier}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.deliveryDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      RD$ {order.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'Aprobada' ? 'bg-green-100 text-green-800' :
                        order.status === 'Pendiente' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'Recibida' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => printOrder(order)}
                          className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                        >
                          <i className="ri-printer-line"></i>
                        </button>
                        <button 
                          onClick={() => handleEdit(order)}
                          className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        {order.status === 'Pendiente' && (
                          <button 
                            onClick={() => handleApprove(order.id)}
                            className="text-green-600 hover:text-green-900 whitespace-nowrap"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                        )}
                        {order.status === 'Aprobada' && (
                          <button 
                            onClick={() => handleReceive(order.id)}
                            className="text-blue-600 hover:text-blue-900 whitespace-nowrap"
                          >
                            <i className="ri-inbox-line"></i>
                          </button>
                        )}
                        {(order.status === 'Pendiente' || order.status === 'Aprobada') && (
                          <button 
                            onClick={() => handleCancel(order.id)}
                            className="text-red-600 hover:text-red-900 whitespace-nowrap"
                          >
                            <i className="ri-close-line"></i>
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

        {/* Order Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingOrder ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Entrega *</label>
                    <input 
                      type="date"
                      required
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-900">Productos</h4>
                    <button 
                      type="button"
                      onClick={addProduct}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 whitespace-nowrap"
                    >
                      <i className="ri-add-line mr-1"></i>
                      Agregar Producto
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.products.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="md:col-span-2">
                          <input 
                            type="text"
                            placeholder="Nombre del producto"
                            value={item.name}
                            onChange={(e) => updateProduct(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <input 
                            type="number"
                            placeholder="Cantidad"
                            value={item.quantity}
                            onChange={(e) => updateProduct(index, 'quantity', Math.max(1, Math.floor(parseFloat(e.target.value || '1'))))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="Precio"
                            value={item.price}
                            onChange={(e) => updateProduct(index, 'price', Math.max(0, parseFloat(e.target.value || '0')))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            RD$ {(item.quantity * item.price).toLocaleString()}
                          </span>
                          {formData.products.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="text-red-600 hover:text-red-900 whitespace-nowrap"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-lg font-bold text-gray-900">
                      Subtotal: RD$ {calculateSubtotal().toLocaleString()}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      ITBIS: RD$ {calculateItbis().toLocaleString()}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      Total: RD$ {calculateTotal().toLocaleString()}
                    </p>
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
                    {editingOrder ? 'Actualizar' : 'Crear'} Orden
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