import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { exportToExcelStyled } from '../../../utils/exportImportUtils';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  normalBalance: string;
}

interface AccountingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  fiscal_year: string;
  status: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  entryNumber: string;
}

const getEntryDocumentType = (entry: LedgerEntry): string => {
  const num = entry.entryNumber || '';
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

const GeneralLedgerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string[]>([]);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadLedgerEntries(selectedAccount.id);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('code');

      const { data: periodsData, error: periodsError } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (!accountsError && accountsData && !periodsError && periodsData) {
        const processedAccounts = accountsData.map(account => ({
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          balance: account.balance || 0,
          normalBalance: account.normal_balance || 'debit'
        }));
        setAccounts(processedAccounts);
        setPeriods(periodsData);
      } else {
        throw new Error('Error loading from Supabase');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      // No usar datos de ejemplo
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMockAccounts = () => {
    setAccounts([]);
  };

  const loadLedgerEntries = async (accountId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          id,
          description,
          debit_amount,
          credit_amount,
          journal_entries:journal_entries!inner(entry_date, entry_number, reference),
          chart_accounts:chart_accounts!inner(id)
        `)
        .eq('account_id', accountId);

      // Orden por fecha de asiento ascendente para balance acumulado
      const { data, error } = await query.order('entry_date', { ascending: true, foreignTable: 'journal_entries' });

      if (error) throw error;

      const normal = selectedAccount?.normalBalance || 'debit';
      let running = 0;
      const mapped: LedgerEntry[] = (data || []).map((line: any) => {
        const debit = Number(line.debit_amount || 0);
        const credit = Number(line.credit_amount || 0);
        if (normal === 'debit') running += debit - credit; else running += credit - debit;
        return {
          id: line.id,
          date: line.journal_entries.entry_date,
          description: line.description || '',
          reference: line.journal_entries.reference || '',
          debit,
          credit,
          balance: running,
          entryNumber: line.journal_entries.entry_number || ''
        } as LedgerEntry;
      });

      setLedgerEntries(mapped);
    } catch (error) {
      console.error('Error loading ledger entries:', error);
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      if (!selectedAccount) {
        alert('Por favor seleccione una cuenta primero');
        return;
      }
      if (ledgerEntries.length === 0) {
        alert('No hay movimientos para exportar');
        return;
      }

      const rows = ledgerEntries.map(e => ({
        date: new Date(e.date).toLocaleDateString(),
        entry: e.entryNumber,
        description: e.description || '',
        debit: e.debit > 0 ? e.debit : 0,
        credit: e.credit > 0 ? e.credit : 0,
        balance: e.balance || 0,
      }));

      const fileBase = `mayor_${selectedAccount.code}_${new Date().toISOString().split('T')[0]}`;
      await exportToExcelStyled(
        rows,
        [
          { key: 'date', title: 'Fecha', width: 12 },
          { key: 'entry', title: 'Asiento', width: 12 },
          { key: 'description', title: 'Descripción', width: 40 },
          { key: 'debit', title: 'Débito', width: 14, numFmt: '#,##0.00' },
          { key: 'credit', title: 'Crédito', width: 14, numFmt: '#,##0.00' },
          { key: 'balance', title: 'Balance', width: 14, numFmt: '#,##0.00' },
        ],
        fileBase,
        'Mayor General'
      );
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al generar el archivo Excel. Por favor, intente nuevamente.');
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = accountTypeFilter === 'all' || account.type === accountTypeFilter;
    return matchesSearch && matchesType;
  });

  const accountTypesMap = {
    asset: 'Activo',
    liability: 'Pasivo',
    equity: 'Patrimonio',
    income: 'Ingreso',
    expense: 'Gasto'
  };

  const getAccountTypeName = (type: string) => {
    return accountTypesMap[type as keyof typeof accountTypesMap] || type;
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-green-100 text-green-800',
      income: 'bg-purple-100 text-purple-800',
      expense: 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getBalanceColor = (balance: number, normalBalance: string) => {
    const isPositive = balance >= 0;
    const isNormal = (normalBalance === 'debit' && isPositive) || (normalBalance === 'credit' && !isPositive);
    return isNormal ? 'text-green-600' : 'text-red-600';
  };

  const fiscalYears = Array.from(new Set(periods.map((p) => p.fiscal_year))).sort(
    (a, b) => Number(b) - Number(a)
  );

  const visiblePeriods = periods.filter(
    (p) => !selectedFiscalYear || p.fiscal_year === selectedFiscalYear
  );

  const handlePeriodChange = (periodId: string) => {
    setSelectedPeriodId(periodId);
    const period = periods.find((p) => p.id === periodId);
    if (period) {
      setDateFrom(period.start_date.slice(0, 10));
      setDateTo(period.end_date.slice(0, 10));
    }
  };

  const filteredByDate = ledgerEntries.filter((entry) => {
    const entryDate = entry.date;
    const matchesFrom = !dateFrom || entryDate >= dateFrom;
    const matchesTo = !dateTo || entryDate <= dateTo;
    return matchesFrom && matchesTo;
  });

  const filteredByDocumentType = filteredByDate.filter((entry) => {
    if (documentTypeFilter.length === 0) return true;
    const type = getEntryDocumentType(entry);
    return documentTypeFilter.includes(type);
  });

  const filteredLedgerEntries = filteredByDocumentType;

  let openingBalance = 0;
  if (dateFrom) {
    for (const entry of ledgerEntries) {
      if (entry.date < dateFrom) {
        openingBalance = entry.balance;
      } else {
        break;
      }
    }
  }

  const totalDebits = filteredLedgerEntries.reduce(
    (sum, entry) => sum + entry.debit,
    0
  );
  const totalCredits = filteredLedgerEntries.reduce(
    (sum, entry) => sum + entry.credit,
    0
  );
  const finalBalance =
    filteredLedgerEntries.length > 0
      ? filteredLedgerEntries[filteredLedgerEntries.length - 1].balance
      : openingBalance;

  const documentTypes = Array.from(
    new Set(ledgerEntries.map((entry) => getEntryDocumentType(entry)))
  ).sort();

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
            <h1 className="text-2xl font-bold text-gray-900">Mayor General</h1>
            <p className="text-gray-600">Movimientos por cuenta contable</p>
          </div>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <i className="ri-file-excel-2-line"></i>
          Exportar Excel
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <i className="ri-safe-line text-2xl text-blue-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-xl font-bold text-gray-900">
                {accounts.filter(acc => acc.type === 'asset').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <i className="ri-bank-line text-2xl text-red-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pasivos</p>
              <p className="text-xl font-bold text-gray-900">
                {accounts.filter(acc => acc.type === 'liability').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <i className="ri-funds-line text-2xl text-green-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Patrimonio</p>
              <p className="text-xl font-bold text-gray-900">
                {accounts.filter(acc => acc.type === 'equity').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <i className="ri-money-dollar-circle-line text-2xl text-purple-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ingresos</p>
              <p className="text-xl font-bold text-gray-900">
                {accounts.filter(acc => acc.type === 'income').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <i className="ri-shopping-cart-line text-2xl text-orange-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gastos</p>
              <p className="text-xl font-bold text-gray-900">
                {accounts.filter(acc => acc.type === 'expense').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Catálogo de Cuentas</h2>
              
              {/* Filters */}
              <div className="space-y-4">
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Buscar cuenta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="asset">Activos</option>
                  <option value="liability">Pasivos</option>
                  <option value="equity">Patrimonio</option>
                  <option value="income">Ingresos</option>
                  <option value="expense">Gastos</option>
                </select>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedAccount?.id === account.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {account.code} - {account.name}
                      </div>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccountTypeColor(account.type)}`}>
                          {getAccountTypeName(account.type)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getBalanceColor(account.balance, account.normalBalance)}`}>
                        RD${Math.abs(account.balance).toLocaleString()}
                      </div>
                      <div className={`text-xs ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {account.normalBalance === 'debit' ? 'Débito' : 'Crédito'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ledger Details */}
        <div className="lg:col-span-2">
          {selectedAccount ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Mayor de la Cuenta: {selectedAccount.code} - {selectedAccount.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Tipo: {getAccountTypeName(selectedAccount.type)} | 
                      Balance Normal: {selectedAccount.normalBalance === 'debit' ? 'Débito' : 'Crédito'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Balance Actual</div>
                    <div className={`text-xl font-bold ${getBalanceColor(selectedAccount.balance, selectedAccount.normalBalance)}`}>
                      RD${Math.abs(selectedAccount.balance).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Date Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Año Fiscal
                    </label>
                    <select
                      value={selectedFiscalYear}
                      onChange={(e) => {
                        setSelectedFiscalYear(e.target.value);
                        setSelectedPeriodId('');
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                    >
                      <option value="">Todos</option>
                      {fiscalYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Período Contable
                    </label>
                    <select
                      value={selectedPeriodId}
                      onChange={(e) => handlePeriodChange(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-8"
                    >
                      <option value="">Todos</option>
                      {visiblePeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name} ({new Date(period.start_date).toLocaleDateString('es-DO')} -{' '}
                          {new Date(period.end_date).toLocaleDateString('es-DO')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de documento
                    </label>
                    <select
                      multiple
                      value={documentTypeFilter}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions).map((option) => option.value);
                        setDocumentTypeFilter(options);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {documentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Si no seleccionas ningún tipo, se muestran todos.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Desde
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Hasta
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setDateFrom('');
                        setDateTo('');
                        setSelectedFiscalYear('');
                        setSelectedPeriodId('');
                        setDocumentTypeFilter([]);
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Documento
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
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <i className="ri-file-list-line text-4xl text-gray-300 mb-2"></i>
                            <p>No hay movimientos para esta cuenta en el período seleccionado</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr className="bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Balance inicial
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                          <td className="px-6 py-4 text-sm text-gray-900"></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            RD${Math.abs(openingBalance).toLocaleString()}
                          </td>
                        </tr>
                        {filteredLedgerEntries.length > 0 ? (
                          filteredLedgerEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {entry.entryNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {getEntryDocumentType(entry)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(entry.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {entry.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.reference}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.debit > 0 ? `RD$${entry.debit.toLocaleString()}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {entry.credit > 0 ? `RD$${entry.credit.toLocaleString()}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                RD${Math.abs(entry.balance).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <i className="ri-file-list-line text-4xl text-gray-300 mb-2"></i>
                                <p>No hay movimientos para esta cuenta en el período seleccionado</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                  {ledgerEntries.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-6 py-3 text-right font-medium text-gray-900">
                          Totales:
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900">
                          RD${totalDebits.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900">
                          RD${totalCredits.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900">
                          RD${Math.abs(finalBalance).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Summary Stats */}
              {ledgerEntries.length > 0 && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Movimientos</div>
                      <div className="text-lg font-bold text-gray-900">{filteredLedgerEntries.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Débitos</div>
                      <div className="text-lg font-bold text-green-600">
                        RD${totalDebits.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Créditos</div>
                      <div className="text-lg font-bold text-red-600">
                        RD${totalCredits.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Balance Final</div>
                      <div className={`text-lg font-bold ${getBalanceColor(finalBalance, selectedAccount.normalBalance)}`}>
                        RD${Math.abs(finalBalance).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <i className="ri-file-list-3-line text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una Cuenta</h3>
              <p className="text-gray-600">
                Elige una cuenta del catálogo para ver su mayor general con todos los movimientos detallados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralLedgerPage;
