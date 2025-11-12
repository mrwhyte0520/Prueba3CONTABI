import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function QuotesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [quotes, setQuotes] = useState([
    {
      id: 1,
      number: 'RFQ-2024-001',
      date: '2024-01-15',
      title: 'Materiales para Proyecto Industrial',
      description: 'Solicitud de cotización para materiales industriales específicos del proyecto Q1',
      requestedBy: 'Juan Pérez',
      estimatedAmount: 125000,
      suppliers: [
        {
          name: 'Proveedor Industrial SA',
          amount: 125000,
          deliveryTime: '15 días',
          notes: 'Incluye instalación básica',
          status: 'Recibida'
        },
        {
          name: 'Distribuidora Nacional SRL',
          amount: 135000,
          deliveryTime: '20 días',
          notes: 'Garantía extendida incluida',
          status: 'Pendiente'
        }
      ],
      dueDate: '2024-01-25',
      status: 'En Evaluación',
      selectedSupplier: null,
      category: 'Materiales',
      specifications: 'Materiales de alta calidad para proyecto industrial',
      responses: [
        {
          supplier: 'Proveedor Industrial SA',
          amount: 125000,
          deliveryTime: '15 días',
          status: 'Recibida'
        },
        {
          supplier: 'Distribuidora Nacional SRL',
          amount: 135000,
          deliveryTime: '20 días',
          status: 'Pendiente'
        }
      ]
    },
    {
      id: 2,
      number: 'RFQ-2024-002',
      date: '2024-01-14',
      title: 'Servicios de Mantenimiento Anual',
      description: 'Cotización para servicios de mantenimiento preventivo y correctivo',
      requestedBy: 'María García',
      estimatedAmount: 85000,
      suppliers: [
        {
          name: 'Servicios Técnicos EIRL',
          amount: 85000,
          deliveryTime: '7 días',
          notes: 'Servicio 24/7 incluido',
          status: 'Recibida'
        }
      ],
      dueDate: '2024-01-20',
      status: 'Aprobada',
      selectedSupplier: 'Servicios Técnicos EIRL',
      category: 'Servicios',
      specifications: 'Mantenimiento preventivo y correctivo completo',
      responses: [
        {
          supplier: 'Servicios Técnicos EIRL',
          amount: 85000,
          deliveryTime: '7 días',
          status: 'Seleccionada'
        }
      ]
    },
    {
      id: 3,
      number: 'RFQ-2024-003',
      date: '2024-01-13',
      title: 'Equipos de Construcción',
      description: 'Solicitud de cotización para equipos de construcción especializados',
      requestedBy: 'Carlos Rodríguez',
      estimatedAmount: 245000,
      suppliers: [
        {
          name: 'Materiales Construcción SA',
          amount: 245000,
          deliveryTime: '30 días',
          notes: 'Equipos nuevos con garantía',
          status: 'Recibida'
        },
        {
          name: 'Proveedor Industrial SA',
          amount: 220000,
          deliveryTime: '25 días',
          notes: 'Equipos seminuevos certificados',
          status: 'Recibida'
        }
      ],
      dueDate: '2024-01-28',
      status: 'Rechazada',
      selectedSupplier: null,
      category: 'Equipos',
      specifications: 'Equipos de construcción especializados con certificación',
      responses: [
        {
          supplier: 'Materiales Construcción SA',
          amount: 245000,
          deliveryTime: '30 días',
          status: 'Rechazada'
        },
        {
          supplier: 'Proveedor Industrial SA',
          amount: 220000,
          deliveryTime: '25 días',
          status: 'Rechazada'
        }
      ]
    }
  ]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Materiales',
    dueDate: '',
    estimatedAmount: '',
    specifications: '',
    suppliers: ['']
  });

  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const suppliers = [
    'Proveedor Industrial SA',
    'Distribuidora Nacional SRL',
    'Servicios Técnicos EIRL',
    'Materiales Construcción SA'
  ];

  const categories = ['Materiales', 'Servicios', 'Equipos', 'Tecnología', 'Construcción'];

  const filteredQuotes = quotes.filter(quote => {
    return filterStatus === 'all' || quote.status === filterStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const suppliersArray = formData.suppliers.filter(s => s.trim() !== '').map(supplier => ({
      name: supplier,
      amount: 0,
      deliveryTime: '',
      notes: '',
      status: 'Pendiente'
    }));

    if (editingQuote) {
      setQuotes(quotes.map(quote => 
        quote.id === editingQuote.id 
          ? { 
              ...quote, 
              title: formData.title,
              description: formData.description,
              category: formData.category,
              dueDate: formData.dueDate,
              suppliers: suppliersArray
            }
          : quote
      ));
    } else {
      const newQuote = {
        id: quotes.length + 1,
        number: `RFQ-2024-${String(quotes.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        title: formData.title,
        description: formData.description,
        suppliers: suppliersArray,
        dueDate: formData.dueDate,
        status: 'Pendiente',
        selectedSupplier: null,
        category: formData.category
      };
      setQuotes([...quotes, newQuote]);
    }
    
    resetForm();
    alert(editingQuote ? 'Solicitud de cotización actualizada exitosamente' : 'Solicitud de cotización creada exitosamente');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Materiales',
      dueDate: '',
      suppliers: ['']
    });
    setEditingQuote(null);
    setShowModal(false);
  };

  const handleEdit = (quote: any) => {
    setEditingQuote(quote);
    setFormData({
      title: quote.title,
      description: quote.description,
      category: quote.category,
      dueDate: quote.dueDate,
      suppliers: quote.suppliers.map((s: any) => s.name)
    });
    setShowModal(true);
  };

  const handleApprove = (id: number) => {
    if (confirm('¿Aprobar esta solicitud de cotización?')) {
      setQuotes(quotes.map(quote => 
        quote.id === id ? { ...quote, status: 'Aprobada' } : quote
      ));
      alert('Solicitud de cotización aprobada exitosamente');
    }
  };

  const handleReject = (id: number) => {
    if (confirm('¿Rechazar esta solicitud de cotización?')) {
      setQuotes(quotes.map(quote => 
        quote.id === id ? { ...quote, status: 'Rechazada' } : quote
      ));
      alert('Solicitud de cotización rechazada');
    }
  };

  const addSupplier = () => {
    setFormData({
      ...formData,
      suppliers: [...formData.suppliers, '']
    });
  };

  const removeSupplier = (index: number) => {
    if (formData.suppliers.length > 1) {
      setFormData({
        ...formData,
        suppliers: formData.suppliers.filter((_, i) => i !== index)
      });
    }
  };

  const updateSupplier = (index: number, value: string) => {
    const updatedSuppliers = formData.suppliers.map((supplier, i) =>
      i === index ? value : supplier
    );
    setFormData({ ...formData, suppliers: updatedSuppliers });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Solicitudes de Cotización', 20, 20);
    
    // Información del reporte
    doc.setFontSize(12);
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Total de Solicitudes: ${filteredQuotes.length}`, 20, 50);
    
    // Preparar datos para la tabla
    const tableData = filteredQuotes.map(quote => [
      quote.number,
      quote.date,
      quote.title,
      quote.category,
      quote.dueDate,
      quote.status,
      quote.suppliers.length.toString()
    ]);

    // Crear la tabla
    doc.autoTable({
      head: [['Número', 'Fecha', 'Título', 'Categoría', 'Vencimiento', 'Estado', 'Proveedores']],
      body: tableData,
      startY: 70,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { cellWidth: 40 },
        6: { halign: 'center' }
      }
    });

    // Detalle de proveedores por cotización
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Detalle de Proveedores por Cotización', 20, 20);

    let startY = 40;
    filteredQuotes.forEach((quote, quoteIndex) => {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(12);
      doc.text(`${quote.number} - ${quote.title}`, 20, startY);
      startY += 10;

      if (quote.suppliers.length > 0) {
        const supplierData = quote.suppliers.map(supplier => [
          supplier.name,
          supplier.amount > 0 ? `RD$ ${supplier.amount.toLocaleString()}` : 'Pendiente',
          supplier.deliveryTime || 'N/A',
          supplier.status
        ]);

        doc.autoTable({
          head: [['Proveedor', 'Monto', 'Tiempo Entrega', 'Estado']],
          body: supplierData,
          startY: startY,
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94], fontSize: 10 },
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 }
        });

        startY = doc.lastAutoTable.finalY + 15;
      } else {
        startY += 10;
      }
    });

    // Estadísticas
    const pendingQuotes = filteredQuotes.filter(q => q.status === 'Pendiente').length;
    const approvedQuotes = filteredQuotes.filter(q => q.status === 'Aprobada').length;
    const rejectedQuotes = filteredQuotes.filter(q => q.status === 'Rechazada').length;

    doc.addPage();
    doc.setFontSize(16);
    doc.text('Estadísticas', 20, 20);

    doc.autoTable({
      body: [
        ['Solicitudes Pendientes:', `${pendingQuotes}`],
        ['Solicitudes Aprobadas:', `${approvedQuotes}`],
        ['Solicitudes Rechazadas:', `${rejectedQuotes}`],
        ['Total Solicitudes:', `${filteredQuotes.length}`]
      ],
      startY: 40,
      theme: 'plain',
      styles: { fontStyle: 'bold' }
    });

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 50, doc.internal.pageSize.height - 10);
      doc.text('Sistema Contable - Solicitudes de Cotización', 20, doc.internal.pageSize.height - 10);
    }

    doc.save(`solicitudes-cotizacion-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    let csvContent = 'Solicitudes de Cotización\n\n';
    csvContent += 'Número,Fecha,Título,Descripción,Categoría,Fecha Vencimiento,Estado,Proveedor Seleccionado\n';
    
    filteredQuotes.forEach(quote => {
      csvContent += `${quote.number},${quote.date},"${quote.title}","${quote.description}","${quote.category}",${quote.dueDate},"${quote.status}","${quote.selectedSupplier || 'N/A'}"\n`;
    });

    // Detalle de proveedores
    csvContent += '\n\nDetalle de Proveedores\n';
    csvContent += 'Cotización,Proveedor,Monto,Tiempo Entrega,Notas,Estado\n';
    
    filteredQuotes.forEach(quote => {
      quote.suppliers.forEach(supplier => {
        csvContent += `${quote.number},"${supplier.name}",${supplier.amount},"${supplier.deliveryTime}","${supplier.notes}","${supplier.status}"\n`;
      });
    });

    // Estadísticas
    const pendingQuotes = filteredQuotes.filter(q => q.status === 'Pendiente').length;
    const approvedQuotes = filteredQuotes.filter(q => q.status === 'Aprobada').length;
    const rejectedQuotes = filteredQuotes.filter(q => q.status === 'Rechazada').length;

    csvContent += `\nEstadísticas\n`;
    csvContent += `Solicitudes Pendientes,${pendingQuotes}\n`;
    csvContent += `Solicitudes Aprobadas,${approvedQuotes}\n`;
    csvContent += `Solicitudes Rechazadas,${rejectedQuotes}\n`;
    csvContent += `Total Solicitudes,${filteredQuotes.length}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `solicitudes-cotizacion-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQuote = (quote: any) => {
    alert(`Imprimiendo solicitud de cotización: ${quote.number}`);
  };

  const handleViewDetails = (quote: any) => {
    setSelectedQuote(quote);
  };

  const sendQuoteRequest = (quote: any) => {
    alert(`Enviando solicitud de cotización ${quote.number} a proveedores`);
  };

  const handleEvaluate = (id: number) => {
    if (confirm('¿Cambiar estado a En Evaluación?')) {
      setQuotes(quotes.map(quote => 
        quote.id === id ? { ...quote, status: 'En Evaluación' } : quote
      ));
      alert('Estado cambiado a En Evaluación');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Cotización</h1>
            <p className="text-gray-600">Gestiona solicitudes y comparación de cotizaciones</p>
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
              Nueva Solicitud
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-file-list-line text-xl text-blue-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Solicitudes</p>
                <p className="text-2xl font-bold text-gray-900">{quotes.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">{quotes.filter(q => q.status === 'Pendiente').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <i className="ri-search-line text-xl text-purple-600"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">En Evaluación</p>
                <p className="text-2xl font-bold text-gray-900">{quotes.filter(q => q.status === 'En Evaluación').length}</p>
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
                <p className="text-2xl font-bold text-gray-900">{quotes.filter(q => q.status === 'Aprobada').length}</p>
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
                <option value="En Evaluación">En Evaluación</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
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

        {/* Quotes Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lista de Solicitudes de Cotización</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitado por</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Est.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quote.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{quote.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.requestedBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{quote.dueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      RD$ {quote.estimatedAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        quote.status === 'Aprobada' ? 'bg-green-100 text-green-800' :
                        quote.status === 'Pendiente' ? 'bg-orange-100 text-orange-800' :
                        quote.status === 'En Evaluación' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewDetails(quote)}
                          className="text-blue-600 hover:text-blue-900 whitespace-nowrap"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        <button 
                          onClick={() => sendQuoteRequest(quote)}
                          className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                        >
                          <i className="ri-mail-send-line"></i>
                        </button>
                        {quote.status === 'Pendiente' && (
                          <button 
                            onClick={() => handleEvaluate(quote.id)}
                            className="text-purple-600 hover:text-purple-900 whitespace-nowrap"
                          >
                            <i className="ri-search-line"></i>
                          </button>
                        )}
                        {quote.status === 'En Evaluación' && (
                          <>
                            <button 
                              onClick={() => handleApprove(quote.id)}
                              className="text-green-600 hover:text-green-900 whitespace-nowrap"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button 
                              onClick={() => handleReject(quote.id)}
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

        {/* New Quote Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Nueva Solicitud de Cotización</h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción *</label>
                  <textarea 
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe los productos o servicios que necesitas..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monto Estimado</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.estimatedAmount}
                      onChange={(e) => setFormData({...formData, estimatedAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Límite *</label>
                    <input 
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Suppliers */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Proveedores a Contactar *</label>
                    <button 
                      type="button"
                      onClick={addSupplier}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 whitespace-nowrap"
                    >
                      <i className="ri-add-line mr-1"></i>
                      Agregar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.suppliers.map((supplier, index) => (
                      <div key={index} className="flex gap-2">
                        <select 
                          required
                          value={supplier}
                          onChange={(e) => updateSupplier(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleccionar proveedor</option>
                          {suppliers.map(sup => (
                            <option key={sup} value={sup}>{sup}</option>
                          ))}
                        </select>
                        {formData.suppliers.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeSupplier(index)}
                            className="text-red-600 hover:text-red-900 px-2 whitespace-nowrap"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especificaciones Adicionales</label>
                  <textarea 
                    value={formData.specifications}
                    onChange={(e) => setFormData({...formData, specifications: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Especificaciones técnicas, términos de entrega, etc..."
                  />
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
                    Crear Solicitud
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quote Details Modal */}
        {selectedQuote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Detalles de Cotización - {selectedQuote.number}</h3>
                  <button 
                    onClick={() => setSelectedQuote(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Número</p>
                    <p className="text-sm text-gray-900">{selectedQuote.number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fecha</p>
                    <p className="text-sm text-gray-900">{selectedQuote.date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Solicitado por</p>
                    <p className="text-sm text-gray-900">{selectedQuote.requestedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fecha Límite</p>
                    <p className="text-sm text-gray-900">{selectedQuote.dueDate}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-600">Descripción</p>
                    <p className="text-sm text-gray-900">{selectedQuote.description}</p>
                  </div>
                </div>

                {/* Responses */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Respuestas de Proveedores</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo Entrega</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedQuote.responses.map((response: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.supplier}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                              {response.amount > 0 ? `RD$ ${response.amount.toLocaleString()}` : 'Pendiente'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{response.deliveryTime || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                response.status === 'Recibida' ? 'bg-green-100 text-green-800' :
                                response.status === 'Seleccionada' ? 'bg-blue-100 text-blue-800' :
                                response.status === 'Rechazada' ? 'bg-red-100 text-red-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {response.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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