import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { openingBalancesService, chartAccountsService } from '../../../services/database';

export default function OpeningBalancesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balances, setBalances] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [validationSummary, setValidationSummary] = useState<any>(null);
  const [editingBalance, setEditingBalance] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, [user, fiscalYear]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [balancesData, accountsData, summary] = await Promise.all([
        openingBalancesService.getAll(user.id, fiscalYear),
        chartAccountsService.getAll(user.id),
        openingBalancesService.getValidationSummary(user.id, fiscalYear)
      ]);

      setBalances(balancesData);
      setAccounts(accountsData);
      setValidationSummary(summary);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromAccounts = async () => {
    if (!confirm(`¿Importar todas las cuentas del catálogo como balances iniciales para el año ${fiscalYear}?`)) return;
    
    setLoading(true);
    try {
      await openingBalancesService.importFromAccounts(user!.id, fiscalYear, openingDate);
      alert('Cuentas importadas exitosamente');
      await loadData();
    } catch (error: any) {
      alert('Error al importar cuentas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBalance = async (balance: any, field: 'debit' | 'credit', value: number) => {
    try {
      const updatedBalance = {
        ...balance,
        [field]: value,
        [field === 'debit' ? 'credit' : 'debit']: 0, // Si se ingresa débito, crédito se pone en 0 y viceversa
        balance: value,
        balance_type: field
      };

      await openingBalancesService.update(balance.id, updatedBalance);
      await loadData();
    } catch (error: any) {
      alert('Error al actualizar balance: ' + error.message);
    }
  };

  const handlePostToJournal = async () => {
    if (!validationSummary?.isBalanced) {
      alert('Los balances no cuadran. Los débitos deben ser iguales a los créditos.');
      return;
    }

    if (!confirm(`¿Contabilizar los balances iniciales del año ${fiscalYear} en el Diario General?\n\nEsta acción NO se puede deshacer.`)) return;

    setLoading(true);
    try {
      const result = await openingBalancesService.postToJournal(user!.id, fiscalYear);
      alert(`Balances contabilizados exitosamente.\n\n${result.linesCount} cuentas registradas\nDébito Total: RD$ ${result.totalDebit.toLocaleString('es-DO')}\nCrédito Total: RD$ ${result.totalCredit.toLocaleString('es-DO')}`);
      await loadData();
    } catch (error: any) {
      alert('Error al contabilizar balances: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isPosted = validationSummary?.isPosted || false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Balances Iniciales</h1>
            <p className="text-gray-600">Registro de saldos de apertura del ejercicio fiscal</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Volver
          </button>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año Fiscal
              </label>
              <input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isPosted}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Apertura
              </label>
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled={isPosted}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleImportFromAccounts}
                disabled={loading || isPosted || balances.length > 0}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <i className="ri-download-2-line mr-2"></i>
                Importar Catálogo
              </button>
            </div>
            <div className="flex items-end">
              <button
                onClick={handlePostToJournal}
                disabled={loading || isPosted || !validationSummary?.isBalanced || validationSummary?.accountsWithBalance === 0}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                <i className="ri-check-double-line mr-2"></i>
                Contabilizar
              </button>
            </div>
          </div>
        </div>

        {/* Validation Summary */}
        {validationSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 mr-4">
                  <i className="ri-list-check text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cuentas</p>
                  <p className="text-2xl font-bold text-gray-900">{validationSummary.totalAccounts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100 mr-4">
                  <i className="ri-add-circle-line text-xl text-green-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Débito</p>
                  <p className="text-2xl font-bold text-green-900">
                    RD$ {validationSummary.totalDebit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100 mr-4">
                  <i className="ri-subtract-line text-xl text-red-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Crédito</p>
                  <p className="text-2xl font-bold text-red-900">
                    RD$ {validationSummary.totalCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className={`bg-white rounded-lg shadow-sm border-2 p-6 ${validationSummary.isBalanced ? 'border-green-500' : 'border-red-500'}`}>
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${validationSummary.isBalanced ? 'bg-green-100' : 'bg-red-100'}`}>
                  <i className={`text-xl ${validationSummary.isBalanced ? 'ri-checkbox-circle-line text-green-600' : 'ri-error-warning-line text-red-600'}`}></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Estado</p>
                  <p className={`text-lg font-bold ${validationSummary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {validationSummary.isBalanced ? 'Cuadrado' : 'Descuadrado'}
                  </p>
                  {!validationSummary.isBalanced && (
                    <p className="text-xs text-red-600">
                      Dif: RD$ {Math.abs(validationSummary.difference).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Balances Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Balances Iniciales - Año Fiscal {fiscalYear}
              {isPosted && (
                <span className="ml-3 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  <i className="ri-check-line mr-1"></i>
                  Contabilizado
                </span>
              )}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débito</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {balances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {balance.account_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {balance.account_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={balance.debit || 0}
                        onChange={(e) => handleUpdateBalance(balance, 'debit', parseFloat(e.target.value) || 0)}
                        disabled={isPosted}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={balance.credit || 0}
                        onChange={(e) => handleUpdateBalance(balance, 'credit', parseFloat(e.target.value) || 0)}
                        disabled={isPosted}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium">
                      RD$ {(balance.balance || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      <span className={`ml-2 text-xs ${balance.balance_type === 'debit' ? 'text-green-600' : 'text-red-600'}`}>
                        {balance.balance_type === 'debit' ? 'DB' : 'CR'}
                      </span>
                    </td>
                  </tr>
                ))}
                {balances.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <i className="ri-folder-open-line text-5xl text-gray-400 mb-4"></i>
                      <p className="text-lg font-medium">No hay balances registrados</p>
                      <p className="text-sm">Usa el botón "Importar Catálogo" para cargar todas las cuentas</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
