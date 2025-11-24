import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { exportToExcelWithHeaders } from '../../../utils/exportImportUtils';
import { useAuth } from '../../../hooks/useAuth';
import { pettyCashService, chartAccountsService } from '../../../services/database';

interface PettyCashFund {
  id: string;
  name: string;
  location: string;
  custodian: string;
  initialAmount: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
  pettyCashAccountId?: string;
  bankAccountId?: string;
}

interface PettyCashExpense {
  id: string;
  fundId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  receipt: string;
  approvedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  expenseAccountId?: string;
}

interface PettyCashReimbursement {
  id: string;
  fundId: string;
  date: string;
  amount: number;
  description: string;
  bankAccountId?: string;
}

const PettyCashPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'funds' | 'expenses' | 'reimbursements'>('funds');
  const [funds, setFunds] = useState<PettyCashFund[]>([]);
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([]);
  const [reimbursements, setReimbursements] = useState<PettyCashReimbursement[]>([]);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showReimbursementModal, setShowReimbursementModal] = useState(false);

  const [selectedFund, setSelectedFund] = useState<PettyCashFund | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<PettyCashExpense | null>(null);

  const [accounts, setAccounts] = useState<any[]>([]);

  const [loadingFunds, setLoadingFunds] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Cargar fondos y cuentas reales
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoadingFunds(true);
        const [fundsData, accountsData, expensesData, reimbursementsData] = await Promise.all([
          pettyCashService.getFunds(user.id),
          chartAccountsService.getAll(user.id),
          pettyCashService.getExpenses(user.id),
          pettyCashService.getReimbursements(user.id),
        ]);

        const mappedFunds: PettyCashFund[] = (fundsData || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          location: f.location || '',
          custodian: f.custodian || '',
          initialAmount: Number(f.initial_amount) || 0,
          currentBalance: Number(f.current_balance) || 0,
          status: (f.status as 'active' | 'inactive') || 'active',
          createdAt: f.created_at ? String(f.created_at).split('T')[0] : '',
          pettyCashAccountId: f.petty_cash_account_id || undefined,
          bankAccountId: f.bank_account_id || undefined,
        }));
        setFunds(mappedFunds);

        setAccounts(accountsData || []);

        const mappedExpenses: PettyCashExpense[] = (expensesData || []).map((e: any) => ({
          id: e.id,
          fundId: e.fund_id,
          date: e.expense_date,
          description: e.description,
          category: e.category || '',
          amount: Number(e.amount) || 0,
          receipt: e.receipt_number || '',
          approvedBy: e.approved_by || '',
          status: (e.status as 'pending' | 'approved' | 'rejected') || 'pending',
          expenseAccountId: e.expense_account_id || undefined,
        }));
        setExpenses(mappedExpenses);

        const mappedReimbursements: PettyCashReimbursement[] = (reimbursementsData || []).map((r: any) => ({
          id: r.id,
          fundId: r.fund_id,
          date: r.reimbursement_date,
          amount: Number(r.amount) || 0,
          description: r.description || '',
          bankAccountId: r.bank_account_id || undefined,
        }));
        setReimbursements(mappedReimbursements);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading petty cash data:', error);
      } finally {
        setLoadingFunds(false);
        setLoadingExpenses(false);
      }
    };

    loadData();
  }, [user]);

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const name = String(formData.get('name') || '').trim();
    const location = String(formData.get('location') || '').trim();
    const custodian = String(formData.get('custodian') || '').trim();
    const initialAmount = parseFloat(String(formData.get('initialAmount') || '0')) || 0;
    const pettyCashAccountId = String(formData.get('pettyCashAccountId') || '');
    const bankAccountId = String(formData.get('bankAccountId') || '');

    if (!pettyCashAccountId || !bankAccountId) {
      alert('Debe seleccionar la cuenta de Caja Chica y la cuenta de Banco.');
      return;
    }

    try {
      const created = await pettyCashService.createFund(user.id, {
        name,
        location,
        custodian,
        initial_amount: initialAmount,
        petty_cash_account_id: pettyCashAccountId,
        bank_account_id: bankAccountId,
      });

      const mapped: PettyCashFund = {
        id: created.id,
        name: created.name,
        location: created.location || '',
        custodian: created.custodian || '',
        initialAmount: Number(created.initial_amount) || 0,
        currentBalance: Number(created.current_balance) || 0,
        status: (created.status as 'active' | 'inactive') || 'active',
        createdAt: created.created_at ? String(created.created_at).split('T')[0] : '',
        pettyCashAccountId: created.petty_cash_account_id || undefined,
        bankAccountId: created.bank_account_id || undefined,
      };

      setFunds(prev => [mapped, ...prev]);
      setShowFundModal(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating petty cash fund:', error);
      alert('Error al crear el fondo de caja chica');
    }
  };

  const pettyCashAccounts = accounts.filter(
    acc => acc.allowPosting && acc.type === 'asset' && !acc.isBankAccount
  );

  const bankAccounts = accounts.filter(
    acc => acc.allowPosting && acc.type === 'asset' && acc.isBankAccount
  );

  // Cuentas permitidas para gastos de Caja Chica:
  // - Cuentas por cobrar Accionistas
  // - Cuentas por cobrar funcionarios y empleados
  // - Categoría 5 (Costos) -> type 'cost'
  // - Categoría 6 (Gastos) -> type 'expense'
  const expenseAccounts = accounts.filter((acc) => {
    if (!acc.allowPosting) return false;

    if (acc.type === 'expense' || acc.type === 'cost') return true;

    const name = String(acc.name || '').toLowerCase();
    if (name.includes('cuentas por cobrar accionistas')) return true;
    if (name.includes('cuentas por cobrar funcionarios') || name.includes('cuentas por cobrar empleados')) return true;

    return false;
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const fundId = String(formData.get('fundId') || '');
    const date = String(formData.get('date') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const amount = parseFloat(String(formData.get('amount') || '0')) || 0;
    const receipt = String(formData.get('receipt') || '').trim();
    const expenseAccountId = String(formData.get('expenseAccountId') || '');

    if (!fundId) {
      alert('Debe seleccionar un fondo de caja chica.');
      return;
    }
    if (!expenseAccountId) {
      alert('Debe seleccionar la cuenta contable del gasto.');
      return;
    }

    try {
      const created = await pettyCashService.createExpense(user.id, {
        fund_id: fundId,
        expense_date: date || new Date().toISOString().split('T')[0],
        description,
        category,
        amount,
        receipt_number: receipt,
        expense_account_id: expenseAccountId,
      });

      const mapped: PettyCashExpense = {
        id: created.id,
        fundId: created.fund_id,
        date: created.expense_date,
        description: created.description,
        category: created.category || '',
        amount: Number(created.amount) || 0,
        receipt: created.receipt_number || '',
        approvedBy: created.approved_by || '',
        status: (created.status as 'pending' | 'approved' | 'rejected') || 'pending',
        expenseAccountId: created.expense_account_id || undefined,
      };

      setExpenses(prev => [mapped, ...prev]);
      setShowExpenseModal(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating petty cash expense:', error);
      alert('Error al registrar el gasto de caja chica');
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    if (!user) return;
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    if (expense.status === 'approved') return;

    if (!confirm('¿Desea aprobar este gasto de caja chica?')) return;

    try {
      const updated = await pettyCashService.approveExpense(user.id, expenseId, user.email || null);

      // Actualizar gastos en UI
      setExpenses(prev => prev.map(e => (
        e.id === expenseId
          ? {
              ...e,
              status: (updated.status as 'pending' | 'approved' | 'rejected') || 'approved',
              approvedBy: updated.approved_by || e.approvedBy,
            }
          : e
      )));

      // Recargar fondos para reflejar nuevo balance
      if (user) {
        const fundsData = await pettyCashService.getFunds(user.id);
        const mappedFunds: PettyCashFund[] = (fundsData || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          location: f.location || '',
          custodian: f.custodian || '',
          initialAmount: Number(f.initial_amount) || 0,
          currentBalance: Number(f.current_balance) || 0,
          status: (f.status as 'active' | 'inactive') || 'active',
          createdAt: f.created_at ? String(f.created_at).split('T')[0] : '',
          pettyCashAccountId: f.petty_cash_account_id || undefined,
          bankAccountId: f.bank_account_id || undefined,
        }));
        setFunds(mappedFunds);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error approving petty cash expense:', error);
      alert('Error al aprobar el gasto de caja chica');
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    if (!user) return;
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    if (expense.status === 'rejected') return;

    if (!confirm('¿Desea marcar este gasto de caja chica como RECHAZADO?')) return;

    try {
      const updated = await pettyCashService.rejectExpense(user.id, expenseId, user.email || null);

      setExpenses(prev => prev.map(e => (
        e.id === expenseId
          ? {
              ...e,
              status: (updated.status as 'pending' | 'approved' | 'rejected') || 'rejected',
              approvedBy: updated.approved_by || e.approvedBy,
            }
          : e
      )));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error rejecting petty cash expense:', error);
      alert('Error al rechazar el gasto de caja chica');
    }
  };

  const getTotalFunds = () => funds.reduce((sum, fund) => sum + fund.currentBalance, 0);
  const getTotalExpenses = () => expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const getPendingExpenses = () => expenses.filter(expense => expense.status === 'pending').length;
  const getTotalReimbursements = () => reimbursements.reduce((sum, r) => sum + r.amount, 0);

  const downloadExcel = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (activeTab === 'funds') {
        const headers = [
          { key: 'name', title: 'Fondo' },
          { key: 'location', title: 'Ubicación' },
          { key: 'custodian', title: 'Custodio' },
          { key: 'initialAmount', title: 'Monto Inicial' },
          { key: 'currentBalance', title: 'Balance Actual' },
          { key: 'status', title: 'Estado' },
          { key: 'createdAt', title: 'Creado' },
        ];
        const rows = funds.map(f => ({
          name: f.name,
          location: f.location,
          custodian: f.custodian,
          initialAmount: f.initialAmount || 0,
          currentBalance: f.currentBalance || 0,
          status: f.status === 'active' ? 'Activo' : 'Inactivo',
          createdAt: f.createdAt,
        }));
        exportToExcelWithHeaders(rows, headers, `caja_chica_fondos_${today}`, 'Fondos', [24,18,18,16,16,12,14]);
        return;
      }

      if (activeTab === 'expenses') {
        const headers = [
          { key: 'date', title: 'Fecha' },
          { key: 'fund', title: 'Fondo' },
          { key: 'description', title: 'Descripción' },
          { key: 'category', title: 'Categoría' },
          { key: 'amount', title: 'Monto' },
          { key: 'status', title: 'Estado' },
          { key: 'approvedBy', title: 'Aprobado Por' },
        ];
        const fundNameById = new Map(funds.map(f => [f.id, f.name] as const));
        const rows = expenses.map(e => ({
          date: e.date,
          fund: fundNameById.get(e.fundId) || e.fundId || '',
          description: e.description,
          category: e.category,
          amount: e.amount || 0,
          status: e.status === 'approved' ? 'Aprobado' : e.status === 'pending' ? 'Pendiente' : 'Rechazado',
          approvedBy: e.approvedBy || 'N/A',
        }));
        exportToExcelWithHeaders(rows, headers, `caja_chica_gastos_${today}`, 'Gastos', [12,22,40,18,14,12,18]);
        return;
      }

      if (activeTab === 'reimbursements') {
        const headers = [
          { key: 'date', title: 'Fecha' },
          { key: 'fund', title: 'Fondo' },
          { key: 'amount', title: 'Monto' },
          { key: 'description', title: 'Descripción' },
        ];
        const fundNameById = new Map(funds.map(f => [f.id, f.name] as const));
        const rows = reimbursements.map(r => ({
          date: r.date,
          fund: fundNameById.get(r.fundId) || r.fundId || '',
          amount: r.amount || 0,
          description: r.description || '',
        }));
        exportToExcelWithHeaders(rows, headers, `caja_chica_reembolsos_${today}`, 'Reembolsos', [12,22,14,40]);
        return;
      }

      // Reembolsos u otras pestañas (si se agregan)
      alert('No hay datos para exportar en esta pestaña.');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Caja Chica</h1>
            <p className="text-gray-600">Gestión de fondos de gastos menores</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadExcel}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Descargar Excel
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-home-line mr-2"></i>
              Volver al Inicio
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-wallet-3-line text-xl text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total en Fondos</p>
                <p className="text-2xl font-bold text-gray-900">
                  RD${getTotalFunds().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Fondos Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {funds.filter(f => f.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <i className="ri-file-list-3-line text-xl text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gastos Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{getPendingExpenses()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <i className="ri-shopping-cart-line text-xl text-red-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Gastos</p>
                <p className="text-2xl font-bold text-gray-900">
                  RD${getTotalExpenses().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('funds')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'funds'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-wallet-3-line mr-2"></i>
                Fondos de Caja Chica
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'expenses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-shopping-cart-line mr-2"></i>
                Gastos y Comprobantes
              </button>
              <button
                onClick={() => setActiveTab('reimbursements')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'reimbursements'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-refund-2-line mr-2"></i>
                Reembolsos
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: Fondos */}
            {activeTab === 'funds' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Fondos de Caja Chica</h2>
                  <button
                    onClick={() => setShowFundModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Crear Fondo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loadingFunds && funds.length === 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-gray-500">
                      Cargando fondos de caja chica...
                    </div>
                  )}
                  {funds.map((fund) => (
                    <div key={fund.id} className="bg-gray-50 p-6 rounded-lg border">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-gray-900">{fund.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          fund.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {fund.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><i className="ri-map-pin-line mr-2"></i>{fund.location}</p>
                        <p><i className="ri-user-line mr-2"></i>Custodio: {fund.custodian}</p>
                        <p><i className="ri-calendar-line mr-2"></i>Creado: {fund.createdAt}</p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Monto Inicial:</span>
                          <span className="font-medium">RD${fund.initialAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Balance Actual:</span>
                          <span className="font-bold text-lg text-blue-600">
                            RD${fund.currentBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex space-x-2">
                        <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors whitespace-nowrap">
                          Ver Detalles
                        </button>
                        <button className="flex-1 bg-gray-600 text-white py-2 px-3 rounded text-sm hover:bg-gray-700 transition-colors whitespace-nowrap">
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Gastos */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Gastos y Comprobantes</h2>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Registrar Gasto
                  </button>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
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
                      {loadingExpenses && expenses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                            Cargando gastos de caja chica...
                          </td>
                        </tr>
                      )}
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {expense.date}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {expense.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {expense.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            RD${expense.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              expense.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : expense.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {expense.status === 'approved' ? 'Aprobado' : 
                               expense.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              onClick={() => setSelectedExpense(expense)}
                            >
                              Ver
                            </button>
                            {expense.status === 'pending' && (
                              <button
                                onClick={() => handleApproveExpense(expense.id)}
                                className="text-green-600 hover:text-green-900 mr-3"
                              >
                                Aprobar
                              </button>
                            )}
                            {expense.status !== 'rejected' && (
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleRejectExpense(expense.id)}
                              >
                                Rechazar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Reembolsos */}
            {activeTab === 'reimbursements' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Solicitudes de Reembolso</h2>
                  <button
                    onClick={() => setShowReimbursementModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Nueva Solicitud
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <i className="ri-information-line text-yellow-600 mr-3 mt-1"></i>
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">
                        Proceso de Reembolso
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Los reembolsos se registran cuando se repone el fondo de caja chica desde la cuenta bancaria.
                        Cada reembolso aumenta el saldo del fondo y genera un asiento contable Banco vs Caja Chica.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fondo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reimbursements.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            No hay reembolsos registrados.
                          </td>
                        </tr>
                      )}
                      {reimbursements.map((r) => (
                        <tr key={r.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {funds.find(f => f.id === r.fundId)?.name || r.fundId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            RD${r.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{r.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Crear Fondo */}
        {showFundModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Fondo</h3>
              
              <form onSubmit={handleCreateFund} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Fondo
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Caja Chica Oficina Principal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    name="location"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Santo Domingo - Oficina Central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custodio Responsable
                  </label>
                  <input
                    type="text"
                    name="custodian"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre del responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Inicial (RD$)
                  </label>
                  <input
                    type="number"
                    name="initialAmount"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta de Caja Chica
                  </label>
                  <select
                    name="pettyCashAccountId"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {pettyCashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta de Banco / Origen
                  </label>
                  <select
                    name="bankAccountId"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Crear Fondo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Registrar Gasto */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Gasto</h3>
              
              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fondo de Caja Chica
                  </label>
                  <select
                    name="fundId"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar fondo</option>
                    {funds.filter(f => f.status === 'active').map(fund => (
                      <option key={fund.id} value={fund.id}>{fund.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    name="description"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción del gasto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Suministros de Oficina">Suministros de Oficina</option>
                    <option value="Viáticos">Viáticos</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Comunicaciones">Comunicaciones</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto (RD$)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Recibo
                  </label>
                  <input
                    type="text"
                    name="receipt"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: REC-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta de Gasto
                  </label>
                  <select
                    name="expenseAccountId"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {expenseAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Nuevo Reembolso */}
        {showReimbursementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Reembolso</h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  const formData = new FormData(e.currentTarget as HTMLFormElement);
                  const fundId = String(formData.get('fundId') || '');
                  const date = String(formData.get('date') || '').trim() || new Date().toISOString().split('T')[0];
                  const amount = parseFloat(String(formData.get('amount') || '0')) || 0;
                  const description = String(formData.get('description') || '').trim();
                  const bankAccountId = String(formData.get('bankAccountId') || '');

                  if (!fundId) {
                    alert('Debe seleccionar un fondo de caja chica.');
                    return;
                  }
                  if (!bankAccountId) {
                    alert('Debe seleccionar la cuenta bancaria de origen.');
                    return;
                  }

                  try {
                    const created = await pettyCashService.createReimbursement(user.id, {
                      fund_id: fundId,
                      reimbursement_date: date,
                      amount,
                      description,
                      bank_account_id: bankAccountId,
                    });

                    const mapped: PettyCashReimbursement = {
                      id: created.id,
                      fundId: created.fund_id,
                      date: created.reimbursement_date,
                      amount: Number(created.amount) || 0,
                      description: created.description || '',
                      bankAccountId: created.bank_account_id || undefined,
                    };

                    setReimbursements(prev => [mapped, ...prev]);

                    // Recargar fondos para reflejar nuevo saldo
                    const fundsData = await pettyCashService.getFunds(user.id);
                    const mappedFunds: PettyCashFund[] = (fundsData || []).map((f: any) => ({
                      id: f.id,
                      name: f.name,
                      location: f.location || '',
                      custodian: f.custodian || '',
                      initialAmount: Number(f.initial_amount) || 0,
                      currentBalance: Number(f.current_balance) || 0,
                      status: (f.status as 'active' | 'inactive') || 'active',
                      createdAt: f.created_at ? String(f.created_at).split('T')[0] : '',
                      pettyCashAccountId: f.petty_cash_account_id || undefined,
                      bankAccountId: f.bank_account_id || undefined,
                    }));
                    setFunds(mappedFunds);

                    setShowReimbursementModal(false);
                  } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error creating petty cash reimbursement:', error);
                    alert('Error al registrar el reembolso de caja chica');
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fondo de Caja Chica
                  </label>
                  <select
                    name="fundId"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar fondo</option>
                    {funds.filter(f => f.status === 'active').map(fund => (
                      <option key={fund.id} value={fund.id}>{fund.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Reembolso
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto (RD$)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    name="description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción del reembolso (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta de Banco / Origen
                  </label>
                  <select
                    name="bankAccountId"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                  >
                    <option value="">Seleccionar cuenta</option>
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReimbursementModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PettyCashPage;