import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';

interface BankStatement {
  id: string;
  bank_id: string;
  statement_date: string;
  beginning_balance: number;
  ending_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  statement_items: BankStatementItem[];
}

interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  is_reconciled: boolean;
  journal_entry_id?: string;
}

interface ReconciliationItem {
  id: string;
  type: 'book' | 'bank';
  date: string;
  description: string;
  amount: number;
  is_matched: boolean;
  match_id?: string;
}

export default function BankReconciliationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState('');
  const [reconciliationDate, setReconciliationDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankStatement, setBankStatement] = useState<BankStatement | null>(null);
  const [bookItems, setBookItems] = useState<ReconciliationItem[]>([]);
  const [bankItems, setBankItems] = useState<ReconciliationItem[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const banks = [
    { id: '1', name: 'Banco Popular Dominicano', account_number: '1234567890' },
    { id: '2', name: 'Banco de Reservas', account_number: '0987654321' },
    { id: '3', name: 'Banco BHD León', account_number: '5555666677' }
  ];

  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'bank_charge',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, [selectedBank, reconciliationDate]);

  const loadData = async () => {
    if (!selectedBank) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Datos de ejemplo para conciliación bancaria
      const bookItemsData: ReconciliationItem[] = [
        {
          id: '1',
          type: 'book',
          date: '2024-01-15',
          description: 'Depósito de ventas del día',
          amount: 150000,
          is_matched: false
        },
        {
          id: '2',
          type: 'book',
          date: '2024-01-14',
          description: 'Pago a proveedor ABC',
          amount: -85000,
          is_matched: false
        },
        {
          id: '3',
          type: 'book',
          date: '2024-01-13',
          description: 'Transferencia recibida',
          amount: 200000,
          is_matched: true,
          match_id: 'bank_1'
        },
        {
          id: '4',
          type: 'book',
          date: '2024-01-12',
          description: 'Pago de nómina',
          amount: -120000,
          is_matched: false
        }
      ];

      const bankItemsData: ReconciliationItem[] = [
        {
          id: 'bank_1',
          type: 'bank',
          date: '2024-01-13',
          description: 'Transferencia electrónica',
          amount: 200000,
          is_matched: true,
          match_id: '3'
        },
        {
          id: 'bank_2',
          type: 'bank',
          date: '2024-01-15',
          description: 'Depósito en efectivo',
          amount: 150000,
          is_matched: false
        },
        {
          id: 'bank_3',
          type: 'bank',
          date: '2024-01-14',
          description: 'Comisión bancaria',
          amount: -2500,
          is_matched: false
        },
        {
          id: 'bank_4',
          type: 'bank',
          date: '2024-01-16',
          description: 'Interés ganado',
          amount: 5000,
          is_matched: false
        }
      ];

      setBookItems(bookItemsData);
      setBankItems(bankItemsData);
    } catch (error) {
      console.error('Error loading reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchItems = (bookId: string, bankId: string) => {
    setBookItems(prev => prev.map(item => 
      item.id === bookId 
        ? { ...item, is_matched: true, match_id: bankId }
        : item
    ));
    
    setBankItems(prev => prev.map(item => 
      item.id === bankId 
        ? { ...item, is_matched: true, match_id: bookId }
        : item
    ));
  };

  const handleUnmatchItem = (itemId: string, type: 'book' | 'bank') => {
    if (type === 'book') {
      const item = bookItems.find(i => i.id === itemId);
      if (item?.match_id) {
        setBankItems(prev => prev.map(i => 
          i.id === item.match_id 
            ? { ...i, is_matched: false, match_id: undefined }
            : i
        ));
      }
      setBookItems(prev => prev.map(i => 
        i.id === itemId 
          ? { ...i, is_matched: false, match_id: undefined }
          : i
      ));
    } else {
      const item = bankItems.find(i => i.id === itemId);
      if (item?.match_id) {
        setBookItems(prev => prev.map(i => 
          i.id === item.match_id 
            ? { ...i, is_matched: false, match_id: undefined }
            : i
        ));
      }
      setBankItems(prev => prev.map(i => 
        i.id === itemId 
          ? { ...i, is_matched: false, match_id: undefined }
          : i
      ));
    }
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newAdjustment = {
        id: Date.now().toString(),
        type: adjustmentForm.type,
        description: adjustmentForm.description,
        amount: parseFloat(adjustmentForm.amount),
        date: adjustmentForm.date,
        created_at: new Date().toISOString()
      };

      setAdjustments(prev => [...prev, newAdjustment]);
      
      // Agregar como item del libro
      const newBookItem: ReconciliationItem = {
        id: `adj_${Date.now()}`,
        type: 'book',
        date: adjustmentForm.date,
        description: `Ajuste: ${adjustmentForm.description}`,
        amount: adjustmentForm.type === 'bank_charge' ? -Math.abs(parseFloat(adjustmentForm.amount)) : Math.abs(parseFloat(adjustmentForm.amount)),
        is_matched: false
      };

      setBookItems(prev => [...prev, newBookItem]);

      setAdjustmentForm({
        type: 'bank_charge',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAdjustmentModal(false);
      alert('Ajuste agregado exitosamente.');
    } catch (error) {
      console.error('Error creating adjustment:', error);
      alert('Error al crear el ajuste. Intente nuevamente.');
    }
  };

  const calculateBalances = () => {
    const bookBalance = bookItems.reduce((sum, item) => sum + item.amount, 0);
    const bankBalance = bankItems.reduce((sum, item) => sum + item.amount, 0);
    const unmatchedBook = bookItems.filter(item => !item.is_matched).reduce((sum, item) => sum + item.amount, 0);
    const unmatchedBank = bankItems.filter(item => !item.is_matched).reduce((sum, item) => sum + item.amount, 0);
    
    return {
      bookBalance,
      bankBalance,
      unmatchedBook,
      unmatchedBank,
      difference: bookBalance - bankBalance,
      isReconciled: Math.abs(unmatchedBook - unmatchedBank) < 0.01
    };
  };

  const balances = calculateBalances();

  const downloadExcel = () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Conciliación Bancaria\n';
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Fecha,Descripción,Referencia,Débito,Crédito,Estado\n';
      
      filteredTransactions.forEach(transaction => {
        const row = [
          new Date(transaction.date).toLocaleDateString(),
          `"${transaction.description}"`,
          transaction.reference,
          transaction.type === 'debit' ? transaction.amount.toLocaleString() : '',
          transaction.type === 'credit' ? transaction.amount.toLocaleString() : '',
          transaction.status === 'reconciled' ? 'Conciliado' : 'Pendiente'
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar resumen
      csvContent += '\nResumen de Conciliación:\n';
      csvContent += `Total Transacciones:,${filteredTransactions.length}\n`;
      csvContent += `Transacciones Conciliadas:,${filteredTransactions.filter(t => t.status === 'reconciled').length}\n`;
      csvContent += `Transacciones Pendientes:,${filteredTransactions.filter(t => t.status === 'pending').length}\n`;

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `conciliacion_bancaria_${new Date().toISOString().split('T')[0]}.csv`);
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
            <p className="mt-4 text-gray-600">Cargando datos de conciliación...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Conciliación Bancaria</h1>
            <p className="text-gray-600 mt-1">Reconcilie las transacciones del libro con el estado bancario</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-settings-line mr-2"></i>
              Nuevo Ajuste
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

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
              >
                <option value="">Seleccionar banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} - {bank.account_number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Conciliación
              </label>
              <input
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadData}
                disabled={!selectedBank}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <i className="ri-refresh-line mr-2"></i>
                Cargar Datos
              </button>
            </div>
          </div>
        </div>

        {selectedBank && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <i className="ri-book-line text-2xl text-blue-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Balance Libro</p>
                    <p className="text-xl font-bold text-gray-900">
                      RD${balances.bookBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <i className="ri-bank-line text-2xl text-green-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Balance Banco</p>
                    <p className="text-xl font-bold text-gray-900">
                      RD${balances.bankBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <i className="ri-question-line text-2xl text-yellow-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sin Conciliar</p>
                    <p className="text-xl font-bold text-gray-900">
                      {bookItems.filter(i => !i.is_matched).length + bankItems.filter(i => !i.is_matched).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${Math.abs(balances.difference) < 0.01 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <i className={`ri-calculator-line text-2xl ${Math.abs(balances.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Diferencia</p>
                    <p className={`text-xl font-bold ${Math.abs(balances.difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      RD${Math.abs(balances.difference).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${balances.isReconciled ? 'bg-green-100' : 'bg-red-100'}`}>
                    <i className={`ri-check-line text-2xl ${balances.isReconciled ? 'text-green-600' : 'text-red-600'}`}></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Estado</p>
                    <p className={`text-sm font-bold ${balances.isReconciled ? 'text-green-600' : 'text-red-600'}`}>
                      {balances.isReconciled ? 'Conciliado' : 'Pendiente'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Book Items */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Transacciones del Libro</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookItems.map((item) => (
                        <tr key={item.id} className={item.is_matched ? 'bg-green-50' : ''}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                            item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            RD${Math.abs(item.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.is_matched 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.is_matched ? 'Conciliado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            {item.is_matched ? (
                              <button
                                onClick={() => handleUnmatchItem(item.id, 'book')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Deshacer
                              </button>
                            ) : (
                              <select
                                onChange={(e) => e.target.value && handleMatchItems(item.id, e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 pr-8"
                                defaultValue=""
                              >
                                <option value="">Conciliar con...</option>
                                {bankItems.filter(b => !b.is_matched && Math.abs(b.amount - item.amount) < 0.01).map((bankItem) => (
                                  <option key={bankItem.id} value={bankItem.id}>
                                    {bankItem.description.substring(0, 20)}...
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bank Items */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Estado Bancario</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bankItems.map((item) => (
                        <tr key={item.id} className={item.is_matched ? 'bg-green-50' : ''}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                            item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            RD${Math.abs(item.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.is_matched 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.is_matched ? 'Conciliado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            {item.is_matched ? (
                              <button
                                onClick={() => handleUnmatchItem(item.id, 'bank')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Deshacer
                              </button>
                            ) : (
                              <select
                                onChange={(e) => e.target.value && handleMatchItems(e.target.value, item.id)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 pr-8"
                                defaultValue=""
                              >
                                <option value="">Conciliar con...</option>
                                {bookItems.filter(b => !b.is_matched && Math.abs(b.amount - item.amount) < 0.01).map((bookItem) => (
                                  <option key={bookItem.id} value={bookItem.id}>
                                    {bookItem.description.substring(0, 20)}...
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Adjustment Modal */}
        {showAdjustmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Nuevo Ajuste de Conciliación</h2>
                  <button
                    onClick={() => setShowAdjustmentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <form onSubmit={handleSubmitAdjustment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Ajuste *
                      </label>
                      <select
                        required
                        value={adjustmentForm.type}
                        onChange={(e) => setAdjustmentForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                      >
                        <option value="bank_charge">Comisión Bancaria</option>
                        <option value="interest_earned">Interés Ganado</option>
                        <option value="nsf_fee">Comisión por Fondos Insuficientes</option>
                        <option value="service_charge">Cargo por Servicio</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        required
                        value={adjustmentForm.date}
                        onChange={(e) => setAdjustmentForm(prev => ({ ...prev, date: e.target.value }))}
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
                      value={adjustmentForm.description}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={adjustmentForm.amount}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdjustmentModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
                    >
                      Crear Ajuste
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
