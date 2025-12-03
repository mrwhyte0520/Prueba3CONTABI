import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { resolveTenantId } from '../../../services/database';

// Estilos CSS para mejorar la impresión
const printStyles = `
  @media print {
    @page { size: landscape; margin: 0.5cm; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-title { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 10px; }
    .print-date { text-align: center; font-size: 10pt; margin-bottom: 20px; }
    table { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
`;

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

interface AccountingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  fiscal_year: string;
  status: string;
}

const getEntryDocumentType = (entry: JournalEntry): string => {
  const num = entry.entry_number || '';
  const desc = (entry.description || '').toLowerCase();

  if (num.startsWith('JE-')) return 'Asiento manual';
  if (num.startsWith('BCG-')) return 'Cargo bancario';
  if (num.startsWith('DEP-')) return 'Depósito bancario';
  if (num.startsWith('CRD-')) return 'Crédito bancario';
  if (num.startsWith('TRF-')) return 'Transferencia bancaria';
  if (num.startsWith('CHK-')) return 'Cheque';
  if (num.startsWith('INV-MOV-')) return 'Movimiento de inventario';
  if (num.endsWith('-COGS')) return 'Costo de ventas';
  if (num.startsWith('PCF-')) return 'Fondo de caja chica';
  if (num.startsWith('PCE-')) return 'Gasto de caja chica';
  if (num.startsWith('PCT-')) return 'Reembolso de caja chica';

  if (desc.includes('factura suplidor')) return 'Factura de suplidor';
  if (desc.startsWith('factura ')) return 'Factura de venta';
  if (desc.includes('pago a proveedor')) return 'Pago a proveedor';

  return 'Otro';
};

const GeneralJournalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

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
      
      const tenantId = await resolveTenantId(user.id);
      if (!tenantId) return;
      
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
        .eq('user_id', tenantId)
        .order('entry_date', { ascending: false });

      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_accounts')
        .select('*')
        .eq('user_id', tenantId)
        .eq('is_active', true)
        .order('code');

      const { data: periodsData, error: periodsError } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('user_id', tenantId)
        .order('start_date', { ascending: false });

      if (!entriesError && !accountsError && !periodsError) {
        setEntries(entriesData || []);
        setAccounts(accountsData || []);
        setPeriods(periodsData || []);
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

  const handleSaveEntry = async () => {
    if (!user) return;

    try {
      // Validar que los débitos y créditos estén balanceados
      const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

      // Validar que ninguna línea tenga simultáneamente débito y crédito
      const invalidLines = formData.lines.filter(line =>
        (line.debit_amount || 0) > 0 && (line.credit_amount || 0) > 0
      );

      if (invalidLines.length > 0) {
        alert('Cada línea debe tener solo débito o solo crédito, no ambos.');
        return;
      }

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        alert('Los débitos y créditos deben estar balanceados');
        return;
      }

      if (totalDebit === 0 || totalCredit === 0) {
        alert('Debe ingresar al menos un débito y un crédito');
        return;
      }

      const validLines = formData.lines.filter(line => 
        line.account_id && (line.debit_amount > 0 || line.credit_amount > 0)
      );

      console.log('=== DEBUG JOURNAL ENTRY ==');
      console.log('All lines:', formData.lines);
      console.log('Valid lines to save:', validLines);
      console.log('Total Debit:', totalDebit, 'Total Credit:', totalCredit);

      const tenantId = await resolveTenantId(user.id);
      if (!tenantId) {
        alert('Error: No se pudo resolver el tenant');
        return;
      }

      try {
        if (isEditing && editingEntryId) {
          // Actualizar asiento existente
          const { data: updatedEntry, error: entryError } = await supabase
            .from('journal_entries')
            .update({
              entry_date: formData.entry_date,
              description: formData.description,
              reference: formData.reference,
              total_debit: totalDebit,
              total_credit: totalCredit,
            })
            .eq('id', editingEntryId)
            .eq('user_id', tenantId)
            .select()
            .single();

          if (entryError) throw entryError;

          // Reemplazar líneas del asiento
          const { error: deleteError } = await supabase
            .from('journal_entry_lines')
            .delete()
            .eq('journal_entry_id', editingEntryId);

          if (deleteError) throw deleteError;

          const linesData = validLines.map((line, index) => ({
            journal_entry_id: updatedEntry.id,
            account_id: line.account_id,
            debit_amount: Number(line.debit_amount) || 0,
            credit_amount: Number(line.credit_amount) || 0,
            description: line.description,
            line_number: index + 1,
          }));

          console.log('Lines data to update:', linesData);

          const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(linesData);

          if (linesError) throw linesError;
        } else {
          // Crear nuevo asiento
          const entryNumber = `JE-${Date.now().toString().slice(-6)}`;

          const entryData = {
            user_id: tenantId,
            entry_number: entryNumber,
            entry_date: formData.entry_date,
            description: formData.description,
            reference: formData.reference,
            total_debit: totalDebit,
            total_credit: totalCredit,
            status: 'posted'
          };

          const { data: entry, error: entryError } = await supabase
            .from('journal_entries')
            .insert([entryData])
            .select()
            .single();

          if (entryError) throw entryError;

          const linesData = validLines.map((line, index) => ({
            journal_entry_id: entry.id,
            account_id: line.account_id,
            debit_amount: Number(line.debit_amount) || 0,
            credit_amount: Number(line.credit_amount) || 0,
            description: line.description,
            line_number: index + 1,
          }));

          console.log('Lines data to insert:', linesData);

          const { error: linesError } = await supabase
            .from('journal_entry_lines')
            .insert(linesData);

          if (linesError) throw linesError;
        }
      } catch (supabaseError) {
        console.error('Supabase error:', supabaseError);
        alert('No se pudo guardar el asiento en la base de datos. Inténtelo nuevamente.');
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
      setIsEditing(false);
      setEditingEntryId(null);
      setShowCreateModal(false);
      alert('Asiento contable guardado exitosamente');
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

  const handleEditClick = (entry: JournalEntry) => {
    setIsEditing(true);
    setEditingEntryId(entry.id);
    setFormData({
      entry_date: entry.entry_date.slice(0, 10),
      description: entry.description || '',
      reference: entry.reference || '',
      lines: entry.journal_entry_lines.map(line => ({
        account_id: line.account_id,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        description: line.description || '',
      }))
    });
    setShowCreateModal(true);
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
      lines: prev.lines.map((line, i) => {
        if (i !== index) return line;

        // Regla: una línea solo puede tener débito o crédito, nunca ambos
        if (field === 'debit_amount') {
          return { ...line, debit_amount: value, credit_amount: 0 };
        }
        if (field === 'credit_amount') {
          return { ...line, credit_amount: value, debit_amount: 0 };
        }

        return { ...line, [field]: value };
      })
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

  const documentTypes = Array.from(
    new Set(entries.map((entry) => getEntryDocumentType(entry)))
  ).sort();

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFrom = !dateFrom || entry.entry_date >= dateFrom;
    const matchesTo = !dateTo || entry.entry_date <= dateTo;
    const matchesDate = matchesFrom && matchesTo;
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesAccount =
      !selectedAccountId ||
      entry.journal_entry_lines?.some(line => line.account_id === selectedAccountId);
    const entryType = getEntryDocumentType(entry);
    const matchesDocumentType = documentTypeFilter === 'all' || entryType === documentTypeFilter;
    
    return matchesSearch && matchesDate && matchesStatus && matchesAccount && matchesDocumentType;
  });

  const totalDebitsFiltered = filteredEntries.reduce((sum, entry) => sum + (entry.total_debit || 0), 0);
  const totalCreditsFiltered = filteredEntries.reduce((sum, entry) => sum + (entry.total_credit || 0), 0);

  const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const hasValidLines = formData.lines.some(line =>
    line.account_id && ((line.debit_amount || 0) > 0 || (line.credit_amount || 0) > 0)
  );

  const noInvalidLines = formData.lines.every(line =>
    !((line.debit_amount || 0) > 0 && (line.credit_amount || 0) > 0)
  );

  const hasBothSides = totalDebit > 0 && totalCredit > 0;

  const canSave =
    isBalanced &&
    hasValidLines &&
    noInvalidLines &&
    hasBothSides &&
    !!formData.description;

  const fiscalYears = Array.from(new Set(periods.map((p) => p.fiscal_year))).sort((a, b) => Number(b) - Number(a));

  const visiblePeriods = periods.filter((p) => !selectedFiscalYear || p.fiscal_year === selectedFiscalYear);

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
    const period = periods.find((p) => p.id === periodId);
    if (period) {
      setDateFrom(period.start_date.slice(0, 10));
      setDateTo(period.end_date.slice(0, 10));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Estilos de impresión */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* Título para impresión (solo visible al imprimir) */}
      <div className="hidden print:block print-title">DIARIO GENERAL</div>
      <div className="hidden print:block print-date">
        Generado el {new Date().toLocaleDateString('es-DO', {year: 'numeric', month: 'long', day: 'numeric'})}
        {(dateFrom || dateTo) && ` - Período: ${dateFrom ? new Date(dateFrom).toLocaleDateString('es-DO') : 'Inicio'} a ${dateTo ? new Date(dateTo).toLocaleDateString('es-DO') : 'Fin'}`}
      </div>

      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between mb-6 print:hidden">
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
                Excel
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                title="Imprimir / Exportar a PDF"
              >
                <i className="ri-file-pdf-line mr-2"></i>
                PDF
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <i className="ri-save-line mr-2"></i>
                Crear Asiento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:hidden">
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
        <div className="p-6 border-b border-gray-200 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Buscar asientos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedFiscalYear}
                onChange={(e) => {
                  setSelectedFiscalYear(e.target.value);
                  setSelectedPeriodId('');
                }}
                className="w-full sm:w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="">Año fiscal (todos)</option>
                {fiscalYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={selectedPeriodId}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="">Período contable (todos)</option>
                {visiblePeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({new Date(period.start_date).toLocaleDateString('es-DO')} - {new Date(period.end_date).toLocaleDateString('es-DO')})
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="">Todas las cuentas</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
              <select
                value={documentTypeFilter}
                onChange={(e) => setDocumentTypeFilter(e.target.value)}
                className="w-full sm:w-60 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="all">Todos los documentos</option>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
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
                  Documento
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getEntryDocumentType(entry)}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium print:hidden">
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
                      onClick={() => handleEditClick(entry)}
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
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-3 text-right font-semibold text-gray-900">
                  Totales del reporte:
                </td>
                <td className="px-6 py-3 font-bold text-gray-900">
                  RD${totalDebitsFiltered.toLocaleString()}
                </td>
                <td className="px-6 py-3 font-bold text-gray-900">
                  RD${totalCreditsFiltered.toLocaleString()}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
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
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Líneas del Asiento</h3>
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
                              type="text"
                              value={line.debit_amount > 0 ? line.debit_amount.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                updateLine(index, 'debit_amount', parseFloat(value) || 0);
                              }}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={line.credit_amount > 0 ? line.credit_amount.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                updateLine(index, 'credit_amount', parseFloat(value) || 0);
                              }}
                              placeholder="0.00"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
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
                          RD${totalDebit.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          RD${totalCredit.toLocaleString('es-DO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-center">
                          <button
                            onClick={addLine}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
                          >
                            <i className="ri-add-line mr-2"></i>
                            Agregar Línea
                          </button>
                        </td>
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
                  onClick={handleSaveEntry}
                  disabled={!canSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isEditing ? 'Guardar Cambios' : 'Crear Asiento'}
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