import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string;
  total_debit: number;
  total_credit: number;
  status: string;
  created_at: string;
  journal_entry_lines: Array<{
    id: string;
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    description: string;
    chart_accounts: {
      code: string;
      name: string;
    };
  }>;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

const GeneralJournalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Formulario para nuevo asiento
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    lines: [
      { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
      { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
    ]
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Intentar cargar desde Supabase
      const { data: entriesData, error: entriesError } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_accounts (
              code,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('code');

      if (!entriesError && !accountsError) {
        setEntries(entriesData || []);
        setAccounts(accountsData || []);
      } else {
        throw new Error('Error loading from Supabase');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Cargar datos de ejemplo si hay error
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setEntries([]);
    setAccounts([]);
  };

  const handleCreateEntry = async () => {
    if (!user) return;

    try {
      // Validar que los débitos y créditos estén balanceados
      const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        alert('Los débitos y créditos deben estar balanceados');
        return;
      }

      if (totalDebit === 0 || totalCredit === 0) {
        alert('Debe ingresar al menos un débito y un crédito');
        return;
      }

      // Generar número de asiento
      const entryNumber = `JE-${Date.now().toString().slice(-6)}`;

      const entryData = {
        user_id: user.id,
        entry_number: entryNumber,
        entry_date: formData.entry_date,
        description: formData.description,
        reference: formData.reference,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'posted'
      };

      try {
        const { data: entry, error: entryError } = await supabase
          .from('journal_entries')
          .insert([entryData])
          .select()
          .single();

        if (entryError) throw entryError;

        // Crear líneas del asiento
        const validLines = formData.lines.filter(line => 
          line.account_id && (line.debit_amount > 0 || line.credit_amount > 0)
        );

        const linesData = validLines.map((line, index) => ({
          journal_entry_id: entry.id,
          account_id: line.account_id,
          debit_amount: line.debit_amount || 0,
          credit_amount: line.credit_amount || 0,
          description: line.description,
          line_number: index + 1,
        }));

        const { error: linesError } = await supabase
          .from('journal_entry_lines')
          .insert(linesData);

        if (linesError) throw linesError;
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        alert('No se pudo crear el asiento en la base de datos. Inténtelo nuevamente.');
        return;
      }
      
      // Resetear formulario
      setFormData({
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        lines: [
          { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
          { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
        ]
      });
      
      setShowCreateModal(false);
      alert('Asiento contable creado exitosamente');
      loadData();
    } catch (error) {
      console.error('Error creating entry:', error);
      alert('Error al crear el asiento contable');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este asiento? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      alert('Asiento eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting entry:', error);
      // Eliminar localmente si Supabase falla
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      alert('Asiento eliminado exitosamente');
    }
  };

  const downloadExcel = () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Diario General\n';
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Número,Fecha,Descripción,Referencia,Débito,Crédito,Estado\n';
      
      filteredEntries.forEach(entry => {
        const row = [
          entry.entry_number,
          new Date(entry.entry_date).toLocaleDateString(),
          `"${entry.description}"`,
          entry.reference,
          entry.total_debit.toLocaleString(),
          entry.total_credit.toLocaleString(),
          entry.status === 'posted' ? 'Contabilizado' : entry.status === 'draft' ? 'Borrador' : 'Reversado'
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar detalle de líneas
      csvContent += '\n\nDetalle de Líneas:\n';
      csvContent += 'Asiento,Cuenta,Descripción,Débito,Crédito\n';
      
      filteredEntries.forEach(entry => {
        entry.journal_entry_lines?.forEach(line => {
          const detailRow = [
            entry.entry_number,
            `${line.chart_accounts?.code} - ${line.chart_accounts?.name}`,
            `"${line.description}"`,
            line.debit_amount > 0 ? line.debit_amount.toLocaleString() : '',
            line.credit_amount > 0 ? line.credit_amount.toLocaleString() : ''
          ].join(',');
          csvContent += detailRow + '\n';
        });
      });

      // Agregar resumen
      csvContent += '\nResumen:\n';
      csvContent += `Total Asientos:,${filteredEntries.length}\n`;
      csvContent += `Total Débitos:,RD$${filteredEntries.reduce((sum, entry) => sum + entry.total_debit, 0).toLocaleString()}\n`;
      csvContent += `Total Créditos:,RD$${filteredEntries.reduce((sum, entry) => sum + entry.total_credit, 0).toLocaleString()}\n`;

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `diario_general_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]
    }));
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 2) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLine = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  const exportToExcel = () => {
    try {
      // Preparar los datos para la exportación
      const dataToExport = entries.flatMap(entry => {
        return entry.journal_entry_lines.map(line => ({
          'Fecha': new Date(entry.entry_date).toLocaleDateString('es-ES'),
          'Número Asiento': entry.entry_number,
          'Descripción': entry.description,
          'Referencia': entry.reference,
          'Cuenta': `${line.chart_accounts.code} - ${line.chart_accounts.name}`,
          'Débito': line.debit_amount || '',
          'Crédito': line.credit_amount || '',
          'Estado': entry.status === 'posted' ? 'Publicado' : 'Borrador'
        }));
      });

      // Crear un nuevo libro de trabajo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Ajustar el ancho de las columnas
      const colWidths = [
        { wch: 12 }, // Fecha
        { wch: 15 }, // Número Asiento
        { wch: 30 }, // Descripción
        { wch: 15 }, // Referencia
        { wch: 40 }, // Cuenta
        { wch: 15 }, // Débito
        { wch: 15 }, // Crédito
        { wch: 12 }  // Estado
      ];
      ws['!cols'] = colWidths;

      // Agregar la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Libro Diario');

      // Generar el archivo Excel
      const fileName = `libro_diario_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al generar el archivo Excel. Por favor, intente nuevamente.');
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFrom = !dateFrom || entry.entry_date >= dateFrom;
    const matchesTo = !dateTo || entry.entry_date <= dateTo;
    const matchesDate = matchesFrom && matchesTo;
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    return matchesSearch && matchesDate && matchesStatus;
  });

  const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/accounting')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="ri-arrow-left-line"></i>
            Volver a Contabilidad
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diario General</h1>
            <p className="text-gray-600">Gestión de asientos contables</p>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                title="Exportar a Excel"
              >
                <i className="ri-file-excel-2-line mr-2"></i>
                Exportar Excel
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <i className="ri-add-line mr-2"></i>
                Nuevo Asiento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <i className="ri-file-list-3-line text-2xl text-blue-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Asientos</p>
              <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <i className="ri-arrow-up-line text-2xl text-green-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Débitos</p>
              <p className="text-2xl font-bold text-gray-900">
                RD${entries.reduce((sum, entry) => sum + entry.total_debit, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <i className="ri-arrow-down-line text-2xl text-red-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Créditos</p>
              <p className="text-2xl font-bold text-gray-900">
                RD${entries.reduce((sum, entry) => sum + entry.total_credit, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <i className="ri-calendar-line text-2xl text-purple-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Este Mes</p>
              <p className="text-2xl font-bold text-gray-900">
                {entries.filter(entry => 
                  entry.entry_date.startsWith(new Date().toISOString().slice(0, 7))
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar asientos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="posted">Contabilizado</option>
                <option value="reversed">Reversado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Journal Entries Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Débito
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crédito
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
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {entry.entry_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(entry.entry_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RD${entry.total_debit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RD${entry.total_credit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      entry.status === 'posted' 
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {entry.status === 'posted' ? 'Contabilizado' : 
                       entry.status === 'draft' ? 'Borrador' : 'Reversado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Ver detalles"
                    >
                      <i className="ri-eye-line"></i>
                    </button>
                    <button 
                      className="text-gray-600 hover:text-gray-900 mr-3" 
                      title="Editar"
                      onClick={() => alert('Función de edición en desarrollo')}
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900" 
                      title="Eliminar"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Nuevo Asiento Contable</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Entry Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Número de documento"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado Balance
                  </label>
                  <div className={`px-3 py-2 rounded-lg text-center font-medium ${
                    isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isBalanced ? 'Balanceado' : 'Desbalanceado'}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del asiento contable"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Entry Lines */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Líneas del Asiento</h3>
                  <button
                    onClick={addLine}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Agregar Línea
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cuenta
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Débito
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Crédito
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.lines.map((line, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <select
                              value={line.account_id}
                              onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Seleccionar cuenta</option>
                              {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateLine(index, 'description', e.target.value)}
                              placeholder="Descripción de la línea"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={line.debit_amount || ''}
                              onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={line.credit_amount || ''}
                              onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {formData.lines.length > 2 && (
                              <button
                                onClick={() => removeLine(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-right font-medium text-gray-900">
                          Totales:
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          RD${totalDebit.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          RD${totalCredit.toLocaleString()}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateEntry}
                  disabled={!isBalanced || !formData.description}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Crear Asiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalle del Asiento {selectedEntry.entry_number}
                </h2>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Fecha:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {new Date(selectedEntry.entry_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Referencia:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedEntry.reference}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedEntry.status === 'posted' 
                          ? 'bg-green-100 text-green-800'
                          : selectedEntry.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedEntry.status === 'posted' ? 'Contabilizado' : 
                         selectedEntry.status === 'draft' ? 'Borrador' : 'Reversado'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Totales</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Débito:</span>
                      <span className="ml-2 text-sm font-bold text-gray-900">
                        RD${selectedEntry.total_debit.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Crédito:</span>
                      <span className="ml-2 text-sm font-bold text-gray-900">
                        RD${selectedEntry.total_credit.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Diferencia:</span>
                      <span className="ml-2 text-sm font-bold text-green-600">
                        RD${Math.abs(selectedEntry.total_debit - selectedEntry.total_credit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Descripción</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedEntry.description}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Líneas del Asiento</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cuenta
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Débito
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Crédito
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedEntry.journal_entry_lines?.map((line, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {line.chart_accounts?.code} - {line.chart_accounts?.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {line.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {line.debit_amount > 0 ? `RD$${line.debit_amount.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {line.credit_amount > 0 ? `RD$${line.credit_amount.toLocaleString()}` : '-'}
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
  );
};

export default GeneralJournalPage;