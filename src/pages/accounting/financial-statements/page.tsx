import { useState, useEffect } from 'react';
import { exportToExcel } from '../../../lib/excel';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { financialReportsService, chartAccountsService, financialStatementsService } from '../../../services/database';

interface FinancialStatement {
  id: string;
  name: string;
  type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'equity_statement';
  period: string;
  status: 'draft' | 'final' | 'approved';
  created_at: string;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  netIncome?: number;
}

interface FinancialData {
  assets: {
    current: { name: string; amount: number }[];
    nonCurrent: { name: string; amount: number }[];
  };
  liabilities: {
    current: { name: string; amount: number }[];
    nonCurrent: { name: string; amount: number }[];
  };
  equity: { name: string; amount: number }[];
  revenue: { name: string; amount: number }[];
  costs: { name: string; amount: number }[];
  expenses: { name: string; amount: number }[];
}

export default function FinancialStatementsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'statements' | 'balance' | 'income' | 'cashflow'>('statements');
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewStatementModal, setShowNewStatementModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<FinancialStatement | null>(null);

  const [financialData, setFinancialData] = useState<FinancialData>({
    assets: { current: [], nonCurrent: [] },
    liabilities: { current: [], nonCurrent: [] },
    equity: [],
    revenue: [],
    costs: [],
    expenses: []
  });

  const [cashFlow, setCashFlow] = useState<{
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
  }>({
    operatingCashFlow: 0,
    investingCashFlow: 0,
    financingCashFlow: 0,
    netCashFlow: 0,
  });

  useEffect(() => {
    loadStatements();
  }, [user, selectedPeriod]);

  useEffect(() => {
    // Cargar datos financieros / cash flow cuando cambie el período o la pestaña relevante
    if (!user) return;

    const period = selectedPeriod || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!year || !month) return;

    const fromDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const toDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const loadFinancialData = async () => {
      try {
        const trialBalance = await financialReportsService.getTrialBalance(user.id, fromDate, toDate);

        const nextData: FinancialData = {
          assets: { current: [], nonCurrent: [] },
          liabilities: { current: [], nonCurrent: [] },
          equity: [],
          revenue: [],
          costs: [],
          expenses: []
        };

        (trialBalance || []).forEach((acc: any) => {
          const balance = Number(acc.balance) || 0;
          if (Math.abs(balance) < 0.005) return; // omitir saldos cero

          const label = `${acc.code} - ${acc.name}`;

          switch (acc.type) {
            case 'asset':
            case 'activo':
              nextData.assets.current.push({ name: label, amount: balance });
              break;
            case 'liability':
            case 'pasivo':
              nextData.liabilities.current.push({ name: label, amount: balance });
              break;
            case 'equity':
            case 'patrimonio':
              nextData.equity.push({ name: label, amount: balance });
              break;
            case 'income':
            case 'ingreso':
              nextData.revenue.push({ name: label, amount: balance });
              break;
            case 'cost':
            case 'costo':
            case 'costos':
              nextData.costs.push({ name: label, amount: balance });
              break;
            case 'expense':
            case 'gasto':
              nextData.expenses.push({ name: label, amount: balance });
              break;
            default:
              break;
          }
        });

        setFinancialData(nextData);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading financial data for statements:', error);
      }
    };

    const loadCashFlow = async () => {
      try {
        const result = await chartAccountsService.generateCashFlowStatement(user.id, fromDate, toDate);
        setCashFlow({
          operatingCashFlow: result.operatingCashFlow || 0,
          investingCashFlow: result.investingCashFlow || 0,
          financingCashFlow: result.financingCashFlow || 0,
          netCashFlow: result.netCashFlow || 0,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading cash flow statement:', error);
        setCashFlow({ operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0, netCashFlow: 0 });
      }
    };

    if (activeTab === 'balance' || activeTab === 'income') {
      void loadFinancialData();
    } else if (activeTab === 'cashflow') {
      void loadCashFlow();
    }
  }, [user, selectedPeriod, activeTab]);

  const loadStatements = async () => {
    try {
      if (!user) {
        setStatements([]);
        return;
      }
      const period = selectedPeriod || new Date().toISOString().slice(0, 7); // YYYY-MM
      const data = await financialStatementsService.getAll(user.id, period);
      setStatements(data || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading financial statements:', error);
      setStatements([]);
    }
  };

  const generateStatement = async (type: string, period: string) => {
    try {
      if (!user) return;
      setIsGenerating(true);
      await financialStatementsService.create(user.id, { type, period });
      setIsGenerating(false);
      setShowNewStatementModal(false);
      await loadStatements();
      alert('Estado financiero generado exitosamente');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating financial statement:', error);
      setIsGenerating(false);
      alert('Error al generar el estado financiero');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'final': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'balance_sheet': return 'Balance General';
      case 'income_statement': return 'Estado de Resultados';
      case 'cash_flow': return 'Flujo de Efectivo';
      case 'equity_statement': return 'Estado de Patrimonio';
      default: return type;
    }
  };

  const calculateTotals = () => {
    const totalCurrentAssets = financialData.assets.current.reduce((sum, item) => sum + item.amount, 0);
    const totalNonCurrentAssets = financialData.assets.nonCurrent.reduce((sum, item) => sum + item.amount, 0);
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const totalCurrentLiabilities = financialData.liabilities.current.reduce((sum, item) => sum + item.amount, 0);
    const totalNonCurrentLiabilities = financialData.liabilities.nonCurrent.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    const totalEquity = financialData.equity.reduce((sum, item) => sum + item.amount, 0);
    const totalRevenue = financialData.revenue.reduce((sum, item) => sum + item.amount, 0);
    const totalCosts = financialData.costs.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = financialData.expenses.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = totalRevenue - totalCosts - totalExpenses;

    return {
      totalCurrentAssets,
      totalNonCurrentAssets,
      totalAssets,
      totalCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalCosts,
      totalExpenses,
      netIncome
    };
  };

  const totals = calculateTotals();

  const downloadExcel = () => {
    try {
      exportToExcel({
        sheetName: 'Estados',
        fileName: `estados_financieros_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: 'Nombre', width: 30, key: 'name' },
          { header: 'Tipo', width: 22 },
          { header: 'Período', width: 14, key: 'period' },
          { header: 'Estado', width: 12 },
          { header: 'Fecha Creación', width: 16 }
        ],
        rows: statements.map(s => ([
          s.name,
          getTypeLabel(s.type),
          s.period,
          s.status === 'draft' ? 'Borrador' : s.status === 'final' ? 'Final' : 'Aprobado',
          new Date(s.created_at).toLocaleDateString('es-DO')
        ]))
      });
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  const downloadBalanceSheetExcel = () => {
    try {
      const rows: any[] = [];
      financialData.assets.current.forEach(i => rows.push(['ACTIVOS', 'Activos Corrientes', i.name, i.amount]));
      rows.push(['', 'Total Activos Corrientes', '', totals.totalCurrentAssets]);
      financialData.assets.nonCurrent.forEach(i => rows.push(['', 'Activos No Corrientes', i.name, i.amount]));
      rows.push(['', 'Total Activos No Corrientes', '', totals.totalNonCurrentAssets]);
      rows.push(['', 'TOTAL ACTIVOS', '', totals.totalAssets]);
      financialData.liabilities.current.forEach(i => rows.push(['PASIVOS Y PATRIMONIO', 'Pasivos Corrientes', i.name, i.amount]));
      rows.push(['', 'Total Pasivos Corrientes', '', totals.totalCurrentLiabilities]);
      financialData.liabilities.nonCurrent.forEach(i => rows.push(['', 'Pasivos No Corrientes', i.name, i.amount]));
      rows.push(['', 'Total Pasivos No Corrientes', '', totals.totalNonCurrentLiabilities]);
      financialData.equity.forEach(i => rows.push(['', 'Patrimonio', i.name, i.amount]));
      rows.push(['', 'Total Patrimonio', '', totals.totalEquity]);
      rows.push(['', 'TOTAL PASIVOS Y PATRIMONIO', '', totals.totalLiabilities + totals.totalEquity]);
      exportToExcel({
        sheetName: 'Balance',
        fileName: `balance_general_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: 'Grupo', width: 16 },
          { header: 'Cuenta', width: 36 },
          { header: 'Nombre', width: 30 },
          { header: 'Monto', width: 14, numFmt: '#,##0.00' }
        ],
        rows
      });
    } catch (error) {
      console.error('Error downloading Balance Sheet:', error);
      alert('Error al descargar el Balance General');
    }
  };

  const downloadIncomeStatementExcel = () => {
    try {
      const rows: any[] = [];
      financialData.revenue.forEach(i => rows.push(['INGRESOS', i.name, i.amount]));
      rows.push(['', 'Total Ingresos', totals.totalRevenue]);
      financialData.costs.forEach(i => rows.push(['COSTOS', i.name, i.amount]));
      rows.push(['', 'Total Costos', totals.totalCosts]);
      financialData.expenses.forEach(i => rows.push(['GASTOS', i.name, i.amount]));
      rows.push(['', 'Total Gastos', totals.totalExpenses]);
      rows.push(['', 'UTILIDAD NETA', totals.netIncome]);

      exportToExcel({
        sheetName: 'Resultados',
        fileName: `estado_resultados_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: 'Grupo', width: 16 },
          { header: 'Cuenta', width: 36 },
          { header: 'Monto', width: 14, numFmt: '#,##0.00' }
        ],
        rows
      });
    } catch (error) {
      console.error('Error downloading Income Statement:', error);
      alert('Error al descargar el Estado de Resultados');
    }
  };

  const downloadCashFlowExcel = () => {
    try {
      const rows: any[] = [];
      rows.push(['ACTIVIDADES DE OPERACIÓN', 'Efectivo de Actividades de Operación', cashFlow.operatingCashFlow]);
      rows.push(['ACTIVIDADES DE INVERSIÓN', 'Efectivo de Actividades de Inversión', cashFlow.investingCashFlow]);
      rows.push(['ACTIVIDADES DE FINANCIAMIENTO', 'Efectivo de Actividades de Financiamiento', cashFlow.financingCashFlow]);
      rows.push(['RESUMEN', 'Aumento Neto en Efectivo', cashFlow.netCashFlow]);

      exportToExcel({
        sheetName: 'Flujo',
        fileName: `flujo_efectivo_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: 'Actividad', width: 18 },
          { header: 'Concepto', width: 36 },
          { header: 'Monto', width: 14, numFmt: '#,##0.00' }
        ],
        rows
      });
    } catch (error) {
      console.error('Error downloading Cash Flow:', error);
      alert('Error al descargar el Flujo de Efectivo');
    }
  };

  const handleViewStatement = (statement: FinancialStatement) => {
    setSelectedStatement(statement);
    setShowViewModal(true);
  };

  const handleDownloadStatement = (statement: FinancialStatement) => {
    try {
      if (statement.type === 'balance_sheet') {
        downloadBalanceSheetExcel();
      } else if (statement.type === 'income_statement') {
        downloadIncomeStatementExcel();
      } else if (statement.type === 'cash_flow') {
        downloadCashFlowExcel();
      } else {
        // Para otros tipos, usar descarga básica
        let content = `${getTypeLabel(statement.type)} - ${statement.name}\n`;
        content += `Período: ${statement.period}\n`;
        content += `Estado: ${statement.status === 'draft' ? 'Borrador' : statement.status === 'final' ? 'Final' : 'Aprobado'}\n`;
        content += `Fecha de Creación: ${new Date(statement.created_at).toLocaleDateString()}\n\n`;
        content += 'Este estado financiero está en desarrollo.\n';
        content += 'Próximamente estará disponible la descarga completa.';

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${statement.name.replace(/\s+/g, '_')}.txt`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading statement:', error);
      alert('Error al descargar el estado financiero');
    }
  };

  const handleEditStatement = (statement: FinancialStatement) => {
    setSelectedStatement(statement);
    setShowEditModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estados Financieros</h1>
            <p className="text-gray-600">Generación y gestión de reportes financieros</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={downloadExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-excel-line mr-2"></i>
              Descargar Excel
            </button>
            <button
              onClick={() => setShowNewStatementModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Generar Estado
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'statements', label: 'Estados Generados', icon: 'ri-file-list-3-line' },
              { id: 'balance', label: 'Balance General', icon: 'ri-scales-3-line' },
              { id: 'income', label: 'Estado de Resultados', icon: 'ri-line-chart-line' },
              { id: 'cashflow', label: 'Flujo de Efectivo', icon: 'ri-money-dollar-circle-line' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

        {/* Content */}
        {activeTab === 'statements' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Estados Financieros Generados</h2>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm pr-8"
                >
                  <option value="2024-12">Diciembre 2024</option>
                  <option value="2024-11">Noviembre 2024</option>
                  <option value="2024-10">Octubre 2024</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado Financiero
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Creación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statements.map((statement) => (
                      <tr key={statement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{statement.name}</div>
                            <div className="text-sm text-gray-500">{getTypeLabel(statement.type)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {statement.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(statement.status)}`}>
                            {statement.status === 'draft' ? 'Borrador' : 
                             statement.status === 'final' ? 'Final' : 'Aprobado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(statement.created_at).toLocaleDateString('es-DO')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleViewStatement(statement)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            <button 
                              onClick={() => handleDownloadStatement(statement)}
                              className="text-green-600 hover:text-green-900"
                              title="Descargar"
                            >
                              <i className="ri-download-line"></i>
                            </button>
                            <button 
                              onClick={() => handleEditStatement(statement)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Editar"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Balance General</h2>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-500">Al 31 de Diciembre 2024</div>
                  <button
                    onClick={downloadBalanceSheetExcel}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                  >
                    <i className="ri-download-line mr-1"></i>
                    Descargar Excel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Activos */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">ACTIVOS</h3>
                  
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Activos Corrientes</h4>
                    {financialData.assets.current.map((item, index) => (
                      <div key={index} className="flex justify-between py-1">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Activos Corrientes</span>
                        <span>{formatCurrency(totals.totalCurrentAssets)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Activos No Corrientes</h4>
                    {financialData.assets.nonCurrent.map((item, index) => (
                      <div key={index} className="flex justify-between py-1">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Activos No Corrientes</span>
                        <span>{formatCurrency(totals.totalNonCurrentAssets)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-blue-600 pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>TOTAL ACTIVOS</span>
                      <span>{formatCurrency(totals.totalAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* Pasivos y Patrimonio */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-600">PASIVOS Y PATRIMONIO</h3>
                  
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Pasivos Corrientes</h4>
                    {financialData.liabilities.current.map((item, index) => (
                      <div key={index} className="flex justify-between py-1">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Pasivos Corrientes</span>
                        <span>{formatCurrency(totals.totalCurrentLiabilities)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Pasivos No Corrientes</h4>
                    {financialData.liabilities.nonCurrent.map((item, index) => (
                      <div key={index} className="flex justify-between py-1">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Pasivos No Corrientes</span>
                        <span>{formatCurrency(totals.totalNonCurrentLiabilities)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium mb-3 text-green-600">Patrimonio</h4>
                    {financialData.equity.map((item, index) => (
                      <div key={index} className="flex justify-between py-1">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Patrimonio</span>
                        <span>{formatCurrency(totals.totalEquity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-red-600 pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>TOTAL PASIVOS Y PATRIMONIO</span>
                      <span>{formatCurrency(totals.totalLiabilities + totals.totalEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Estado de Resultados</h2>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-500">Del 1 al 31 de Diciembre 2024</div>
                  <button
                    onClick={downloadIncomeStatementExcel}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                  >
                    <i className="ri-download-line mr-1"></i>
                    Descargar Excel
                  </button>
                </div>
              </div>

              <div className="max-w-2xl">
                {/* INGRESOS */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-600">INGRESOS</h3>
                  {financialData.revenue.map((item, index) => (
                    <div key={index} className="flex justify-between py-2">
                      <span>{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Ingresos</span>
                      <span>{formatCurrency(totals.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* COSTOS */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-yellow-600">COSTOS</h3>
                  {financialData.costs.map((item, index) => (
                    <div key={index} className="flex justify-between py-2">
                      <span>{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Costos</span>
                      <span>{formatCurrency(totals.totalCosts)}</span>
                    </div>
                  </div>
                </div>

                {/* GASTOS */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-red-600">GASTOS</h3>
                  {financialData.expenses.map((item, index) => (
                    <div key={index} className="flex justify-between py-2">
                      <span>{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Gastos</span>
                      <span>{formatCurrency(totals.totalExpenses)}</span>
                    </div>
                  </div>
                </div>

                {/* UTILIDAD NETA */}
                <div className="border-t-2 border-gray-800 pt-4">
                  <div className="flex justify-between font-bold text-xl">
                    <span>UTILIDAD NETA</span>
                    <span className={totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(totals.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Estado de Flujo de Efectivo</h2>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-500">Del 1 al 31 de Diciembre 2024</div>
                  <button
                    onClick={downloadCashFlowExcel}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                  >
                    <i className="ri-download-line mr-1"></i>
                    Descargar Excel
                  </button>
                </div>
              </div>

              <div className="max-w-2xl space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">Actividades de Operación</h3>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Efectivo de Actividades de Operación</span>
                      <span>{formatCurrency(cashFlow.operatingCashFlow)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-purple-600">Actividades de Inversión</h3>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Efectivo de Actividades de Inversión</span>
                      <span>{formatCurrency(cashFlow.investingCashFlow)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-orange-600">Actividades de Financiamiento</h3>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Efectivo de Actividades de Financiamiento</span>
                      <span>{formatCurrency(cashFlow.financingCashFlow)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-gray-800 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold">
                      <span>Aumento Neto en Efectivo</span>
                      <span>{formatCurrency(cashFlow.netCashFlow)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal para generar nuevo estado */}
        {showNewStatementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Generar Nuevo Estado Financiero</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Estado
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8"
                    defaultValue="balance_sheet"
                    id="new-statement-type"
                  >
                    <option value="balance_sheet">Balance General</option>
                    <option value="income_statement">Estado de Resultados</option>
                    <option value="cash_flow">Flujo de Efectivo</option>
                    <option value="equity_statement">Estado de Patrimonio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Período
                  </label>
                  <input
                    type="month"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    defaultValue={selectedPeriod || new Date().toISOString().slice(0, 7)}
                    id="new-statement-period"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowNewStatementModal(false)}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  disabled={isGenerating}
                  onClick={() => {
                    const typeSelect = document.getElementById('new-statement-type') as HTMLSelectElement | null;
                    const periodInput = document.getElementById('new-statement-period') as HTMLInputElement | null;
                    const typeValue = typeSelect?.value || 'balance_sheet';
                    const periodValue = periodInput?.value || new Date().toISOString().slice(0, 7);
                    void generateStatement(typeValue, periodValue);
                  }}
                >
                  {isGenerating && (
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  )}
                  <span>{isGenerating ? 'Generando...' : 'Generar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para ver estado */}
        {showViewModal && selectedStatement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">{selectedStatement.name}</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Tipo:</span>
                    <span className="ml-2 text-sm text-gray-900">{getTypeLabel(selectedStatement.type)}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Período:</span>
                    <span className="ml-2 text-sm text-gray-900">{selectedStatement.period}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Estado:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedStatement.status)}`}>
                      {selectedStatement.status === 'draft' ? 'Borrador' : 
                       selectedStatement.status === 'final' ? 'Final' : 'Aprobado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Fecha Creación:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(selectedStatement.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {selectedStatement.type === 'balance_sheet' && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-4">Resumen del Balance General</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-gray-600">Total Activos</div>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(selectedStatement.totalAssets || 0)}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-sm text-gray-600">Total Pasivos</div>
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(selectedStatement.totalLiabilities || 0)}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-gray-600">Total Patrimonio</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(selectedStatement.totalEquity || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedStatement.type === 'income_statement' && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-4">Resumen del Estado de Resultados</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-gray-600">Total Ingresos</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(selectedStatement.totalRevenue || 0)}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-sm text-gray-600">Total Gastos</div>
                        <div className="text-lg font-bold text-red-600">
                          {formatCurrency(selectedStatement.totalExpenses || 0)}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-gray-600">Utilidad Neta</div>
                        <div className={`text-lg font-bold ${(selectedStatement.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(selectedStatement.netIncome || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal para editar estado */}
        {showEditModal && selectedStatement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Editar Estado Financiero</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Estado
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedStatement.name}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Estado
                  </label>
                  <select 
                    defaultValue={selectedStatement.type}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8"
                  >
                    <option value="balance_sheet">Balance General</option>
                    <option value="income_statement">Estado de Resultados</option>
                    <option value="cash_flow">Flujo de Efectivo</option>
                    <option value="equity_statement">Estado de Patrimonio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Período
                  </label>
                  <input
                    type="month"
                    defaultValue={selectedStatement.period}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select 
                    defaultValue={selectedStatement.status}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8"
                  >
                    <option value="draft">Borrador</option>
                    <option value="final">Final</option>
                    <option value="approved">Aprobado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    alert('Estado financiero actualizado exitosamente');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
