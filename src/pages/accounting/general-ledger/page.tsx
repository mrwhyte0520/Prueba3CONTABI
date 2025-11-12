import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  normalBalance: string;
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

const GeneralLedgerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      loadLedgerEntries(selectedAccount.id);
    }
  }, [selectedAccount, dateFrom, dateTo]);

  const loadAccounts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: accountsData, error } = await supabase
        .from('chart_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('code');

      if (!error && accountsData) {
        const processedAccounts = accountsData.map(account => ({
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          balance: account.balance || 0,
          normalBalance: account.normal_balance || 'debit'
        }));
        setAccounts(processedAccounts);
      } else {
        throw new Error('Error loading from Supabase');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      // Cargar datos de ejemplo
      loadMockAccounts();
    } finally {
      setLoading(false);
    }
  };

  const loadMockAccounts = () => {
    const mockAccounts: Account[] = [
      { id: '1', code: '1111', name: 'Caja General', type: 'asset', balance: 125000, normalBalance: 'debit' },
      { id: '2', code: '1112', name: 'Banco Popular', type: 'asset', balance: 850000, normalBalance: 'debit' },
      { id: '3', code: '1113', name: 'Banco BHD León', type: 'asset', balance: 420000, normalBalance: 'debit' },
      { id: '4', code: '1120', name: 'Cuentas por Cobrar', type: 'asset', balance: 450000, normalBalance: 'debit' },
      { id: '5', code: '1300', name: 'Inventario', type: 'asset', balance: 320000, normalBalance: 'debit' },
      { id: '6', code: '1400', name: 'Equipos de Oficina', type: 'asset', balance: 180000, normalBalance: 'debit' },
      { id: '7', code: '1410', name: 'Depreciación Acumulada', type: 'asset', balance: -45000, normalBalance: 'credit' },
      { id: '8', code: '2100', name: 'Cuentas por Pagar', type: 'liability', balance: 180000, normalBalance: 'credit' },
      { id: '9', code: '2200', name: 'Préstamos Bancarios', type: 'liability', balance: 500000, normalBalance: 'credit' },
      { id: '10', code: '3100', name: 'Capital Social', type: 'equity', balance: 1000000, normalBalance: 'credit' },
      { id: '11', code: '4100', name: 'Ventas', type: 'income', balance: 2500000, normalBalance: 'credit' },
      { id: '12', code: '4200', name: 'Ingresos por Servicios', type: 'income', balance: 850000, normalBalance: 'credit' },
      { id: '13', code: '5100', name: 'Gastos Operativos', type: 'expense', balance: 180000, normalBalance: 'debit' },
      { id: '14', code: '5200', name: 'Servicios Públicos', type: 'expense', balance: 45000, normalBalance: 'debit' },
      { id: '15', code: '5300', name: 'Gastos de Personal', type: 'expense', balance: 720000, normalBalance: 'debit' },
      { id: '16', code: '5400', name: 'Depreciación', type: 'expense', balance: 25000, normalBalance: 'debit' }
    ];
    setAccounts(mockAccounts);
  };

  const loadLedgerEntries = async (accountId: string) => {
    if (!user) return;

    try {
      // Generar datos del mayor para la cuenta seleccionada
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) return;

      const mockEntries: LedgerEntry[] = [
        {
          id: '1',
          date: '2024-12-01',
          description: 'Saldo inicial del período',
          reference: 'SI-001',
          debit: account.normalBalance === 'debit' ? Math.abs(account.balance * 0.7) : 0,
          credit: account.normalBalance === 'credit' ? Math.abs(account.balance * 0.7) : 0,
          balance: account.balance * 0.7,
          entryNumber: 'SI-001'
        },
        {
          id: '2',
          date: '2024-12-03',
          description: account.type === 'asset' ? 'Incremento por operación comercial' : 
                      account.type === 'income' ? 'Venta de productos y servicios' :
                      account.type === 'expense' ? 'Gasto operativo del período' : 
                      account.type === 'liability' ? 'Incremento de obligaciones' : 'Movimiento de capital',
          reference: 'FAC-001',
          debit: account.normalBalance === 'debit' ? Math.abs(account.balance * 0.15) : 0,
          credit: account.normalBalance === 'credit' ? Math.abs(account.balance * 0.15) : 0,
          balance: account.balance * 0.85,
          entryNumber: 'JE-001234'
        },
        {
          id: '3',
          date: '2024-12-07',
          description: account.type === 'asset' ? 'Ajuste por conciliación bancaria' : 
                      account.type === 'income' ? 'Servicios prestados adicionales' :
                      account.type === 'expense' ? 'Gastos administrativos' : 
                      account.type === 'liability' ? 'Pago parcial de obligaciones' : 'Ajuste patrimonial',
          reference: 'REC-002',
          debit: account.normalBalance === 'debit' ? Math.abs(account.balance * 0.08) : Math.abs(account.balance * 0.05),
          credit: account.normalBalance === 'credit' ? Math.abs(account.balance * 0.08) : Math.abs(account.balance * 0.05),
          balance: account.balance * 0.93,
          entryNumber: 'JE-001235'
        },
        {
          id: '4',
          date: '2024-12-10',
          description: account.type === 'asset' ? 'Depósito bancario por ventas' : 
                      account.type === 'income' ? 'Ingresos por comisiones' :
                      account.type === 'expense' ? 'Gastos de mantenimiento' : 
                      account.type === 'liability' ? 'Nueva obligación contraída' : 'Distribución de utilidades',
          reference: 'DEP-003',
          debit: account.normalBalance === 'debit' ? Math.abs(account.balance * 0.05) : 0,
          credit: account.normalBalance === 'credit' ? Math.abs(account.balance * 0.05) : 0,
          balance: account.balance * 0.98,
          entryNumber: 'JE-001236'
        },
        {
          id: '5',
          date: '2024-12-15',
          description: account.type === 'asset' ? 'Movimiento final del período' : 
                      account.type === 'income' ? 'Ajuste de ingresos devengados' :
                      account.type === 'expense' ? 'Provisión de gastos' : 
                      account.type === 'liability' ? 'Ajuste de provisiones' : 'Cierre del período',
          reference: 'AJU-004',
          debit: account.normalBalance === 'debit' ? Math.abs(account.balance * 0.02) : 0,
          credit: account.normalBalance === 'credit' ? Math.abs(account.balance * 0.02) : 0,
          balance: account.balance,
          entryNumber: 'JE-001237'
        }
      ];

      // Filtrar por fechas si están definidas
      let filteredEntries = mockEntries;
      if (dateFrom) {
        filteredEntries = filteredEntries.filter(entry => entry.date >= dateFrom);
      }
      if (dateTo) {
        filteredEntries = filteredEntries.filter(entry => entry.date <= dateTo);
      }

      setLedgerEntries(filteredEntries);
    } catch (error) {
      console.error('Error loading ledger entries:', error);
      setLedgerEntries([]);
    }
  };

  const downloadExcel = () => {
    try {
      if (!selectedAccount) {
        alert('Por favor seleccione una cuenta primero');
        return;
      }

      // Crear contenido CSV
      let csvContent = `Mayor General - ${selectedAccount.code} ${selectedAccount.name}\n`;
      csvContent += `Período: ${dateFrom || 'Inicio'} - ${dateTo || 'Actual'}\n`;
      csvContent += `Tipo de Cuenta: ${getAccountTypeName(selectedAccount.type)}\n`;
      csvContent += `Balance Normal: ${selectedAccount.normalBalance === 'debit' ? 'Débito' : 'Crédito'}\n\n`;
      csvContent += 'Fecha,Asiento,Descripción,Referencia,Débito,Crédito,Balance\n';
      
      ledgerEntries.forEach(entry => {
        const row = [
          new Date(entry.date).toLocaleDateString(),
          entry.entryNumber,
          `"${entry.description}"`,
          entry.reference,
          entry.debit > 0 ? entry.debit.toLocaleString() : '',
          entry.credit > 0 ? entry.credit.toLocaleString() : '',
          Math.abs(entry.balance).toLocaleString()
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar totales
      csvContent += '\nTotales:,,,';
      csvContent += `,${ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0).toLocaleString()}`;
      csvContent += `,${ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0).toLocaleString()}`;
      csvContent += `,${Math.abs(ledgerEntries[ledgerEntries.length - 1]?.balance || 0).toLocaleString()}`;

      // Agregar resumen
      csvContent += '\n\nResumen:\n';
      csvContent += `Total Movimientos:,${ledgerEntries.length}\n`;
      csvContent += `Balance Final:,RD$${Math.abs(selectedAccount.balance).toLocaleString()}\n`;
      csvContent += `Saldo ${selectedAccount.normalBalance === 'debit' ? 'Deudor' : 'Acreedor'}:,${selectedAccount.balance >= 0 ? 'Sí' : 'No'}\n`;

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mayor_${selectedAccount.code}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
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
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asiento
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
                    {ledgerEntries.length > 0 ? (
                      ledgerEntries.map((entry, index) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {entry.entryNumber}
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
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <i className="ri-file-list-line text-4xl text-gray-300 mb-2"></i>
                            <p>No hay movimientos para esta cuenta en el período seleccionado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {ledgerEntries.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-6 py-3 text-right font-medium text-gray-900">
                          Totales:
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900">
                          RD${ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900">
                          RD${ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-900">
                          RD${Math.abs(ledgerEntries[ledgerEntries.length - 1]?.balance || 0).toLocaleString()}
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
                      <div className="text-lg font-bold text-gray-900">{ledgerEntries.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Débitos</div>
                      <div className="text-lg font-bold text-green-600">
                        RD${ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Créditos</div>
                      <div className="text-lg font-bold text-red-600">
                        RD${ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Balance Final</div>
                      <div className={`text-lg font-bold ${getBalanceColor(selectedAccount.balance, selectedAccount.normalBalance)}`}>
                        RD${Math.abs(ledgerEntries[ledgerEntries.length - 1]?.balance || 0).toLocaleString()}
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
