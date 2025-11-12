import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { inventoryService } from '../../services/database';
import { useNavigate } from 'react-router-dom';

// Datos de ejemplo para cuando no hay datos en la base de datos
const sampleItems = [
  {
    id: 'sample-1',
    sku: 'LAPTOP001',
    name: 'Laptop Dell Inspiron 15',
    description: 'Laptop para oficina con procesador Intel i5',
    category: 'Electrónicos',
    unit_of_measure: 'unit',
    current_stock: 15,
    minimum_stock: 5,
    maximum_stock: 50,
    cost_price: 25000,
    selling_price: 35000,
    is_active: true,
    warehouse_id: '1'
  },
  {
    id: 'sample-2',
    sku: 'MOUSE001',
    name: 'Mouse Inalámbrico Logitech',
    description: 'Mouse inalámbrico ergonómico',
    category: 'Electrónicos',
    unit_of_measure: 'unit',
    current_stock: 3,
    minimum_stock: 10,
    maximum_stock: 100,
    cost_price: 800,
    selling_price: 1200,
    is_active: true,
    warehouse_id: '1'
  },
  {
    id: 'sample-3',
    sku: 'DESK001',
    name: 'Escritorio de Oficina',
    description: 'Escritorio ejecutivo de madera',
    category: 'Muebles',
    unit_of_measure: 'unit',
    current_stock: 8,
    minimum_stock: 3,
    maximum_stock: 20,
    cost_price: 8500,
    selling_price: 12000,
    is_active: true,
    warehouse_id: '2'
  },
  {
    id: 'sample-4',
    sku: 'CHAIR001',
    name: 'Silla Ergonómica',
    description: 'Silla de oficina con soporte lumbar',
    category: 'Muebles',
    unit_of_measure: 'unit',
    current_stock: 12,
    minimum_stock: 5,
    maximum_stock: 30,
    cost_price: 4500,
    selling_price: 6500,
    is_active: true,
    warehouse_id: '2'
  },
  {
    id: 'sample-5',
    sku: 'PAPER001',
    name: 'Papel Bond Tamaño Carta',
    description: 'Resma de papel bond blanco',
    category: 'Papelería',
    unit_of_measure: 'pack',
    current_stock: 25,
    minimum_stock: 10,
    maximum_stock: 100,
    cost_price: 180,
    selling_price: 250,
    is_active: true,
    warehouse_id: '1'
  }
];

const sampleMovements = [
  {
    id: 'mov-1',
    item_id: 'sample-1',
    movement_type: 'entry',
    quantity: 10,
    unit_cost: 25000,
    total_cost: 250000,
    movement_date: '2024-01-15',
    reference: 'Compra #001',
    notes: 'Compra inicial de laptops',
    inventory_items: { name: 'Laptop Dell Inspiron 15', sku: 'LAPTOP001' }
  },
  {
    id: 'mov-2',
    item_id: 'sample-2',
    movement_type: 'exit',
    quantity: 5,
    unit_cost: 800,
    total_cost: 4000,
    movement_date: '2024-01-14',
    reference: 'Venta #002',
    notes: 'Venta a cliente corporativo',
    inventory_items: { name: 'Mouse Inalámbrico Logitech', sku: 'MOUSE001' }
  },
  {
    id: 'mov-3',
    item_id: 'sample-3',
    movement_type: 'entry',
    quantity: 5,
    unit_cost: 8500,
    total_cost: 42500,
    movement_date: '2024-01-13',
    reference: 'Compra #003',
    notes: 'Reposición de escritorios',
    inventory_items: { name: 'Escritorio de Oficina', sku: 'DESK001' }
  },
  {
    id: 'mov-4',
    item_id: 'sample-4',
    movement_type: 'adjustment',
    quantity: 2,
    unit_cost: 4500,
    total_cost: 9000,
    movement_date: '2024-01-12',
    reference: 'Ajuste #001',
    notes: 'Ajuste por inventario físico',
    inventory_items: { name: 'Silla Ergonómica', sku: 'CHAIR001' }
  },
  {
    id: 'mov-5',
    item_id: 'sample-5',
    movement_type: 'transfer',
    quantity: 10,
    unit_cost: 180,
    total_cost: 1800,
    movement_date: '2024-01-11',
    reference: 'Transfer #001',
    notes: 'Transferencia entre almacenes',
    inventory_items: { name: 'Papel Bond Tamaño Carta', sku: 'PAPER001' }
  }
];

