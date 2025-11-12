import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';

interface Bank {
  id: string;
  name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  is_active: boolean;
  bank_code: string;
  swift_code?: string;
  contact_info?: string;
  created_at: string;
}

interface BankTransaction {
  id: string;
  bank_id: string;
  transaction_date: string;
  description: string;
  reference: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  transaction_type: string;
  status: string;
}

export default function BanksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [activeTab, setActiveTab] = useState('banks');

  const [bankForm, setBankForm] = useState({
    name: '',
    account_number: '',
    account_type: 'checking',
    balance: '',
    currency: 'DOP',
    bank_code: '',
    swift_code: '',
    contact_info: ''
  });

  const [transactionForm, setTransactionForm] = useState({
    bank_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    amount: '',
    transaction_type: 'deposit'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Datos de ejemplo para bancos
      const banksData: Bank[] = [
        {
          id: '1',
          name: 'Banco Popular Dominicano',
          account_number: '1234567890',
          account_type: 'checking',
          balance: 2500000,
          currency: 'DOP',
          is_active: true,
          bank_code: 'BPD',
          swift_code: 'BPOPDOMM',
          contact_info: 'Sucursal Principal - Tel: 809-544-5000',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Banco de Reservas',
          account_number: '0987654321',
          account_type: 'savings',
          balance: 1800000,
          currency: 'DOP',
          is_active: true,
          bank_code: 'BANRESERVAS',
          swift_code: 'BRESDOMM',
          contact_info: 'Sucursal Zona Colonial - Tel: 809-960-2121',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Banco BHD León',
          account_number: '5555666677',
          account_type: 'checking',
          balance: 3200000,
          currency: 'DOP',
          is_active: true,
          bank_code: 'BHD',
          swift_code: 'BHDLDOMM',
          contact_info: 'Sucursal Piantini - Tel: 809-243-3232',
          created_at: new Date().toISOString()
        }
      ];

      // Datos de ejemplo para transacciones
      const transactionsData: BankTransaction[] = [
        {
          id: '1',
          bank_id: '1',
          transaction_date: '2024-01-15',
          description: 'Depósito de ventas del día',
          reference: 'DEP-001',
          debit_amount: 0,
          credit_amount: 150000,
          balance: 2500000,
          transaction_type: 'deposit',
          status: 'completed'
        },
        {
          id: '2',
          bank_id: '1',
          transaction_date: '2024-01-14',
          description: 'Pago a proveedor ABC',
          reference: 'CHK-001',
          debit_amount: 85000,
          credit_amount: 0,
          balance: 2350000,
          transaction_type: 'withdrawal',
          status: 'completed'
        },
        {
          id: '3',
          bank_id: '2',
          transaction_date: '2024-01-13',
          description: 'Transferencia recibida',
          reference: 'TRF-001',
          debit_amount: 0,
          credit_amount: 200000,
          balance: 1800000,
          transaction_type: 'transfer',
          status: 'completed'
        }
      ];

      setBanks(banksData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBank: Bank = {
        id: Date.now().toString(),
        name: bankForm.name,
        account_number: bankForm.account_number,
        account_type: bankForm.account_type,
        balance: parseFloat(bankForm.balance) || 0,
        currency: bankForm.currency,
        is_active: true,
        bank_code: bankForm.bank_code,
        swift_code: bankForm.swift_code,
        contact_info: bankForm.contact_info,
        created_at: new Date().toISOString()
      };

      setBanks(prev => [...prev, newBank]);
      setBankForm({
        name: '',
        account_number: '',
        account_type: 'checking',
        balance: '',
        currency: 'DOP',
        bank_code: '',
        swift_code: '',
        contact_info: ''
      });
      setShowBankModal(false);
      alert('Banco agregado exitosamente.');
    } catch (error) {
      console.error('Error creating bank:', error);
      alert('Error al crear el banco. Intente nuevamente.');
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(transactionForm.amount);
      const bank = banks.find(b => b.id === transactionForm.bank_id);
      
      if (!bank) {
        alert('Seleccione un banco válido.');
        return;
      }

      const newTransaction: BankTransaction = {
        id: Date.now().toString(),
        bank_id: transactionForm.bank_id,
        transaction_date: transactionForm.transaction_date,
        description: transactionForm.description,
        reference: transactionForm.reference,
        debit_amount: transactionForm.transaction_type === 'withdrawal' ? amount : 0,
        credit_amount: transactionForm.transaction_type === 'deposit' ? amount : 0,
        balance: bank.balance + (transactionForm.transaction_type === 'deposit' ? amount : -amount),
        transaction_type: transactionForm.transaction_type,
        status: 'completed'
      };

      // Actualizar balance del banco
      setBanks(prev => prev.map(b => 
        b.id === transactionForm.bank_id 
          ? { ...b, balance: newTransaction.balance }
          : b
      ));

      setTransactions(prev => [newTransaction, ...prev]);
      setTransactionForm({
        bank_id: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        amount: '',
        transaction_type: 'deposit'
      });
      setShowTransactionModal(false);
      alert('Transacción registrada exitosamente.');
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error al registrar la transacción. Intente nuevamente.');
    }
  };

  const getTotalBalance = () => {
    return banks.reduce((sum, bank) => sum + bank.balance, 0);
  };

  const getAccountTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'checking': 'Cuenta Corriente',
      'savings': 'Cuenta de Ahorros',
      'credit': 'Línea de Crédito',
      'investment': 'Cuenta de Inversión'
    };
    return types[type] || type;
  };

  const getTransactionTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'deposit': 'Depósito',
      'withdrawal': 'Retiro',
      'transfer': 'Transferencia',
      'fee': 'Comisión',
      'interest': 'Interés'
    };
    return types[type] || type;
  };

  const downloadExcel = () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Gestión Bancaria\n';
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Banco,Número de Cuenta,Tipo,Saldo,Estado\n';
      
      filteredBanks.forEach(bank => {
        const row = [
          `"${bank.bank_name}"`,
          bank.account_number,
          bank.account_type === 'checking' ? 'Corriente' :
          bank.account_type === 'savings' ? 'Ahorros' : 'Línea de Crédito',
          bank.balance.toLocaleString(),
          bank.is_active ? 'Activa' : 'Inactiva'
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar resumen
      csvContent += '\nResumen:\n';
      csvContent += `Total Cuentas:,${filteredBanks.length}\n`;
      csvContent += `Cuentas Activas:,${filteredBanks.filter(b => b.is_active).length}\n`;
      csvContent += `Saldo Total:,RD$${filteredBanks.reduce((sum, bank) => sum + bank.balance, 0).toLocaleString()}\n`;

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `gestion_bancaria_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando información bancaria...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Gestión Bancaria</h1>
            <p className="text-gray-600 mt-1">Administre cuentas bancarias y transacciones</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBankModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-bank-line mr-2"></i>
              Nuevo Banco
            </button>
            <button
              onClick={() => setShowTransactionModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-exchange-line mr-2"></i>
              Nueva Transacción
            </button>
            <button
              onClick={() => navigate('/accounting')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Volver
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-bank-line text-2xl text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bancos</p>
                <p className="text-2xl font-bold text-gray-900">{banks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-money-dollar-circle-line text-2xl text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Balance Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  RD${getTotalBalance().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <i className="ri-exchange-line text-2xl text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transacciones</p>
                <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <i className="ri-check-line text-2xl text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bancos Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {banks.filter(b => b.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'banks', label: 'Cuentas Bancarias', icon: 'ri-bank-line' },
              { id: 'transactions', label: 'Transacciones', icon: 'ri-exchange-line' }
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
        {activeTab === 'banks' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cuentas Bancarias</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Banco
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número de Cuenta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
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
                  {banks.map((bank) => (
                    <tr key={bank.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{bank.name}</div>
                          <div className="text-sm text-gray-500">{bank.bank_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bank.account_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getAccountTypeLabel(bank.account_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        RD${bank.balance.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bank.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {bank.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedBank(bank)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {banks.length === 0 && (
                <div className="text-center py-8">
                  <i className="ri-bank-line text-4xl text-gray-300 mb-4 block"></i>
                  <p className="text-gray-500 mb-4">No hay bancos registrados</p>
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Agregar Primer Banco
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Transacciones Bancarias</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Banco
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
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
                  {transactions.map((transaction) => {
                    const bank = banks.find(b => b.id === transaction.bank_id);
                    return (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bank?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div>{transaction.description}</div>
                            <div className="text-xs text-gray-500">Ref: {transaction.reference}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {transaction.debit_amount > 0 ? `RD$${transaction.debit_amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {transaction.credit_amount > 0 ? `RD$${transaction.credit_amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          RD${transaction.balance.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <div className="text-center py-8">
                  <i className="ri-exchange-line text-4xl text-gray-300 mb-4 block"></i>
                  <p className="text-gray-500 mb-4">No hay transacciones registradas</p>
                  <button
                    onClick={() => setShowTransactionModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Registrar Primera Transacción
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bank Modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Nuevo Banco</h2>
                  <button
                    onClick={() => setShowBankModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <form onSubmit={handleSubmitBank} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Banco *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankForm.name}
                        onChange={(e) => setBankForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Cuenta *
                      </label>
                      <input
                        type="text"
                        required
                        value={bankForm.account_number}
                        onChange={(e) => setBankForm(prev => ({ ...prev, account_number: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Cuenta *
                      </label>
                      <select
                        required
                        value={bankForm.account_type}
                        onChange={(e) => setBankForm(prev => ({ ...prev, account_type: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                      >
                        <option value="checking">Cuenta Corriente</option>
                        <option value="savings">Cuenta de Ahorros</option>
                        <option value="credit">Línea de Crédito</option>
                        <option value="investment">Cuenta de Inversión</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Balance Inicial
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={bankForm.balance}
                        onChange={(e) => setBankForm(prev => ({ ...prev, balance: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código del Banco
                      </label>
                      <input
                        type="text"
                        value={bankForm.bank_code}
                        onChange={(e) => setBankForm(prev => ({ ...prev, bank_code: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código SWIFT
                      </label>
                      <input
                        type="text"
                        value={bankForm.swift_code}
                        onChange={(e) => setBankForm(prev => ({ ...prev, swift_code: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Información de Contacto
                    </label>
                    <textarea
                      value={bankForm.contact_info}
                      onChange={(e) => setBankForm(prev => ({ ...prev, contact_info: e.target.value }))}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowBankModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Crear Banco
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Nueva Transacción</h2>
                  <button
                    onClick={() => setShowTransactionModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <form onSubmit={handleSubmitTransaction} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banco *
                      </label>
                      <select
                        required
                        value={transactionForm.bank_id}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, bank_id: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                      >
                        <option value="">Seleccionar banco</option>
                        {banks.filter(b => b.is_active).map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name} - {bank.account_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        required
                        value={transactionForm.transaction_date}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Referencia
                      </label>
                      <input
                        type="text"
                        value={transactionForm.reference}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, reference: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Transacción *
                      </label>
                      <select
                        required
                        value={transactionForm.transaction_type}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, transaction_type: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                      >
                        <option value="deposit">Depósito</option>
                        <option value="withdrawal">Retiro</option>
                        <option value="transfer">Transferencia</option>
                        <option value="fee">Comisión</option>
                        <option value="interest">Interés</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTransactionModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                    >
                      Registrar Transacción
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
