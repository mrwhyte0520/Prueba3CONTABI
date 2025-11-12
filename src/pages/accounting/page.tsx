import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { chartAccountsService, journalEntriesService } from '../../services/database';
import { useAuth } from '../../hooks/useAuth';

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
  journal_entry_lines?: any[];
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  is_active: boolean;
  normal_balance: string;
  allow_posting: boolean;
  level: number;
}

export default function AccountingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const [journalForm, setJournalForm] = useState({
    entry_number: '',
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    lines: [
      { account_id: '', description: '', debit: '', credit: '' },
      { account_id: '', description: '', debit: '', credit: '' }
    ]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsData, entriesData] = await Promise.all([
        chartAccountsService.getAll(user?.id || ''),
        journalEntriesService.getAll(user?.id || '')
      ]);
      
      setAccounts(accountsData);
      setJournalEntries(entriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEntryNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `JE-${timestamp}`;
  };

  const handleAddJournalLine = () => {
    setJournalForm(prev => ({
      ...prev,
      lines: [...prev.lines, { account_id: '', description: '', debit: '', credit: '' }]
    }));
  };

  const handleRemoveJournalLine = (index: number) => {
    if (journalForm.lines.length > 2) {
      setJournalForm(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index)
      }));
    }
  };

  const handleJournalLineChange = (index: number, field: string, value: string) => {
    setJournalForm(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
  };

  const calculateTotals = () => {
    const totalDebit = journalForm.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = journalForm.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return { totalDebit, totalCredit };
  };

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();

    const { totalDebit, totalCredit } = calculateTotals();
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert('Los débitos y créditos deben estar balanceados.');
      return;
    }

    try {
      const entry = {
        entry_number: journalForm.entry_number || generateEntryNumber(),
        entry_date: journalForm.entry_date,
        description: journalForm.description,
        reference: journalForm.reference,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'posted'
      };

      const lines = journalForm.lines
        .filter(line => line.account_id && (line.debit || line.credit))
        .map(line => ({
          account_id: line.account_id,
          description: line.description,
          debit_amount: parseFloat(line.debit) || 0,
          credit_amount: parseFloat(line.credit) || 0
        }));

      await journalEntriesService.createWithLines(user?.id || '', entry, lines);
      await loadData();
      
      setJournalForm({
        entry_number: '',
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        lines: [
          { account_id: '', description: '', debit: '', credit: '' },
          { account_id: '', description: '', debit: '', credit: '' }
        ]
      });
      setShowJournalModal(false);
      alert('Asiento contable creado exitosamente.');
    } catch (error) {
      console.error('Error creating journal entry:', error);
      alert('Error al crear el asiento contable. Intente nuevamente.');
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    setReportLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      let reportData;
      let filename = '';
      let content = '';

      switch (reportType) {
        case 'balance-sheet':
          reportData = await chartAccountsService.generateBalanceSheet(user?.id || '', today);
          filename = `balance_general_${today}.csv`;
          content = generateBalanceSheetCSV(reportData);
          break;

        case 'income-statement':
          reportData = await chartAccountsService.generateIncomeStatement(user?.id || '', firstDayOfMonth, today);
          filename = `estado_resultados_${today}.csv`;
          content = generateIncomeStatementCSV(reportData);
          break;

        case 'trial-balance':
          reportData = await chartAccountsService.generateTrialBalance(user?.id || '', today);
          filename = `balanza_comprobacion_${today}.csv`;
          content = generateTrialBalanceCSV(reportData);
          break;

        case 'cash-flow':
          reportData = await chartAccountsService.generateCashFlowStatement(user?.id || '', firstDayOfMonth, today);
          filename = `flujo_efectivo_${today}.csv`;
          content = generateCashFlowCSV(reportData);
          break;

        case 'general-ledger':
          const entries = await journalEntriesService.getAll(user?.id || '');
          filename = `mayor_general_${today}.csv`;
          content = generateGeneralLedgerCSV(entries);
          break;

        case 'journal-report':
          const journalData = await journalEntriesService.getAll(user?.id || '');
          filename = `libro_diario_${today}.csv`;
          content = generateJournalReportCSV(journalData);
          break;

        default:
          alert('Tipo de reporte no soportado');
          return;
      }

      // Descargar el archivo
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Reporte ${getReportName(reportType)} generado exitosamente.`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte. Intente nuevamente.');
    } finally {
      setReportLoading(false);
    }
  };

  const getReportName = (reportType: string) => {
    const names: { [key: string]: string } = {
      'balance-sheet': 'Balance General',
      'income-statement': 'Estado de Resultados',
      'trial-balance': 'Balanza de Comprobación',
      'cash-flow': 'Flujo de Efectivo',
      'general-ledger': 'Mayor General',
      'journal-report': 'Libro Diario'
    };
    return names[reportType] || reportType;
  };

  const generateBalanceSheetCSV = (data: any) => {
    let csv = 'BALANCE GENERAL\n';
    csv += `Al ${new Date(data.asOfDate).toLocaleDateString()}\n\n`;
    
    csv += 'ACTIVOS\n';
    csv += 'Código,Nombre,Saldo\n';
    data.assets.forEach((account: any) => {
      csv += `${account.code},${account.name},${account.balance.toLocaleString()}\n`;
    });
    csv += `TOTAL ACTIVOS,,${data.totalAssets.toLocaleString()}\n\n`;

    csv += 'PASIVOS\n';
    csv += 'Código,Nombre,Saldo\n';
    data.liabilities.forEach((account: any) => {
      csv += `${account.code},${account.name},${account.balance.toLocaleString()}\n`;
    });
    csv += `TOTAL PASIVOS,,${data.totalLiabilities.toLocaleString()}\n\n`;

    csv += 'PATRIMONIO\n';
    csv += 'Código,Nombre,Saldo\n';
    data.equity.forEach((account: any) => {
      csv += `${account.code},${account.name},${account.balance.toLocaleString()}\n`;
    });
    csv += `TOTAL PATRIMONIO,,${data.totalEquity.toLocaleString()}\n\n`;

    csv += `TOTAL PASIVOS + PATRIMONIO,,${(data.totalLiabilities + data.totalEquity).toLocaleString()}\n`;

    return csv;
  };

  const generateIncomeStatementCSV = (data: any) => {
    let csv = 'ESTADO DE RESULTADOS\n';
    csv += `Del ${new Date(data.fromDate).toLocaleDateString()} al ${new Date(data.toDate).toLocaleDateString()}\n\n`;
    
    csv += 'INGRESOS\n';
    csv += 'Código,Nombre,Saldo\n';
    data.income.forEach((account: any) => {
      csv += `${account.code},${account.name},${account.balance.toLocaleString()}\n`;
    });
    csv += `TOTAL INGRESOS,,${data.totalIncome.toLocaleString()}\n\n`;

    csv += 'GASTOS\n';
    csv += 'Código,Nombre,Saldo\n';
    data.expenses.forEach((account: any) => {
      csv += `${account.code},${account.name},${account.balance.toLocaleString()}\n`;
    });
    csv += `TOTAL GASTOS,,${data.totalExpenses.toLocaleString()}\n\n`;

    csv += `UTILIDAD NETA,,${data.netIncome.toLocaleString()}\n`;

    return csv;
  };

  const generateTrialBalanceCSV = (data: any) => {
    let csv = 'BALANZA DE COMPROBACIÓN\n';
    csv += `Al ${new Date(data.asOfDate).toLocaleDateString()}\n\n`;
    csv += 'Código,Nombre,Débito,Crédito\n';
    
    data.accounts.forEach((account: any) => {
      csv += `${account.code},${account.name},${account.debitBalance.toLocaleString()},${account.creditBalance.toLocaleString()}\n`;
    });
    
    csv += `TOTALES,,${data.totalDebits.toLocaleString()},${data.totalCredits.toLocaleString()}\n`;
    csv += `BALANCEADO,,${data.isBalanced ? 'SÍ' : 'NO'}\n`;

    return csv;
  };

  const generateCashFlowCSV = (data: any) => {
    let csv = 'ESTADO DE FLUJO DE EFECTIVO\n';
    csv += `Del ${new Date(data.fromDate).toLocaleDateString()} al ${new Date(data.toDate).toLocaleDateString()}\n\n`;
    
    csv += 'Concepto,Monto\n';
    csv += `Flujo de Efectivo Operativo,${data.operatingCashFlow.toLocaleString()}\n`;
    csv += `Flujo de Efectivo de Inversión,${data.investingCashFlow.toLocaleString()}\n`;
    csv += `Flujo de Efectivo de Financiamiento,${data.financingCashFlow.toLocaleString()}\n`;
    csv += `Flujo Neto de Efectivo,${data.netCashFlow.toLocaleString()}\n`;

    return csv;
  };

  const generateGeneralLedgerCSV = (entries: any[]) => {
    let csv = 'MAYOR GENERAL\n';
    csv += `Generado el ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Fecha,Número,Descripción,Cuenta,Débito,Crédito\n';
    
    entries.forEach(entry => {
      entry.journal_entry_lines?.forEach((line: any) => {
        csv += `${new Date(entry.entry_date).toLocaleDateString()},${entry.entry_number},${entry.description},${line.chart_accounts?.code} - ${line.chart_accounts?.name},${(line.debit_amount || 0).toLocaleString()},${(line.credit_amount || 0).toLocaleString()}\n`;
      });
    });

    return csv;
  };

  const generateJournalReportCSV = (entries: any[]) => {
    let csv = 'LIBRO DIARIO\n';
    csv += `Generado el ${new Date().toLocaleDateString()}\n\n`;
    csv += 'Fecha,Número,Descripción,Referencia,Débito Total,Crédito Total\n';
    
    entries.forEach(entry => {
      csv += `${new Date(entry.entry_date).toLocaleDateString()},${entry.entry_number},${entry.description},${entry.reference || ''},${entry.total_debit.toLocaleString()},${entry.total_credit.toLocaleString()}\n`;
    });

    return csv;
  };

  const getAccountsByType = (type: string) => {
    return accounts.filter(account => account.type === type);
  };

  const calculateAccountTypeTotal = (type: string) => {
    return getAccountsByType(type).reduce((sum, account) => sum + (account.balance || 0), 0);
  };

  const { totalDebit, totalCredit } = calculateTotals();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos contables...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contabilidad</h1>
            <p className="text-gray-600 mt-1">Sistema completo de gestión contable</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowJournalModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Nuevo Asiento
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/accounting/general-journal')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              Nuevo Asiento
            </button>
            
            <button 
              onClick={() => navigate('/accounting/financial-statements')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-file-chart-line mr-2"></i>
              Estados Financieros
            </button>
            
            <button 
              onClick={() => navigate('/accounting/bank-reconciliation')}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-bank-line mr-2"></i>
              Conciliación Bancaria
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Resumen', icon: 'ri-dashboard-line' },
              { id: 'journal', label: 'Libro Diario', icon: 'ri-book-line' },
              { id: 'ledger', label: 'Mayor General', icon: 'ri-file-list-line' },
              { id: 'reports', label: 'Reportes', icon: 'ri-bar-chart-line' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <i className="ri-money-dollar-circle-line text-2xl text-blue-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Activos Totales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      RD${calculateAccountTypeTotal('asset').toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <i className="ri-bank-card-line text-2xl text-red-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pasivos Totales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      RD${calculateAccountTypeTotal('liability').toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <i className="ri-pie-chart-line text-2xl text-green-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Patrimonio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      RD${calculateAccountTypeTotal('equity').toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <i className="ri-line-chart-line text-2xl text-purple-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ingresos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      RD${calculateAccountTypeTotal('income').toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Journal Entries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Asientos Recientes</h3>
              </div>
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
                        Débito
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Crédito
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {journalEntries.slice(0, 5).map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.entry_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RD${entry.total_debit.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RD${entry.total_credit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {journalEntries.length === 0 && (
                  <div className="text-center py-8">
                    <i className="ri-file-list-line text-4xl text-gray-300 mb-4 block"></i>
                    <p className="text-gray-500">No hay asientos contables registrados</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Libro Diario</h3>
              <button
                onClick={() => setShowJournalModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                Nuevo Asiento
              </button>
            </div>
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {journalEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.entry_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        RD${entry.total_debit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        RD${entry.total_credit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {journalEntries.length === 0 && (
                <div className="text-center py-8">
                  <i className="ri-book-line text-4xl text-gray-300 mb-4 block"></i>
                  <p className="text-gray-500 mb-4">No hay asientos en el libro diario</p>
                  <button
                    onClick={() => setShowJournalModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Crear Primer Asiento
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Mayor General</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['asset', 'liability', 'equity', 'income', 'expense'].map((type) => (
                  <div key={type} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 capitalize">
                      {type === 'asset' ? 'Activos' : 
                       type === 'liability' ? 'Pasivos' :
                       type === 'equity' ? 'Patrimonio' :
                       type === 'income' ? 'Ingresos' : 'Gastos'}
                    </h4>
                    <div className="space-y-2">
                      {getAccountsByType(type).slice(0, 5).map((account) => (
                        <div key={account.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{account.code} - {account.name}</span>
                          <span className="font-medium">RD${(account.balance || 0).toLocaleString()}</span>
                        </div>
                      ))}
                      {getAccountsByType(type).length === 0 && (
                        <p className="text-sm text-gray-500">No hay cuentas registradas</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Reportes Contables</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'balance-sheet', name: 'Balance General', icon: 'ri-scales-line', description: 'Estado de situación financiera' },
                  { id: 'income-statement', name: 'Estado de Resultados', icon: 'ri-line-chart-line', description: 'Ingresos y gastos del período' },
                  { id: 'cash-flow', name: 'Flujo de Efectivo', icon: 'ri-money-dollar-circle-line', description: 'Movimientos de efectivo' },
                  { id: 'trial-balance', name: 'Balanza de Comprobación', icon: 'ri-calculator-line', description: 'Saldos de todas las cuentas' },
                  { id: 'general-ledger', name: 'Mayor General', icon: 'ri-book-open-line', description: 'Detalle de movimientos por cuenta' },
                  { id: 'journal-report', name: 'Libro Diario', icon: 'ri-file-list-line', description: 'Registro cronológico de asientos' }
                ].map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <i className={`${report.icon} text-xl text-blue-600`}></i>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <p className="text-sm text-gray-500">{report.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={reportLoading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {reportLoading ? (
                        <>
                          <i className="ri-loader-4-line mr-2 animate-spin"></i>
                          Generando...
                        </>
                      ) : (
                        <>
                          <i className="ri-download-line mr-2"></i>
                          Generar Reporte
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Journal Entry Modal */}
        {showJournalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Nuevo Asiento Contable</h2>
                  <button
                    onClick={() => setShowJournalModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <form onSubmit={handleSubmitJournal} className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Asiento
                      </label>
                      <input
                        type="text"
                        value={journalForm.entry_number}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, entry_number: e.target.value }))}
                        placeholder={generateEntryNumber()}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        required
                        value={journalForm.entry_date}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, entry_date: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Referencia
                      </label>
                      <input
                        type="text"
                        value={journalForm.reference}
                        onChange={(e) => setJournalForm(prev => ({ ...prev, reference: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción *
                    </label>
                    <textarea
                      required
                      value={journalForm.description}
                      onChange={(e) => setJournalForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Journal Lines */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Líneas del Asiento</h3>
                      <button
                        type="button"
                        onClick={handleAddJournalLine}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-add-line mr-1"></i>
                        Agregar Línea
                      </button>
                    </div>

                    <div className="space-y-3">
                      {journalForm.lines.map((line, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-4">
                            <select
                              value={line.account_id}
                              onChange={(e) => handleJournalLineChange(index, 'account_id', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
                              required
                            >
                              <option value="">Seleccionar cuenta</option>
                              {accounts.filter(acc => acc.is_active && acc.allow_posting).map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleJournalLineChange(index, 'description', e.target.value)}
                              placeholder="Descripción"
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.debit}
                              onChange={(e) => handleJournalLineChange(index, 'debit', e.target.value)}
                              placeholder="Débito"
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.credit}
                              onChange={(e) => handleJournalLineChange(index, 'credit', e.target.value)}
                              placeholder="Crédito"
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div className="col-span-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveJournalLine(index)}
                              disabled={journalForm.lines.length <= 2}
                              className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium">Total Débito: </span>
                          <span className="text-blue-600">RD${totalDebit.toLocaleString()}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Total Crédito: </span>
                          <span className="text-green-600">RD${totalCredit.toLocaleString()}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Diferencia: </span>
                          <span className={`${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                            RD${Math.abs(totalDebit - totalCredit).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowJournalModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={Math.abs(totalDebit - totalCredit) > 0.01}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Crear Asiento
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