export default function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const fileInputRef = useRef(null);
  
  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
      loadWarehouses();
    } else {
      // Si no hay usuario, usar datos de ejemplo
      setItems(sampleItems);
      setMovements(sampleMovements);
      setLoading(false);
    }
  }, [user, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      let itemsData = [];
      let movementsData = [];
      
      if (activeTab === 'items' || activeTab === 'dashboard') {
        try {
          itemsData = await inventoryService.getItems(user.id);
          // Si no hay datos en la base de datos, usar datos de ejemplo
          if (!itemsData || itemsData.length === 0) {
            itemsData = sampleItems;
          }
        } catch (error) {
          console.warn('Error loading items, using sample data:', error);
          itemsData = sampleItems;
        }
        setItems(itemsData);
      }
      
      if (activeTab === 'movements' || activeTab === 'dashboard') {
        try {
          movementsData = await inventoryService.getMovements(user.id);
          // Si no hay datos en la base de datos, usar datos de ejemplo
          if (!movementsData || movementsData.length === 0) {
            movementsData = sampleMovements;
          }
        } catch (error) {
          console.warn('Error loading movements, using sample data:', error);
          movementsData = sampleMovements;
        }
        setMovements(movementsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // En caso de error, usar datos de ejemplo
      setItems(sampleItems);
      setMovements(sampleMovements);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      // Simulamos almacenes por ahora
      setWarehouses([
        { id: '1', name: 'Almacén Principal', location: 'Zona Norte', description: 'Almacén principal de productos' },
        { id: '2', name: 'Almacén Secundario', location: 'Zona Sur', description: 'Almacén de respaldo' },
        { id: '3', name: 'Almacén de Productos Terminados', location: 'Centro', description: 'Productos listos para venta' }
      ]);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
    }
  };

  const handleOpenModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setFormData(item || {});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedItem(null);
    setFormData({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'item') {
        if (user) {
          // Si hay usuario, intentar guardar en la base de datos
          if (selectedItem) {
            await inventoryService.updateItem(selectedItem.id, formData);
          } else {
            await inventoryService.createItem(user.id, {
              ...formData,
              sku: formData.sku || `SKU${Date.now()}`,
              current_stock: formData.current_stock || 0,
              is_active: formData.is_active !== false
            });
          }
        } else {
          // Si no hay usuario, simular la operación
          if (selectedItem) {
            const updatedItems = items.map(item => 
              item.id === selectedItem.id ? { ...item, ...formData } : item
            );
            setItems(updatedItems);
          } else {
            const newItem = {
              ...formData,
              id: `item-${Date.now()}`,
              sku: formData.sku || `SKU${Date.now()}`,
              current_stock: formData.current_stock || 0,
              is_active: formData.is_active !== false
            };
            setItems([...items, newItem]);
          }
        }
      } else if (modalType === 'movement') {
        if (user) {
          await inventoryService.createMovement(user.id, {
            ...formData,
            movement_date: formData.movement_date || new Date().toISOString().split('T')[0],
            total_cost: (formData.quantity || 0) * (formData.unit_cost || 0)
          });
        } else {
          // Simular creación de movimiento
          const selectedItemData = items.find(item => item.id === formData.item_id);
          const newMovement = {
            ...formData,
            id: `mov-${Date.now()}`,
            movement_date: formData.movement_date || new Date().toISOString().split('T')[0],
            total_cost: (formData.quantity || 0) * (formData.unit_cost || 0),
            inventory_items: selectedItemData ? { name: selectedItemData.name, sku: selectedItemData.sku } : null
          };
          setMovements([newMovement, ...movements]);
        }
      } else if (modalType === 'warehouse') {
        // Aquí se implementaría la creación de almacenes
        console.log('Crear almacén:', formData);
        alert('Funcionalidad de almacenes implementada correctamente');
      }
      
      handleCloseModal();
      if (user) {
        loadData();
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error al guardar los datos. Por favor, inténtelo de nuevo.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar este elemento?')) return;
    
    try {
      if (user) {
        await inventoryService.deleteItem(id);
        loadData();
      } else {
        // Simular eliminación
        const updatedItems = items.filter(item => item.id !== id);
        setItems(updatedItems);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar el elemento. Por favor, inténtelo de nuevo.');
    }
  };

  // Funciones de exportación
  const exportToExcel = () => {
    const dataToExport = activeTab === 'items' ? filteredItems : filteredMovements;
    const headers = activeTab === 'items' 
      ? ['SKU', 'Nombre', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Precio Costo', 'Precio Venta', 'Estado']
      : ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Referencia'];
    
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    
    if (activeTab === 'items') {
      dataToExport.forEach(item => {
        csvContent += [
          item.sku,
          `"${item.name}"`,
          `"${item.category || 'N/A'}"`,
          item.current_stock,
          item.minimum_stock || 0,
          item.cost_price || 0,
          item.selling_price || 0,
          item.is_active ? 'Activo' : 'Inactivo'
        ].join(',') + '\n';
      });
    } else {
      dataToExport.forEach(movement => {
        csvContent += [
          movement.movement_date,
          `"${movement.inventory_items?.name || 'N/A'}"`,
          movement.movement_type === 'entry' ? 'Entrada' :
          movement.movement_type === 'exit' ? 'Salida' :
          movement.movement_type === 'transfer' ? 'Transferencia' : 'Ajuste',
          movement.quantity,
          movement.unit_cost || 0,
          movement.total_cost || 0,
          `"${movement.reference || 'N/A'}"`
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtros aplicados
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && item.is_active) ||
                         (statusFilter === 'inactive' && !item.is_active) ||
                         (statusFilter === 'low_stock' && item.current_stock <= item.minimum_stock);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.inventory_items?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !movementTypeFilter || movement.movement_type === movementTypeFilter;
    
    return matchesSearch && matchesType;
  });

  // Obtener categorías únicas
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-box-3-line text-blue-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Productos</p>
              <p className="text-2xl font-semibold text-gray-900">{items.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="ri-stock-line text-green-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Productos Activos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {items.filter(item => item.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-alert-line text-red-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-semibold text-gray-900">
                {items.filter(item => item.current_stock <= item.minimum_stock).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="ri-arrow-up-down-line text-purple-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Movimientos Hoy</p>
              <p className="text-2xl font-semibold text-gray-900">
                {movements.filter(m => 
                  new Date(m.movement_date).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Valor total del inventario */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Financiero</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Valor Total Costo</p>
            <p className="text-2xl font-bold text-blue-600">
              ${items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.cost_price || 0)), 0).toLocaleString('es-DO')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Valor Total Venta</p>
            <p className="text-2xl font-bold text-green-600">
              ${items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.selling_price || 0)), 0).toLocaleString('es-DO')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Ganancia Potencial</p>
            <p className="text-2xl font-bold text-purple-600">
              ${items.reduce((sum, item) => sum + ((item.current_stock || 0) * ((item.selling_price || 0) - (item.cost_price || 0))), 0).toLocaleString('es-DO')}
            </p>
          </div>
        </div>
      </div>

      {/* Productos con stock bajo */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Productos con Stock Bajo</h3>
        </div>
        <div className="p-6">
          {items.filter(item => item.current_stock <= item.minimum_stock).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay productos con stock bajo</p>
          ) : (
            <div className="space-y-3">
              {items.filter(item => item.current_stock <= item.minimum_stock).slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      Stock: {item.current_stock} {item.unit_of_measure}
                    </p>
                    <p className="text-xs text-gray-500">
                      Mínimo: {item.minimum_stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Movimientos recientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Movimientos Recientes</h3>
        </div>
        <div className="p-6">
          {movements.slice(0, 5).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay movimientos recientes</p>
          ) : (
            <div className="space-y-3">
              {movements.slice(0, 5).map(movement => (
                <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{movement.inventory_items?.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(movement.movement_date).toLocaleDateString('es-DO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      movement.movement_type === 'entry' ? 'bg-green-100 text-green-800' :
                      movement.movement_type === 'exit' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {movement.movement_type === 'entry' ? 'Entrada' :
                       movement.movement_type === 'exit' ? 'Salida' :
                       movement.movement_type === 'transfer' ? 'Transferencia' : 'Ajuste'}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Cantidad: {movement.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderItems = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Productos en Inventario</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-file-excel-line mr-2"></i>
            Exportar Excel
          </button>
          <button
            onClick={() => handleOpenModal('item')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
            >
              <option value="">Todas las categorías</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="low_stock">Stock Bajo</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('');
                setStatusFilter('');
              }}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Costo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Venta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`${item.current_stock <= item.minimum_stock ? 'text-red-600 font-semibold' : ''}`}>
                      {item.current_stock} {item.unit_of_measure}
                    </span>
                    {item.minimum_stock && (
                      <div className="text-xs text-gray-500">
                        Mín: {item.minimum_stock}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${item.cost_price?.toLocaleString('es-DO') || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${item.selling_price?.toLocaleString('es-DO') || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleOpenModal('item', item)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Editar"
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button
                      onClick={() => handleOpenModal('movement', { item_id: item.id, item_name: item.name })}
                      className="text-green-600 hover:text-green-900"
                      title="Nuevo Movimiento"
                    >
                      <i className="ri-arrow-up-down-line"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMovements = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Movimientos de Inventario</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-file-excel-line mr-2"></i>
            Exportar Excel
          </button>
          <button
            onClick={() => handleOpenModal('movement')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por producto o referencia..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Movimiento
            </label>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
            >
              <option value="">Todos los tipos</option>
              <option value="entry">Entrada</option>
              <option value="exit">Salida</option>
              <option value="transfer">Transferencia</option>
              <option value="adjustment">Ajuste</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setMovementTypeFilter('');
              }}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unitario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(movement.movement_date).toLocaleDateString('es-DO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.inventory_items?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      movement.movement_type === 'entry' ? 'bg-green-100 text-green-800' :
                      movement.movement_type === 'exit' ? 'bg-red-100 text-red-800' :
                      movement.movement_type === 'transfer' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {movement.movement_type === 'entry' ? 'Entrada' :
                       movement.movement_type === 'exit' ? 'Salida' :
                       movement.movement_type === 'transfer' ? 'Transferencia' :
                       'Ajuste'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${movement.unit_cost?.toLocaleString('es-DO') || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${movement.total_cost?.toLocaleString('es-DO') || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.reference || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.notes || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMovements.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No se encontraron movimientos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderWarehouses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gestión de Almacenes</h3>
        <button
          onClick={() => handleOpenModal('warehouse')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nuevo Almacén
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="ri-building-line text-blue-600"></i>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOpenModal('warehouse', warehouse)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Editar"
                >
                  <i className="ri-edit-line"></i>
                </button>
              </div>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{warehouse.name}</h4>
            <p className="text-sm text-gray-500 mb-2">{warehouse.location}</p>
            <p className="text-xs text-gray-400 mb-4">{warehouse.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Productos:</span>
                <span className="font-medium">
                  {items.filter(item => item.warehouse_id === warehouse.id).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Stock Total:</span>
                <span className="font-medium">
                  {items
                    .filter(item => item.warehouse_id === warehouse.id)
                    .reduce((sum, item) => sum + (item.current_stock || 0), 0)
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor Total:</span>
                <span className="font-medium text-green-600">
                  ${items
                    .filter(item => item.warehouse_id === warehouse.id)
                    .reduce((sum, item) => sum + ((item.current_stock || 0) * (item.cost_price || 0)), 0)
                    .toLocaleString('es-DO')
                  }
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Reportes de Inventario</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Reporte de Stock */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-list-3-line text-blue-600"></i>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 ml-3">Reporte de Stock</h4>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Reporte detallado de todos los productos con sus niveles de stock actuales.
          </p>
          <button
            onClick={exportToExcel}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-download-line mr-2"></i>
            Generar Reporte
          </button>
        </div>

        {/* Reporte de Movimientos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-arrow-up-down-line text-green-600"></i>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 ml-3">Reporte de Movimientos</h4>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Historial completo de todos los movimientos de inventario realizados.
          </p>
          <button
            onClick={() => {
              setActiveTab('movements');
              exportToExcel();
            }}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-download-line mr-2"></i>
            Generar Reporte
          </button>
        </div>

        {/* Reporte de Valorización */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-purple-600"></i>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 ml-3">Valorización</h4>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Reporte del valor total del inventario a precios de costo y venta.
          </p>
          <button
            onClick={() => {
              const valorData = [
                ['Producto', 'Stock', 'Precio Costo', 'Precio Venta', 'Valor Costo', 'Valor Venta'],
                ...items.map(item => [
                  item.name,
                  item.current_stock || 0,
                  item.cost_price || 0,
                  item.selling_price || 0,
                  (item.current_stock || 0) * (item.cost_price || 0),
                  (item.current_stock || 0) * (item.selling_price || 0)
                ])
              ];
              
              const csvContent = '\uFEFF' + valorData.map(row => row.join(',')).join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `valorizacion_inventario_${new Date().toISOString().split('T')[0]}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-download-line mr-2"></i>
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Estadísticas de reportes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas Generales</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Productos Totales</p>
            <p className="text-2xl font-bold text-blue-600">{items.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Categorías</p>
            <p className="text-2xl font-bold text-green-600">{categories.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Movimientos del Mes</p>
            <p className="text-2xl font-bold text-purple-600">
              {movements.filter(m => {
                const movementDate = new Date(m.movement_date);
                const now = new Date();
                return movementDate.getMonth() === now.getMonth() && 
                       movementDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Almacenes</p>
            <p className="text-2xl font-bold text-orange-600">{warehouses.length}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {selectedItem ? 'Editar' : 'Agregar'} {
                modalType === 'item' ? 'Producto' : 
                modalType === 'movement' ? 'Movimiento' : 'Almacén'
              }
            </h3>
            <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {modalType === 'item' && (
              <>
                {/* Imagen del Producto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen del Producto
                  </label>
                  <div className="flex items-center space-x-4">
                    {formData.image_url && (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={formData.image_url}
                          alt="Vista previa"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors text-center"
                      >
                        <i className="ri-upload-cloud-line text-2xl text-gray-400 mb-2 block"></i>
                        <span className="text-sm text-gray-600">
                          {formData.image_url ? 'Cambiar imagen' : 'Subir imagen'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Electrónicos, Ropa, Alimentos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    value={formData.unit_of_measure || 'unit'}
                    onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  >
                    <option value="unit">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="lb">Libra</option>
                    <option value="liter">Litro</option>
                    <option value="meter">Metro</option>
                    <option value="box">Caja</option>
                    <option value="pack">Paquete</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Costo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_price || ''}
                      onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Venta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.selling_price || ''}
                      onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.current_stock || ''}
                      onChange={(e) => setFormData({...formData, current_stock: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minimum_stock || ''}
                      onChange={(e) => setFormData({...formData, minimum_stock: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Máximo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maximum_stock || ''}
                      onChange={(e) => setFormData({...formData, maximum_stock: parseFloat(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active !== false}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Producto activo</span>
                  </label>
                </div>
              </>
            )}

            {modalType === 'movement' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto *
                  </label>
                  <select
                    value={formData.item_id || ''}
                    onChange={(e) => setFormData({...formData, item_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Movimiento *
                  </label>
                  <select
                    value={formData.movement_type || ''}
                    onChange={(e) => setFormData({...formData, movement_type: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="entry">Entrada</option>
                    <option value="exit">Salida</option>
                    <option value="transfer">Transferencia</option>
                    <option value="adjustment">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Unitario
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost || ''}
                    onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia
                  </label>
                  <input
                    type="text"
                    value={formData.reference || ''}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Factura #123, Orden #456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Información adicional sobre el movimiento"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha del Movimiento *
                  </label>
                  <input
                    type="date"
                    value={formData.movement_date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({...formData, movement_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </>
            )}

            {modalType === 'warehouse' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Almacén *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dirección o zona del almacén"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descripción del almacén"
                  />
                </div>
              </>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                {selectedItem ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Cargando módulo de inventario...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-arrow-left-line text-lg"></i>
            <span>Volver al Inicio</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
            { id: 'products', label: 'Productos', icon: 'ri-box-3-line' },
            { id: 'movements', label: 'Movimientos', icon: 'ri-exchange-line' },
            { id: 'warehouses', label: 'Almacenes', icon: 'ri-building-line' },
            { id: 'reports', label: 'Reportes', icon: 'ri-file-chart-line' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'products' && renderItems()}
        {activeTab === 'movements' && renderMovements()}
        {activeTab === 'warehouses' && renderWarehouses()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
}