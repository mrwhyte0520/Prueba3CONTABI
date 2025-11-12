import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function SuppliersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const [suppliers, setSuppliers] = useState([
    {
      id: 1,
      name: 'Proveedor Industrial SA',
      rnc: '101234567',
      phone: '(809) 555-0101',
      email: 'ventas@proveedorindustrial.com',
      address: 'Av. Industrial No. 123, Santo Domingo',
      category: 'Materiales',
      creditLimit: 500000,
      balance: 350000,
      status: 'Activo',
      paymentTerms: '30 días',
      contact: 'Juan Rodríguez'
    },
    {
      id: 2,
      name: 'Distribuidora Nacional SRL',
      rnc: '201234567',
      phone: '(809) 555-0202',
      email: 'compras@distribuidoranacional.com',
      address: 'Calle Principal No. 456, Santiago',
      category: 'Distribución',
      creditLimit: 300000,
      balance: 280000,
      status: 'Activo',
      paymentTerms: '15 días',
      contact: 'María García'
    },
    {
      id: 3,
      name: 'Servicios Técnicos EIRL',
      rnc: '301234567',
      phone: '(829) 555-0303',
      email: 'info@serviciotecnico.com',
      address: 'Zona Industrial, La Vega',
      category: 'Servicios',
      creditLimit: 200000,
      balance: 195000,
      status: 'Activo',
      paymentTerms: '21 días',
      contact: 'Pedro Martínez'
    },
    {
      id: 4,
      name: 'Materiales Construcción SA',
      rnc: '401234567',
      phone: '(849) 555-0404',
      email: 'ventas@materialesconstruccion.com',
      address: 'Autopista Duarte Km 15, Santo Domingo Norte',
      category: 'Construcción',
      creditLimit: 400000,
      balance: 165000,
      status: 'Inactivo',
      paymentTerms: '45 días',
      contact: 'Ana López'
    }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    rnc: '',
    phone: '',
    email: '',
    address: '',
    category: 'Materiales',
    creditLimit: '',
    paymentTerms: '30 días',
    contact: ''
  });

  const categories = ['Materiales', 'Distribución', 'Servicios', 'Construcción', 'Tecnología'];
  const paymentTermsOptions = ['15 días', '21 días', '30 días', '45 días', '60 días'];

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesCategory = filterCategory === 'all' || supplier.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.rnc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      setSuppliers(suppliers.map(supplier => 
        supplier.id === editingSupplier.id 
          ? { 
              ...supplier, 
              ...formData,
              creditLimit: parseFloat(formData.creditLimit),
            }
          : supplier
      ));
    } else {
      const newSupplier = {
        id: suppliers.length + 1,
        ...formData,
        creditLimit: parseFloat(formData.creditLimit),
        balance: 0,
        status: 'Activo'
      };
      setSuppliers([...suppliers, newSupplier]);
    }
    
    resetForm();
    alert(editingSupplier ? 'Proveedor actualizado exitosamente' : 'Proveedor creado exitosamente');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rnc: '',
      phone: '',
      email: '',
      address: '',
      category: 'Materiales',
      creditLimit: '',
      paymentTerms: '30 días',
      contact: ''
    });
    setEditingSupplier(null);
    setShowModal(false);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      rnc: supplier.rnc,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      category: supplier.category,
      creditLimit: supplier.creditLimit.toString(),
      paymentTerms: supplier.paymentTerms,
      contact: supplier.contact
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      setSuppliers(suppliers.filter(supplier => supplier.id !== id));
      alert('Proveedor eliminado exitosamente');
    }
  };

  const toggleStatus = (id: number) => {
    setSuppliers(suppliers.map(supplier => 
      supplier.id === id 
        ? { ...supplier, status: supplier.status === 'Activo' ? 'Inactivo' : 'Activo' }
        : supplier
    ));
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Lista de Proveedores', 20, 20);
    
    // Información del reporte
    doc.setFontSize(12);
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Total de Proveedores: ${filteredSuppliers.length}`, 20, 50);
    
    // Preparar datos para la tabla
    const tableData = filteredSuppliers.map(supplier => [
      supplier.name,
      supplier.rnc,
      supplier.phone,
      supplier.category,
      `RD$ ${supplier.creditLimit.toLocaleString()}`,
      `RD$ ${supplier.balance.toLocaleString()}`,
      supplier.status
    ]);

    // Crear la tabla
    doc.autoTable({
      head: [['Nombre', 'RNC', 'Teléfono', 'Categoría', 'Límite Crédito', 'Balance', 'Estado']],
      body: tableData,
      startY: 70,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 20, halign: 'center' }
      }
    });

    // Estadísticas adicionales
    const totalCreditLimit = filteredSuppliers.reduce((sum, s) => sum + s.creditLimit, 0);
    const totalBalance = filteredSuppliers.reduce((sum, s) => sum + s.balance, 0);
    const activeSuppliers = filteredSuppliers.filter(s => s.status === 'Activo').length;

    doc.autoTable({
      body: [
        ['Total Límite de Crédito:', `RD$ ${totalCreditLimit.toLocaleString()}`],
        ['Total Balance Actual:', `RD$ ${totalBalance.toLocaleString()}`],
        ['Proveedores Activos:', `${activeSuppliers} de ${filteredSuppliers.length}`]
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
      doc.text('Sistema Contable - Gestión de Proveedores', 20, doc.internal.pageSize.height - 10);
    }

    doc.save(`proveedores-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    let csvContent = 'Lista de Proveedores\n\n';
    csvContent += 'Nombre,RNC,Teléfono,Email,Dirección,Categoría,Límite Crédito,Balance Actual,Estado,Términos de Pago,Contacto\n';
    
    filteredSuppliers.forEach(supplier => {
      csvContent += `"${supplier.name}","${supplier.rnc}","${supplier.phone}","${supplier.email}","${supplier.address}","${supplier.category}",${supplier.creditLimit},${supplier.balance},"${supplier.status}","${supplier.paymentTerms}","${supplier.contact}"\n`;
    });

    // Estadísticas
    const totalCreditLimit = filteredSuppliers.reduce((sum, s) => sum + s.creditLimit, 0);
    const totalBalance = filteredSuppliers.reduce((sum, s) => sum + s.balance, 0);
    const activeSuppliers = filteredSuppliers.filter(s => s.status === 'Activo').length;

    csvContent += `\nEstadísticas\n`;
    csvContent += `Total Límite de Crédito,${totalCreditLimit}\n`;
    csvContent += `Total Balance Actual,${totalBalance}\n`;
    csvContent += `Proveedores Activos,${activeSuppliers}\n`;
    csvContent += `Total Proveedores,${filteredSuppliers.length}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `proveedores-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDetails = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Proveedores</h1>
            <p className="text-gray-600">Base de datos de proveedores y vendedores</p>
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
              Nuevo Proveedor
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-truck-line text-xl text-blue-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Proveedores</p>
                <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-check-line text-xl text-green-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">{suppliers.filter(s => s.status === 'Activo').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-money-dollar-circle-line text-xl text-orange-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Balance Total</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {suppliers.reduce((sum, s) => sum + s.balance, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-credit-card-line text-xl text-purple-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Crédito Disponible</p>
                <p className="text-2xl font-bold text-gray-900">RD$ {suppliers.reduce((sum, s) => sum + (s.creditLimit - s.balance), 0).toLocaleString()}</p>
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
                  placeholder="Buscar por nombre, RNC o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => {setSearchTerm(''); setFilterStatus('all');}}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Proveedores</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RNC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Límite Crédito</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-500">{supplier.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{supplier.rnc}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {supplier.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      RD$ {supplier.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      RD$ {supplier.creditLimit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        supplier.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewDetails(supplier)}
                          className="text-blue-600 hover:text-blue-900 whitespace-nowrap"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button 
                          onClick={() => handleEdit(supplier)}
                          className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(supplier.id)}
                          className="text-red-600 hover:text-red-900 whitespace-nowrap"
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

        {/* Details Modal */}
        {showDetailsModal && selectedSupplier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Detalles del Proveedor</h3>
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Nombre</h4>
                    <p className="text-gray-900">{selectedSupplier.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">RNC</h4>
                    <p className="text-gray-900">{selectedSupplier.rnc}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                    <p className="text-gray-900">{selectedSupplier.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Teléfono</h4>
                    <p className="text-gray-900">{selectedSupplier.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Dirección</h4>
                    <p className="text-gray-900">{selectedSupplier.address}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Categoría</h4>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {selectedSupplier.category}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Estado</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      selectedSupplier.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedSupplier.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Límite de Crédito</h4>
                    <p className="text-gray-900">RD$ {selectedSupplier.creditLimit.toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Balance Actual</h4>
                    <p className="text-gray-900">RD$ {selectedSupplier.balance.toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Términos de Pago</h4>
                    <p className="text-gray-900">{selectedSupplier.paymentTerms}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Contacto</h4>
                    <p className="text-gray-900">{selectedSupplier.contact}</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button 
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedSupplier);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                    <input 
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RNC *</label>
                    <input 
                      type="text"
                      required
                      value={formData.rnc}
                      onChange={(e) => setFormData({...formData, rnc: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                    <input 
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                    <textarea 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Límite de Crédito</label>
                    <input 
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({...formData, creditLimit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Términos de Pago</label>
                    <select 
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {paymentTermsOptions.map(term => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
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
                    {editingSupplier ? 'Actualizar' : 'Crear'} Proveedor
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