import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { purchaseOrdersService, purchaseOrderItemsService, suppliersService, inventoryService, chartAccountsService } from '../../../services/database';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');

  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    supplierId: '',
    deliveryDate: '',
    notes: '',
    products: [{ itemId: null as string | null, name: '', quantity: 1, price: 0 }],
    inventoryAccountId: '' as string | '',
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);

  const mapDbStatusToUi = (status: string | null | undefined): string => {
    switch (status) {
      case 'draft':
      case 'sent':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'received':
        return 'Recibida';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Pendiente';
    }
  };

  const loadAccounts = async () => {
    if (!user?.id) {
      setAccounts([]);
      return;
    }
    try {
      const data = await chartAccountsService.getAll(user.id);
      const options = (data || [])
        .filter((acc: any) => acc.allow_posting !== false && acc.type === 'asset')
        .map((acc: any) => ({ id: acc.id, code: acc.code, name: acc.name }));
      setAccounts(options);
    } catch {
      setAccounts([]);
    }
  };

  const loadInventoryItems = async () => {
    if (!user?.id) {
      setInventoryItems([]);
      return;
    }
    try {
      const data = await inventoryService.getItems(user.id);
      setInventoryItems(data || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading inventory items for purchase orders', error);
      setInventoryItems([]);
    }
  };

  const mapUiStatusToDb = (status: string): string => {
    switch (status) {
      case 'Pendiente':
        return 'draft';
      case 'Aprobada':
        return 'approved';
      case 'Recibida':
        return 'received';
      case 'Cancelada':
        return 'cancelled';
      default:
        return 'pending';
    }
  };

  const loadSuppliers = async () => {
    if (!user?.id) {
      setSuppliers([]);
      return;
    }
    try {
      const data = await suppliersService.getAll(user.id);
      setSuppliers(data || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading suppliers for purchase orders', error);
      setSuppliers([]);
    }
  };

  const loadOrders = async () => {
    if (!user?.id) {
      setOrders([]);
      return;
    }
    try {
      const [orderRows, itemRows] = await Promise.all([
        purchaseOrdersService.getAll(user.id),
        purchaseOrderItemsService.getAllByUser(user.id),
      ]);

      const itemsByOrder: Record<string, any[]> = {};
      (itemRows || []).forEach((it: any) => {
        const key = String(it.purchase_order_id);
        if (!itemsByOrder[key]) itemsByOrder[key] = [];
        itemsByOrder[key].push(it);
      });

      const mapped = (orderRows || []).map((po: any) => ({
        id: po.id,
        number: po.po_number,
        date: po.order_date,
        supplier: (po.suppliers as any)?.name || 'Proveedor',
        supplierId: po.supplier_id,
        products: (itemsByOrder[String(po.id)] || []).map((it: any) => ({
          itemId: it.inventory_item_id as string | null,
          name: it.description as string,
          quantity: Number(it.quantity) || 0,
          price: Number(it.unit_cost) || 0,
        })),
        subtotal: Number(po.subtotal) || 0,
        itbis: Number(po.tax_amount) || 0,
        total: Number(po.total_amount) || 0,
        deliveryDate: po.expected_date,
        status: mapDbStatusToUi(po.status),
        notes: po.notes || '',
        inventoryAccountId: po.inventory_account_id || '',
      }));
      setOrders(mapped);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading purchase orders', error);
      setOrders([]);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadOrders();
    loadInventoryItems();
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert('Debes iniciar sesión para registrar órdenes de compra');
      return;
    }

    if (!formData.supplierId) {
      alert('Debes seleccionar un proveedor');
      return;
    }
    
    const subtotal = calculateSubtotal();
    const itbis = calculateItbis();
    const total = calculateTotal();

    const today = new Date().toISOString().split('T')[0];
    const delivery = formData.deliveryDate || today;
    const orderDate = editingOrder?.date || today;
    const poNumber = editingOrder?.number
      ? editingOrder.number
      : `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;

    const payload = {
      supplier_id: formData.supplierId,
      po_number: poNumber,
      // Para no violar el constraint esperado (expected_date >= order_date),
      // usamos como fecha de entrega al menos la misma fecha de la orden.
      order_date: orderDate,
      expected_date: delivery < orderDate ? orderDate : delivery,
      subtotal,
      tax_amount: itbis,
      total_amount: total,
      status: mapUiStatusToDb(editingOrder?.status || 'Pendiente'),
      notes: formData.notes,
      inventory_account_id: formData.inventoryAccountId || null,
    };

    try {
      let orderId: string;
      if (editingOrder?.id) {
        const updated = await purchaseOrdersService.update(editingOrder.id as string, payload);
        orderId = String(updated.id);
        await purchaseOrderItemsService.deleteByOrder(orderId);
      } else {
        const created = await purchaseOrdersService.create(user.id, payload);
        orderId = String(created.id);
      }

      await purchaseOrderItemsService.createMany(user.id, orderId, formData.products);
      await loadOrders();
      resetForm();
      alert(editingOrder ? 'Orden de compra actualizada exitosamente' : 'Orden de compra creada exitosamente');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error saving purchase order', error);
      alert('Error al guardar la orden de compra');
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      deliveryDate: '',
      notes: '',
      products: [{ itemId: null, name: '', quantity: 1, price: 0 }],
      inventoryAccountId: '',
    });
    setEditingOrder(null);
    setShowModal(false);
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    setFormData({
      supplierId: order.supplierId || '',
      deliveryDate: order.deliveryDate,
      notes: order.notes,
      products: order.products,
      inventoryAccountId: order.inventoryAccountId || '',
    });
    setShowModal(true);
  };

  const handleApprove = async (id: string | number) => {
    if (!confirm('¿Aprobar esta orden de compra?')) return;
    try {
      await purchaseOrdersService.updateStatus(String(id), mapUiStatusToDb('Aprobada'));
      await loadOrders();
      alert('Orden de compra aprobada exitosamente');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error approving purchase order', error);
      alert('No se pudo aprobar la orden');
    }
  };

  const handleReceive = async (id: string | number) => {
    if (!user?.id) {
      alert('Debes iniciar sesión para registrar movimientos de inventario');
      return;
    }
    if (!confirm('¿Marcar esta orden como recibida y actualizar inventario?')) return;

    try {
      const orderId = String(id);

      // Cargar detalle de la orden directamente desde la BD
      const orderItems = await purchaseOrderItemsService.getByOrder(orderId);

      // Actualizar existencias y crear movimientos de entrada por cada ítem
      const today = new Date().toISOString().split('T')[0];

      for (const it of orderItems) {
        const quantity = Number(it.quantity) || 0;
        const unitCost = Number(it.unit_cost) || 0;
        if (quantity <= 0) continue;

        // Si la línea está asociada a un producto de inventario, actualizamos su stock y costos
        if (it.inventory_item_id) {
          const invItem = it.inventory_items as any | null;
          const oldStock = Number(invItem?.current_stock) || 0;
          const oldAvg =
            invItem?.average_cost != null
              ? Number(invItem.average_cost) || 0
              : Number(invItem?.cost_price) || 0;

          const newStock = oldStock + quantity;
          const newAvg = newStock > 0
            ? (oldAvg * oldStock + unitCost * quantity) / newStock
            : oldAvg;

          await inventoryService.updateItem(String(it.inventory_item_id), {
            current_stock: newStock,
            last_purchase_price: unitCost,
            last_purchase_date: today,
            average_cost: newAvg,
            cost_price: newAvg,
          });
        }

        // Registrar siempre un movimiento de entrada (aunque no haya producto vinculado)
        await inventoryService.createMovement(user.id, {
          item_id: it.inventory_item_id ? String(it.inventory_item_id) : null,
          movement_type: 'entry',
          quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
          movement_date: today,
          reference: `PO ${orderId}`,
          notes: it.description || null,
          source_type: 'purchase_order',
          source_id: orderId,
          source_number: `PO-${orderId}`,
        });
      }

      await purchaseOrdersService.updateStatus(orderId, mapUiStatusToDb('Recibida'));
      await loadOrders();
      alert('Orden marcada como recibida y entrada de inventario registrada');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error marking purchase order as received', error);
      alert('No se pudo marcar la orden como recibida');
    }
  };

  const handleCancel = async (id: string | number) => {
    if (!confirm('¿Cancelar esta orden de compra?')) return;
    try {
      await purchaseOrdersService.updateStatus(String(id), mapUiStatusToDb('Cancelada'));
      await loadOrders();
      alert('Orden de compra cancelada');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error cancelling purchase order', error);
      alert('No se pudo cancelar la orden');
    }
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { itemId: null, name: '', quantity: 1, price: 0 }]
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
    setFormData(prev => {
      const updatedProducts = prev.products.map((product, i) =>
        i === index ? { ...product, [field]: value } : product
      );
      return {
        ...prev,
        products: updatedProducts,
      };
    });
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
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
      startY: (((doc as any).lastAutoTable?.finalY) ?? 70) + 20,
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
      order.products.forEach((product: any) => {
        const lineTotal = Number(product.quantity || 0) * Number(product.price || 0);
        csvContent += `${order.number},"${product.name}",${product.quantity},${product.price},${lineTotal}\n`;
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
              <select 
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los Proveedores</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <button 
                onClick={() => { setFilterStatus('all'); setFilterSupplier('all'); }}
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
                      value={formData.supplierId}
                      onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar proveedor</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta de Inventario</label>
                    <select
                      value={formData.inventoryAccountId}
                      onChange={(e) => setFormData(prev => ({ ...prev, inventoryAccountId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sin cuenta específica</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
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
                          <select
                            value={item.itemId || ''}
                            onChange={(e) => {
                              const selectedId = e.target.value || null;
                              const selectedItem = inventoryItems.find((inv: any) => String(inv.id) === selectedId);
                              updateProduct(index, 'itemId', selectedId);
                              updateProduct(index, 'name', selectedItem ? selectedItem.name : '');
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">Seleccionar producto</option>
                            {inventoryItems.map((inv: any) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} {inv.sku ? `(${inv.sku})` : ''}
                              </option>
                            ))}
                          </select>
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