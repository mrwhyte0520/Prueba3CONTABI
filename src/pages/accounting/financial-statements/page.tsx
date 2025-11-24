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
  const [activeTab, setActiveTab] = useState<'statements' | 'balance' | 'income' | 'costs' | 'expenses' | 'cashflow'>('statements');
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

    // Debug: verificar qué usuario se está usando para los estados financieros
    // eslint-disable-next-line no-console
    console.log('FinancialStatementsPage user.id =', user.id);

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

    if (activeTab === 'balance' || activeTab === 'income' || activeTab === 'costs' || activeTab === 'expenses') {
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

  // Derivados para Estado de Resultados en formato profesional
  const grossProfit = totals.totalRevenue - totals.totalCosts;
  const operatingExpenses = totals.totalExpenses;
  const operatingIncome = grossProfit - operatingExpenses;
  const financialExpenses = 0;
  const incomeBeforeTaxReserves = operatingIncome - financialExpenses;
  const incomeTax = 0;
  const legalReserve = 0;

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

  const downloadBalanceSheetExcel = async () => {
    try {
      if (!user) return;

      // Obtener nombre de empresa desde el perfil
      let companyName: string | null = null;
      try {
        // settingsService incluye helpers generales, usamos getUserCompanyName
        // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require
        const { settingsService } = await import('../../../services/database');
        companyName = await settingsService.getUserCompanyName(user.id);
      } catch (err) {
        // Si falla, seguimos sin nombre de empresa
        // eslint-disable-next-line no-console
        console.error('No se pudo obtener el nombre de la empresa para el Balance:', err);
      }

      const today = new Date();
      const asOfDate = today.toLocaleDateString('es-DO', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });

      const rows: any[] = [];

      // Encabezado (solo texto en la primera columna)
      rows.push([companyName || '', '', '', null]);
      rows.push(['ESTADO DE SITUACION FINANCIERA', '', '', null]);
      rows.push([`AL ${asOfDate.toUpperCase()}`, '', '', null]);
      rows.push(['VALORES EN DOP', '', '', null]);
      rows.push(['', '', '', null]);

      // ACTIVOS
      rows.push(['ACTIVOS', '', '', null]);
      rows.push(['ACTIVOS CIRCULANTES', '', '', null]);
      financialData.assets.current.forEach((i) => {
        rows.push([`  ${i.name}`, '', '', i.amount]);
      });
      rows.push(['  Total Activos Corrientes', '', '', totals.totalCurrentAssets]);
      rows.push(['', '', '', null]);

      rows.push(['OTROS ACTIVOS', '', '', null]);
      financialData.assets.nonCurrent.forEach((i) => {
        rows.push([`  ${i.name}`, '', '', i.amount]);
      });
      rows.push(['  Total Otros Activos', '', '', totals.totalNonCurrentAssets]);
      rows.push(['', '', '', null]);

      rows.push(['TOTAL ACTIVOS', '', '', totals.totalAssets]);
      rows.push(['', '', '', null]);

      // PASIVOS Y PATRIMONIO
      rows.push(['PASIVO Y PATRIMONIO DE LOS SOCIOS', '', '', null]);
      rows.push(['PASIVOS CIRCULANTES', '', '', null]);
      financialData.liabilities.current.forEach((i) => {
        rows.push([`  ${i.name}`, '', '', i.amount]);
      });
      rows.push(['  Total Pasivos Corrientes', '', '', totals.totalCurrentLiabilities]);
      rows.push(['', '', '', null]);

      rows.push(['PASIVOS A LARGO PLAZO', '', '', null]);
      financialData.liabilities.nonCurrent.forEach((i) => {
        rows.push([`  ${i.name}`, '', '', i.amount]);
      });
      rows.push(['  Total Pasivos a Largo Plazo', '', '', totals.totalNonCurrentLiabilities]);
      rows.push(['', '', '', null]);

      rows.push(['TOTAL PASIVOS', '', '', totals.totalLiabilities]);
      rows.push(['', '', '', null]);

      rows.push(['PATRIMONIO', '', '', null]);
      financialData.equity.forEach((i) => {
        rows.push([`  ${i.name}`, '', '', i.amount]);
      });
      rows.push(['  Total Patrimonio', '', '', totals.totalEquity]);
      rows.push(['', '', '', null]);

      rows.push(['TOTAL PASIVOS Y PATRIMONIO', '', '', totals.totalLiabilities + totals.totalEquity]);

      exportToExcel({
        sheetName: 'Balance',
        fileName: `balance_general_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: '', width: 55 },
          { header: '', width: 10 },
          { header: '', width: 10 },
          { header: 'Monto', width: 18, numFmt: '#,##0.00' }
        ],
        rows
      });
    } catch (error) {
      // eslint-disable-next-line no-console
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
              { id: 'costs', label: 'Estado de Costos de Ventas', icon: 'ri-bill-line' },
              { id: 'expenses', label: 'Estado de Gastos G. y Adm.', icon: 'ri-bar-chart-2-line' },
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

        {activeTab === 'expenses' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header y título */}
              <div className="text-center mb-8">
                <h1 className="text-base font-semibold text-gray-800 mb-1">
                  RESUMEN DE LOS GASTOS DE PERSONAL, DE VENTAS Y ADMINISTRATIVOS
                </h1>
                <p className="text-sm text-gray-700 mb-0.5">Del 1ro. de Enero del 2024 al 31 de Diciembre del 2024</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              <div className="max-w-3xl mx-auto space-y-6">
                {/* Título del estado */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-1">
                    Estado de Gastos Generales y Adm.
                  </h2>
                </div>

                {/* Categorías de gastos */}
                <div className="space-y-1">
                  <div className="flex justify-between py-0.5 pl-4">
                    <span className="text-sm text-gray-700">Gastos de Personal</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 pl-4">
                    <span className="text-sm text-gray-700">Gastos Grales. Y Adm.</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 pl-4">
                    <span className="text-sm text-gray-700">Gastos de Activos Fijos</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 pl-4">
                    <span className="text-sm text-gray-700">Gastos Financieros</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                </div>

                {/* Total gastos del periodo */}
                <div className="border-t-2 border-gray-800 pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-base">Total gastos del Periodo</span>
                    <span className="text-base tabular-nums">{formatCurrency(totals.totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header y título */}
              <div className="text-center mb-8">
                <h1 className="text-base font-semibold text-gray-800 mb-1">NOTAS A LOS ESTADOS FINANCIEROS</h1>
                <p className="text-sm text-gray-700 mb-0.5">Del 1ro. de Enero del 2024 al 31 de Diciembre del 2024</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              <div className="max-w-3xl mx-auto space-y-6">
                {/* Título del estado */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-1">
                    Estado de costos de ventas
                  </h2>
                </div>

                {/* Inventario inicial */}
                <div className="space-y-1">
                  <div className="flex justify-between py-0.5 pl-4">
                    <span className="text-sm text-gray-700">Inventario Inicial</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                </div>

                {/* Compras del periodo */}
                <div className="space-y-1 pt-2">
                  <div className="text-sm font-semibold text-gray-800 pl-2">Más:</div>
                  <div className="flex justify-between py-0.5 pl-6">
                    <span className="text-sm text-gray-700">Compras Proveedores Locales</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 pl-6">
                    <span className="text-sm text-gray-700">Importaciones</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-6">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total Compras del Periodo</span>
                      <span className="text-sm tabular-nums">{formatCurrency(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Costos indirectos */}
                <div className="space-y-1 pt-4">
                  <div className="text-sm font-semibold text-gray-800 pl-2">Más:</div>
                  <div className="flex justify-between py-0.5 pl-6">
                    <span className="text-sm text-gray-700">Costos Indirectos</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                </div>

                {/* Mercancía disponible para la venta */}
                <div className="border-t border-gray-800 pt-2 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-sm">Mercancía Disponible para la venta</span>
                    <span className="text-sm tabular-nums">{formatCurrency(0)}</span>
                  </div>
                </div>

                {/* Inventario final */}
                <div className="space-y-1 pt-4">
                  <div className="text-sm font-semibold text-gray-800 pl-2">Menos:</div>
                  <div className="flex justify-between py-0.5 pl-6">
                    <span className="text-sm text-gray-700">Inventario Final</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                  </div>
                </div>

                {/* Costo de Venta del Periodo */}
                <div className="border-t-2 border-gray-800 pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-base">Costo de Venta del Periodo</span>
                    <span className="text-base tabular-nums">{formatCurrency(totals.totalCosts)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header con botón de descarga */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={downloadBalanceSheetExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Descargar Excel
                </button>
              </div>

              {/* Título centrado estilo profesional */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">ESTADO DE SITUACIÓN FINANCIERA</h1>
                <p className="text-sm text-gray-700 mb-0.5">A LA FECHA ACTUAL</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              <div className="max-w-4xl mx-auto space-y-6">
                {/* ACTIVOS */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">ACTIVOS</h2>
                  
                  {/* ACTIVOS CIRCULANTES */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">ACTIVOS CIRCULANTES</h3>
                    {financialData.assets.current.map((item, index) => (
                      <div key={index} className="flex justify-between py-0.5 pl-4">
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Activos Corrientes</span>
                        <span className="text-sm tabular-nums">{formatCurrency(totals.totalCurrentAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* OTROS ACTIVOS */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">OTROS ACTIVOS</h3>
                    {financialData.assets.nonCurrent.map((item, index) => (
                      <div key={index} className="flex justify-between py-0.5 pl-4">
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Otros Activos</span>
                        <span className="text-sm tabular-nums">{formatCurrency(totals.totalNonCurrentAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* TOTAL ACTIVOS */}
                  <div className="border-t-2 border-gray-800 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-base">TOTAL ACTIVOS</span>
                      <span className="text-base tabular-nums">{formatCurrency(totals.totalAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* PASIVO Y PATRIMONIO */}
                <div className="pt-4">
                  <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">PASIVO Y PATRIMONIO DE LOS SOCIOS</h2>
                  
                  {/* PASIVOS CIRCULANTES */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">PASIVOS CIRCULANTES</h3>
                    {financialData.liabilities.current.map((item, index) => (
                      <div key={index} className="flex justify-between py-0.5 pl-4">
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Pasivos Corrientes</span>
                        <span className="text-sm tabular-nums">{formatCurrency(totals.totalCurrentLiabilities)}</span>
                      </div>
                    </div>
                  </div>

                  {/* PASIVOS A LARGO PLAZO */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">PASIVOS A LARGO PLAZO</h3>
                    {financialData.liabilities.nonCurrent.map((item, index) => (
                      <div key={index} className="flex justify-between py-0.5 pl-4">
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    {financialData.liabilities.nonCurrent.length > 0 && (
                      <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                        <div className="flex justify-between font-semibold">
                          <span className="text-sm">Total Pasivos a Largo Plazo</span>
                          <span className="text-sm tabular-nums">{formatCurrency(totals.totalNonCurrentLiabilities)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TOTAL PASIVOS */}
                  <div className="border-t border-gray-400 pt-2 mb-4">
                    <div className="flex justify-between font-bold">
                      <span className="text-sm">TOTAL PASIVOS</span>
                      <span className="text-sm tabular-nums">{formatCurrency(totals.totalLiabilities)}</span>
                    </div>
                  </div>

                  {/* PATRIMONIO */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">PATRIMONIO</h3>
                    {financialData.equity.map((item, index) => (
                      <div key={index} className="flex justify-between py-0.5 pl-4">
                        <span className="text-sm text-gray-700">{item.name}</span>
                        <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Patrimonio</span>
                        <span className="text-sm tabular-nums">{formatCurrency(totals.totalEquity)}</span>
                      </div>
                    </div>
                  </div>

                  {/* TOTAL PASIVOS Y PATRIMONIO */}
                  <div className="border-t-2 border-gray-800 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-base">TOTAL PASIVOS Y PATRIMONIO</span>
                      <span className="text-base tabular-nums">{formatCurrency(totals.totalLiabilities + totals.totalEquity)}</span>
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
              {/* Header con botón de descarga */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={downloadIncomeStatementExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Descargar Excel
                </button>
              </div>

              {/* Título centrado estilo profesional */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">ESTADO DE RESULTADOS</h1>
                <p className="text-sm text-gray-700 mb-0.5">DEL 1 DE ENERO DE 2024 AL 31 DE DICIEMBRE DE 2024</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              <div className="max-w-3xl mx-auto space-y-6">
                {/* INGRESOS */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">INGRESOS</h2>
                  {financialData.revenue.map((item, index) => (
                    <div key={index} className="flex justify-between py-0.5 pl-4">
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total Ingresos</span>
                      <span className="text-sm tabular-nums">{formatCurrency(totals.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* COSTO DE VENTAS Y BENEFICIO BRUTO */}
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 underline">COSTO DE VENTAS</h2>
                  {financialData.costs.map((item, index) => (
                    <div key={index} className="flex justify-between py-0.5 pl-4">
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Costo de Ventas</span>
                      <span className="text-sm tabular-nums">{formatCurrency(totals.totalCosts)}</span>
                    </div>
                  </div>

                  {/* Beneficio Bruto */}
                  <div className="border-t-2 border-gray-800 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-base">Beneficio Bruto</span>
                      <span className="text-base tabular-nums">{formatCurrency(grossProfit)}</span>
                    </div>
                  </div>
                </div>

                {/* GASTOS DE OPERACIONES */}
                <div className="pt-4">
                  <h2 className="text-sm font-bold text-gray-900 mb-2 underline">GASTOS DE OPERACIONES</h2>
                  {financialData.expenses.map((item, index) => (
                    <div key={index} className="flex justify-between py-0.5 pl-4">
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total Gastos de Operaciones</span>
                      <span className="text-sm tabular-nums">{formatCurrency(operatingExpenses)}</span>
                    </div>
                  </div>

                  {/* Beneficios netos operacionales */}
                  <div className="border-t border-gray-400 pt-2 mb-4">
                    <div className="flex justify-between font-bold">
                      <span className="text-sm">Beneficios netos operacionales</span>
                      <span className="text-sm tabular-nums">{formatCurrency(operatingIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* GASTOS FINANCIEROS Y RESULTADO ANTES DE ISR Y RESERVAS */}
                <div>
                  <div className="mb-2">
                    <div className="flex justify-between py-0.5 pl-4">
                      <span className="text-sm text-gray-700">Gastos financieros</span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(financialExpenses)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-sm">Beneficios (pérdida) antes de ISR y Reservas</span>
                      <span className="text-sm tabular-nums">{formatCurrency(incomeBeforeTaxReserves)}</span>
                    </div>
                  </div>
                </div>

                {/* IMPUESTOS, RESERVA Y UTILIDAD NETA */}
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between py-0.5 pl-4">
                    <span className="text-sm text-gray-700">Impuestos Sobre la Renta</span>
                    <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(incomeTax)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 pl-4">
                    <span className="text-sm text-gray-700">Reserva Legal</span>
                    <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(legalReserve)}</span>
                  </div>

                  <div className="border-t-2 border-gray-800 pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-base">UTILIDAD NETA</span>
                      <span
                        className={`text-base tabular-nums ${
                          totals.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(totals.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header con botón de descarga */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={downloadCashFlowExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Descargar Excel
                </button>
              </div>

              {/* Título centrado estilo profesional */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">ESTADO DE FLUJOS DE EFECTIVO</h1>
                <p className="text-sm text-gray-700 mb-0.5">DEL 1 DE ENERO DE 2024 AL 31 DE DICIEMBRE DE 2024</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              {(() => {
                const openingCash = 0;
                const netChange = cashFlow.netCashFlow;
                const endingCash = openingCash + netChange;

                return (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* FLUJOS DE EFECTIVO DE LAS ACTIVIDADES OPERATIVAS */}
                    <div>
                      <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">
                        FLUJOS DE EFECTIVO DE LAS ACTIVIDADES OPERATIVAS
                      </h2>

                      {/* Beneficio neto */}
                      <div className="flex justify-between py-0.5 pl-4">
                        <span className="text-sm text-gray-700">Beneficio (Pérdida) Neto</span>
                        <span className="text-sm text-gray-900 font-medium tabular-nums">
                          {formatCurrency(totals.netIncome)}
                        </span>
                      </div>

                      {/* Ajustes para conciliar - placeholders */}
                      <div className="mt-4 pl-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                          Ajustes para conciliar la (pérdida) beneficio neto con el efectivo neto
                          provisto por actividades operativas:
                        </h3>
                        <div className="space-y-1">
                          <div className="flex justify-between py-0.5">
                            <span className="text-sm text-gray-700">Depreciación y Amortización</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span className="text-sm text-gray-700">Incremento/Disminución en cuentas por cobrar</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span className="text-sm text-gray-700">Incremento/Disminución en inventario</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span className="text-sm text-gray-700">Disminución/Incremento en otras cuentas</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total ajustes - placeholder 0 */}
                      <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                        <div className="flex justify-between font-semibold">
                          <span className="text-sm">Total ajustes</span>
                          <span className="text-sm tabular-nums">{formatCurrency(0)}</span>
                        </div>
                      </div>

                      {/* Efectivo neto provisto por actividades operativas */}
                      <div className="border-t-2 border-gray-800 pt-2 mt-3">
                        <div className="flex justify-between font-bold">
                          <span className="text-base">Efectivo neto (usado) provisto por actividades operativas</span>
                          <span className="text-base tabular-nums">
                            {formatCurrency(cashFlow.operatingCashFlow)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* FLUJO DE EFECTIVO DE LAS ACTIVIDADES DE INVERSIÓN */}
                    <div className="pt-4">
                      <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">
                        FLUJO DE EFECTIVO DE LAS ACTIVIDADES DE INVERSIÓN
                      </h2>

                      {/* Detalles de inversión (placeholders) */}
                      <div className="pl-4 space-y-1">
                        <div className="flex justify-between py-0.5">
                          <span className="text-sm text-gray-700">Adquisición de Terrenos</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-sm text-gray-700">Adquisición de Planta y Edificaciones</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-sm text-gray-700">Adquisición de Maquinarias y Equipos</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                        <div className="flex justify-between font-semibold">
                          <span className="text-sm">Efectivo neto (usado) por actividades de Inversión</span>
                          <span className="text-sm tabular-nums">{formatCurrency(cashFlow.investingCashFlow)}</span>
                        </div>
                      </div>
                    </div>

                    {/* FLUJOS DE EFECTIVO DE LAS ACTIVIDADES FINANCIERAS */}
                    <div className="pt-4">
                      <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">
                        FLUJOS DE EFECTIVO DE LAS ACTIVIDADES FINANCIERAS
                      </h2>

                      {/* Detalles financieros (placeholders) */}
                      <div className="pl-4 space-y-1">
                        <div className="flex justify-between py-0.5">
                          <span className="text-sm text-gray-700">Disminución/Incremento en Doc. por Pagar</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-sm text-gray-700">Incremento en otras cuentas de Capital</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                        <div className="flex justify-between font-semibold">
                          <span className="text-sm">Efectivo neto usado por actividades de Financiamiento</span>
                          <span className="text-sm tabular-nums">{formatCurrency(cashFlow.financingCashFlow)}</span>
                        </div>
                      </div>
                    </div>

                    {/* AUMENTO (DISMINUCIÓN) NETA DEL EFECTIVO Y EFECTIVO FINAL */}
                    <div className="pt-4">
                      <div className="border-t border-gray-400 pt-2 mb-4">
                        <div className="flex justify-between font-bold">
                          <span className="text-sm">Aumento (Disminución) neta del efectivo</span>
                          <span className="text-sm tabular-nums">{formatCurrency(netChange)}</span>
                        </div>
                      </div>

                      <div className="space-y-1 pl-4">
                        <div className="flex justify-between py-0.5">
                          <span className="text-sm text-gray-700">Efectivo neto al principio del año</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(openingCash)}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-sm text-gray-700 font-semibold">EFECTIVO NETO al final del año</span>
                          <span className="text-sm text-gray-900 font-semibold tabular-nums">{formatCurrency(endingCash)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
