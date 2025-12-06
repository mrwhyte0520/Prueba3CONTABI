import { useState, useEffect } from 'react';
import { exportToExcel } from '../../../lib/excel';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { financialReportsService, chartAccountsService, financialStatementsService } from '../../../services/database';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Estilos CSS para impresión
const printStyles = `
  @media print {
    @page { 
      size: portrait; 
      /* Márgenes amplios en todo el contorno para que el contenido no quede pegado al borde */
      margin: 1.5cm 1.8cm;
    }
    body * { visibility: hidden; }
    #printable-statement, #printable-statement * { visibility: visible; }
    #printable-statement { position: absolute; left: 0; top: 0; width: 100%; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    table { page-break-inside: avoid; font-size: 10pt; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .print-hidden { display: none !important; }
    .hide-zero-on-print { display: none !important; }
  }
`;

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
    current: { code: string; name: string; amount: number }[];
    nonCurrent: { code: string; name: string; amount: number }[];
  };
  liabilities: {
    current: { code: string; name: string; amount: number }[];
    nonCurrent: { code: string; name: string; amount: number }[];
  };
  equity: { code: string; name: string; amount: number }[];
  revenue: { code: string; name: string; amount: number }[];
  costs: { code: string; name: string; amount: number }[];
  expenses: { code: string; name: string; amount: number }[];
}

export default function FinancialStatementsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'statements' | 'balance' | 'income' | 'costs' | 'expenses' | 'cashflow'>('statements');
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewStatementModal, setShowNewStatementModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<FinancialStatement | null>(null);
  const [showExpensesDetail, setShowExpensesDetail] = useState(false);

  const [periodOptions] = useState(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = d.toISOString().slice(0, 7); // YYYY-MM
      const labelRaw = d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
      const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
      options.push({ value, label });
    }
    return options;
  });

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
    openingCash: number;
    closingCash: number;
  }>({
    operatingCashFlow: 0,
    investingCashFlow: 0,
    financingCashFlow: 0,
    netCashFlow: 0,
    openingCash: 0,
    closingCash: 0,
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
        const isBalanceTab = activeTab === 'balance';
        const tbFromDate = isBalanceTab ? '1900-01-01' : fromDate;
        const trialBalance = await financialReportsService.getTrialBalance(user.id, tbFromDate, toDate);

        const nextData: FinancialData = {
          assets: { current: [], nonCurrent: [] },
          liabilities: { current: [], nonCurrent: [] },
          equity: [],
          revenue: [],
          costs: [],
          expenses: []
        };

        // Función helper para identificar cuentas de efecto contrario
        const isContraAccount = (code: string, name: string, type: string): boolean => {
          const nameLower = name.toLowerCase();
          
          // Depreciación acumulada (activo - efecto contrario)
          // SOLO si el nombre contiene palabras clave específicas
          if (type === 'asset' || type === 'activo') {
            if (nameLower.includes('depreci') || 
                nameLower.includes('amortiz') || 
                nameLower.includes('acumulad')) {
              return true;
            }
          }
          
          // Devoluciones y descuentos sobre ventas (ingreso - efecto contrario)
          // SOLO si el nombre contiene palabras clave específicas
          if (type === 'income' || type === 'ingreso') {
            if (nameLower.includes('devoluc') || 
                nameLower.includes('descuent') ||
                nameLower.includes('rebaj')) {
              return true;
            }
          }
          
          // Pérdida en diferencia cambiaria (gasto con efecto contrario en algunos casos)
          // Estas ya son gastos, no necesitan inversión
          
          return false;
        };

        (trialBalance || []).forEach((acc: any) => {
          let balance = Number(acc.balance) || 0;
          if (Math.abs(balance) < 0.005) return; // omitir saldos cero

          const code = String(acc.code || '');
          const baseName = String(acc.name || '');
          const label = `${code} - ${baseName}`;

          // Normalizar código (remover puntos para comparación)
          const normalizedCode = code.replace(/\./g, '');
          
          switch (acc.type) {
            case 'asset':
            case 'activo': {
              const item = { code, name: label, amount: balance };
              // Activos corrientes: 10,11,12,13 (ej: 1.1.02 → 1102 → empieza con 11)
              if (normalizedCode.startsWith('10') || normalizedCode.startsWith('11') || 
                  normalizedCode.startsWith('12') || normalizedCode.startsWith('13')) {
                nextData.assets.current.push(item);
              } else {
                nextData.assets.nonCurrent.push(item);
              }
              break;
            }
            case 'liability':
            case 'pasivo': {
              const item = { code, name: label, amount: balance };
              // Pasivos corrientes: 20,21 (ej: 2.1.01 → 2101 → empieza con 21)
              if (normalizedCode.startsWith('20') || normalizedCode.startsWith('21')) {
                nextData.liabilities.current.push(item);
              } else {
                nextData.liabilities.nonCurrent.push(item);
              }
              break;
            }
            case 'equity':
            case 'patrimonio':
              nextData.equity.push({ code, name: label, amount: balance });
              break;
            case 'income':
            case 'ingreso':
              nextData.revenue.push({ code, name: label, amount: balance });
              break;
            case 'cost':
            case 'costo':
            case 'costos':
              nextData.costs.push({ code, name: label, amount: Math.abs(balance) });
              break;
            case 'expense':
            case 'gasto':
              nextData.expenses.push({ code, name: label, amount: Math.abs(balance) });
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

        const fromDateObj = new Date(fromDate);
        const prevToObj = new Date(fromDateObj.getTime() - 24 * 60 * 60 * 1000);
        const prevToDate =
          prevToObj.getFullYear() <= 1900
            ? null
            : prevToObj.toISOString().slice(0, 10);

        const [prevTrial, finalTrial] = await Promise.all([
          prevToDate
            ? financialReportsService.getTrialBalance(user.id, '1900-01-01', prevToDate)
            : Promise.resolve([]),
          financialReportsService.getTrialBalance(user.id, '1900-01-01', toDate),
        ]);

        const sumCash = (trial: any[]) => {
          return (trial || []).reduce((sum, acc: any) => {
            const code = String(acc.code || '');
            const normalizedCode = code.replace(/\./g, '');
            const type = String(acc.type || '');
            if (!(type === 'asset' || type === 'activo')) return sum;
            // Incluir múltiples formatos de códigos para Caja y Bancos
            if (!normalizedCode.startsWith('10') && !normalizedCode.startsWith('110') && 
                !normalizedCode.startsWith('111') && !normalizedCode.startsWith('1102')) {
              return sum;
            }
            const balance = Number(acc.balance) || 0;
            return sum + balance;
          }, 0);
        };

        const openingCash = prevTrial ? sumCash(prevTrial as any[]) : 0;
        const closingCash = sumCash(finalTrial as any[]);

        setCashFlow({
          operatingCashFlow: result.operatingCashFlow || 0,
          investingCashFlow: result.investingCashFlow || 0,
          financingCashFlow: result.financingCashFlow || 0,
          netCashFlow: result.netCashFlow || 0,
          openingCash,
          closingCash,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading cash flow statement:', error);
        setCashFlow({
          operatingCashFlow: 0,
          investingCashFlow: 0,
          financingCashFlow: 0,
          netCashFlow: 0,
          openingCash: 0,
          closingCash: 0,
        });
      }
    };

    if (activeTab === 'balance' || activeTab === 'income' || activeTab === 'costs' || activeTab === 'expenses') {
      void loadFinancialData();
    } else if (activeTab === 'cashflow') {
      void loadCashFlow();
    }
  }, [user, selectedPeriod, activeTab]);

  useEffect(() => {
    const loadCostOfSales = async () => {
      try {
        if (!user) return;

        const period = selectedPeriod || new Date().toISOString().slice(0, 7); // YYYY-MM
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (!year || !month) return;

        const fromDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const toDate = new Date(year, month, 0).toISOString().slice(0, 10);

        const fromDateObj = new Date(fromDate);
        const prevToObj = new Date(fromDateObj.getTime() - 24 * 60 * 60 * 1000);
        const prevToDate =
          prevToObj.getFullYear() <= 1900
            ? null
            : prevToObj.toISOString().slice(0, 10);

        const [prevTrial, finalTrial, periodTrial] = await Promise.all([
          prevToDate
            ? financialReportsService.getTrialBalance(user.id, '1900-01-01', prevToDate)
            : Promise.resolve([]),
          // Para inventario final necesitamos todo el historial hasta la fecha de corte
          financialReportsService.getTrialBalance(user.id, '1900-01-01', toDate),
          // Para compras del período solo necesitamos el rango del período actual
          financialReportsService.getTrialBalance(user.id, fromDate, toDate),
        ]);

        const sumInventory = (trial: any[]) => {
          return (trial || []).reduce((sum, acc: any) => {
            const code = String(acc.code || '');
            const type = String(acc.type || '');
            if (!(type === 'asset' || type === 'activo')) return sum;
            if (!code.startsWith('12')) return sum; // Inventarios
            const balance = Number(acc.balance) || 0;
            return sum + balance;
          }, 0);
        };

        const openingInventory = prevTrial ? sumInventory(prevTrial as any[]) : 0;
        const closingInventory = sumInventory(finalTrial as any[]);

        const totalCosts = totals.totalCosts; // costo de ventas del período desde cuentas de costo

        // Fórmula: Costo de ventas = InvInicial + ComprasTotales - InvFinal
        // => ComprasTotales = Costo + InvFinal - InvInicial
        const totalPurchasesFromFormula = totalCosts + closingInventory - openingInventory;

        // Si el usuario define cuentas específicas para compras locales e importaciones,
        // las usamos para repartir las compras respetando la fórmula anterior.
        const sumCostByPrefixes = (trial: any[], prefixes: string[]) => {
          return (trial || []).reduce((sum, acc: any) => {
            const code = String(acc.code || '');
            const type = String(acc.type || '');
            if (!(type === 'cost' || type === 'costo' || type === 'costos')) return sum;
            if (!prefixes.some((p) => code.startsWith(p))) return sum;
            const balance = Number(acc.balance) || 0;
            return sum + Math.abs(balance);
          }, 0);
        };

        const rawLocal = sumCostByPrefixes(periodTrial as any[], ['500101']);
        const rawImports = sumCostByPrefixes(periodTrial as any[], ['500102']);
        const rawTotal = rawLocal + rawImports;

        let purchasesLocal = 0;
        let purchasesImports = 0;
        let totalPurchases = totalPurchasesFromFormula;

        if (rawTotal > 0 && totalPurchasesFromFormula !== 0) {
          const factor = totalPurchasesFromFormula / rawTotal;
          purchasesLocal = rawLocal * factor;
          purchasesImports = rawImports * factor;
          totalPurchases = purchasesLocal + purchasesImports;
        } else {
          // Si aún no se usan 500101/500102, consideramos todas las compras como locales
          purchasesLocal = totalPurchasesFromFormula;
          purchasesImports = 0;
          totalPurchases = totalPurchasesFromFormula;
        }

        const indirectCosts = 0; // Placeholder para futuros desarrollos
        const availableForSale = openingInventory + totalPurchases + indirectCosts;

        setCostOfSalesData({
          openingInventory,
          purchasesLocal,
          purchasesImports,
          totalPurchases,
          indirectCosts,
          availableForSale,
          closingInventory,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading cost of sales data:', error);
        setCostOfSalesData({
          openingInventory: 0,
          purchasesLocal: 0,
          purchasesImports: 0,
          totalPurchases: 0,
          indirectCosts: 0,
          availableForSale: 0,
          closingInventory: 0,
        });
      }
    };

    // Solo tiene sentido recalcular cuando cambian usuario, período o los costos asociados
    if (activeTab === 'costs' && user) {
      void loadCostOfSales();
    }
  }, [user, selectedPeriod, activeTab, financialData.costs]);

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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrencyRD = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
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

    // Tratar las cuentas 5xxx como costo de ventas aunque estén clasificadas como gastos
    const normalizeCode = (code: string | undefined) => (code || '').replace(/\./g, '');
    const allExpenses = financialData.expenses || [];
    const extraCostItems = allExpenses.filter((item) => normalizeCode(item.code).startsWith('5'));
    const extraCostsTotal = extraCostItems.reduce((sum, item) => sum + item.amount, 0);
    const expensesWithoutCosts = allExpenses.filter((item) => !normalizeCode(item.code).startsWith('5'));

    const totalCosts =
      financialData.costs.reduce((sum, item) => sum + item.amount, 0) + extraCostsTotal;
    const totalExpenses = expensesWithoutCosts.reduce((sum, item) => sum + item.amount, 0);

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
      netIncome,
    };
  };

  const totals = calculateTotals();

  // Total Pasivos y Patrimonio incluyendo el resultado del período (utilidad o pérdida),
  // de forma que se cumpla la ecuación: Activos = Pasivos + Patrimonio + Resultado.
  const totalLiabilitiesAndEquity = totals.totalLiabilities + totals.totalEquity + totals.netIncome;

  // Función para obtener las fechas formateadas del período
  const getPeriodDates = () => {
    const period = selectedPeriod || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-DO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    return {
      startDateFormatted: formatDate(startDate),
      endDateFormatted: formatDate(endDate),
      periodLabel: `Del ${formatDate(startDate)} al ${formatDate(endDate)}`,
      asOfDateLabel: `Al ${formatDate(endDate)}`
    };
  };

  const periodDates = getPeriodDates();

  // Derivados para Estado de Resultados en formato profesional
  const grossProfit = totals.totalRevenue - totals.totalCosts;

  // Ítems de costo para el Estado de Resultados (incluye cuentas 5xxx aunque estén como gastos)
  const costItemsForIncome = [
    ...financialData.costs,
    ...financialData.expenses.filter((item) => {
      const code = item.code || '';
      const normalized = code.replace(/\./g, '');
      return normalized.startsWith('5');
    }),
  ];

  // Helpers para agrupar por prefijos de código
  const sumByPrefixes = (
    items: { code: string; name: string; amount: number }[],
    prefixes: string[],
  ) => {
    return items.reduce((sum, item) => {
      const code = item.code || '';
      const normalizedCode = code.replace(/\./g, ''); // Normalizar código (quitar puntos)
      return prefixes.some((p) => normalizedCode.startsWith(p)) ? sum + item.amount : sum;
    }, 0);
  };

  // ACTIVO: grupos principales
  const currentAssets = financialData.assets.current;
  const nonCurrentAssets = financialData.assets.nonCurrent;
  const currentLiabilities = financialData.liabilities.current;
  const nonCurrentLiabilities = financialData.liabilities.nonCurrent;
  const equityItems = financialData.equity;

  const efectivoCajaBancos = sumByPrefixes(currentAssets, ['10', '1001', '1002', '110', '111', '1102']); // Caja y Bancos (múltiples formatos)
  const cxcClientes = sumByPrefixes(currentAssets, ['1101']); // CxC Clientes
  const otrasCxc = sumByPrefixes(currentAssets, ['1103', '1104', '1105', '1199']); // Otras CxC (excluye 1102 que es Bancos)
  const inventarios = sumByPrefixes(currentAssets, ['12']); // Inventarios
  const anticiposISR = sumByPrefixes(currentAssets, ['1301']); // Anticipos ISR
  const gastosPagadosAnticipado = sumByPrefixes(currentAssets, ['13']) - anticiposISR; // Gastos anticipados

  const activosFijos = sumByPrefixes(nonCurrentAssets, ['15']);
  const invAcciones = sumByPrefixes(nonCurrentAssets, ['1401']);
  const invCertificados = sumByPrefixes(nonCurrentAssets, ['1402']);
  const fianzasDepositos = sumByPrefixes(nonCurrentAssets, ['1601']);
  const licenciasSoftware = sumByPrefixes(nonCurrentAssets, ['1602']);
  const otrosActivos = sumByPrefixes(nonCurrentAssets, ['1699']);

  // PASIVOS Y PATRIMONIO
  const cppProveedores = sumByPrefixes(currentLiabilities, ['200', '2001']); // Cuentas por Pagar Proveedores
  const prestamosCortoPlazo = sumByPrefixes(currentLiabilities, ['201', '2002']); // Préstamos Corto Plazo
  const otrasCxPCorrientes = sumByPrefixes(currentLiabilities, ['202', '203', '204', '2003', '2004', '2099']); // Otras CxP
  const acumulacionesPorPagar = sumByPrefixes(currentLiabilities, ['21']); // Acumulaciones
  const pasivosCorrientes = cppProveedores + prestamosCortoPlazo + otrasCxPCorrientes + acumulacionesPorPagar;

  const pasivosLargoPlazo = sumByPrefixes(nonCurrentLiabilities, ['22']);

  const capitalSuscrito = sumByPrefixes(equityItems, ['30', '31']); // Capital y Aportes
  const reservas = sumByPrefixes(equityItems, ['32']); // Reservas
  const resultadosAcumulados = sumByPrefixes(equityItems, ['33', '34', '35']); // Resultados y Utilidades
  const patrimonioTotal = capitalSuscrito + reservas + resultadosAcumulados;
  const beneficiosPeriodoActual = totals.netIncome;
  const patrimonioConResultado = patrimonioTotal + beneficiosPeriodoActual;

  // GASTOS por grupo en Estado de Resultados
  const expenseItems = financialData.expenses;
  const gastosPersonal = sumByPrefixes(expenseItems, ['6001']);
  const gastosGeneralesAdm = sumByPrefixes(expenseItems, ['6002']);
  const gastosMantenimientoAF = sumByPrefixes(expenseItems, ['6003']);
  const gastosDepreciacion = sumByPrefixes(expenseItems, ['6004']);
  const gastosImpuestosNoDeducibles = sumByPrefixes(expenseItems, ['6005', '6102']);
  const gastosFinancieros = sumByPrefixes(expenseItems, ['6101']);

  const filterExpensesByPrefixes = (
    items: { code: string; name: string; amount: number }[],
    prefixes: string[],
  ) => {
    return items.filter((item) => {
      const code = item.code || '';
      const normalizedCode = code.replace(/\./g, ''); // Normalizar código (quitar puntos)
      return prefixes.some((p) => normalizedCode.startsWith(p));
    });
  };

  const expenseItemsPersonal = filterExpensesByPrefixes(expenseItems, ['6001']);
  const expenseItemsGeneralesAdm = filterExpensesByPrefixes(expenseItems, ['6002']);
  const expenseItemsMantenimientoAF = filterExpensesByPrefixes(expenseItems, ['6003']);
  const expenseItemsDepreciacion = filterExpensesByPrefixes(expenseItems, ['6004']);
  const expenseItemsImpuestosNoDeducibles = filterExpensesByPrefixes(expenseItems, ['6005', '6102']);
  const expenseItemsFinancieros = filterExpensesByPrefixes(expenseItems, ['6101']);

  const operatingExpenses =
    gastosPersonal +
    gastosGeneralesAdm +
    gastosMantenimientoAF +
    gastosDepreciacion +
    gastosImpuestosNoDeducibles;

  const financialExpenses = gastosFinancieros;
  const operatingIncome = grossProfit - operatingExpenses - financialExpenses;
  const incomeBeforeTaxReserves = operatingIncome;
  const incomeTax = 0;
  const legalReserve = 0;

  // Helper para renderizar líneas - oculta en PDF si saldo es 0, pero muestra en pantalla
  const renderBalanceLineIfNotZero = (label: string, amount: number) => {
    const isZero = Math.abs(amount) < 0.01;
    return (
      <div className={`flex justify-between py-0.5 pl-4 ${isZero ? 'hide-zero-on-print' : ''}`}>
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(amount)}</span>
      </div>
    );
  };

  // Helper para agregar filas a Excel solo si tienen saldo diferente de 0
  const addRowIfNotZero = (rows: any[], label: string, amount: number, indent: string = '  ') => {
    if (Math.abs(amount) >= 0.01) {
      rows.push([indent + label, '', '', amount]);
    }
  };

  // =========================
  // Estado de Costos de Ventas
  // =========================

  const [costOfSalesData, setCostOfSalesData] = useState({
    openingInventory: 0,
    purchasesLocal: 0,
    purchasesImports: 0,
    totalPurchases: 0,
    indirectCosts: 0,
    availableForSale: 0,
    closingInventory: 0,
  });

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

      const rows: any[] = [];

      // Encabezado (solo texto en la primera columna)
      rows.push([companyName || '', '', '', null]);
      rows.push(['ESTADO DE SITUACION FINANCIERA', '', '', null]);
      rows.push([periodDates.asOfDateLabel.toUpperCase(), '', '', null]);
      rows.push(['VALORES EN DOP', '', '', null]);
      rows.push(['', '', '', null]);

      // ACTIVOS
      rows.push(['ACTIVOS', '', '', null]);
      rows.push(['ACTIVOS CORRIENTES', '', '', null]);
      addRowIfNotZero(rows, 'Efectivo en Caja y Bancos', efectivoCajaBancos);
      addRowIfNotZero(rows, 'Cuentas por Cobrar Clientes', cxcClientes);
      addRowIfNotZero(rows, 'Otras Cuentas por Cobrar', otrasCxc);
      addRowIfNotZero(rows, 'Inventarios', inventarios);
      addRowIfNotZero(rows, 'Gastos Pagados por Anticipado', gastosPagadosAnticipado);
      addRowIfNotZero(rows, 'Anticipos sobre la Renta Pagados', anticiposISR);
      rows.push(['  Total Activos Corrientes', '', '', totals.totalCurrentAssets]);
      rows.push(['', '', '', null]);

      // ACTIVOS FIJOS - solo agregar si tiene saldo
      if (Math.abs(activosFijos) >= 0.01) {
        rows.push(['ACTIVOS FIJOS', '', '', null]);
        addRowIfNotZero(rows, 'Activos Fijos', activosFijos);
        rows.push(['', '', '', null]);
      }

      // OTROS ACTIVOS - solo agregar si tiene saldo
      if (Math.abs(totals.totalNonCurrentAssets) >= 0.01) {
        rows.push(['OTROS ACTIVOS', '', '', null]);
        addRowIfNotZero(rows, 'Inversiones en Otras Compañías', invAcciones);
        addRowIfNotZero(rows, 'Certificados Bancarios y Títulos Financieros', invCertificados);
        addRowIfNotZero(rows, 'Fianzas y Depósitos', fianzasDepositos);
        addRowIfNotZero(rows, 'Licencias y Softwares', licenciasSoftware);
        addRowIfNotZero(rows, 'Otros Activos', otrosActivos);
        rows.push(['  Total Otros Activos', '', '', totals.totalNonCurrentAssets]);
        rows.push(['', '', '', null]);
      }

      rows.push(['TOTAL ACTIVOS', '', '', totals.totalAssets]);
      rows.push(['', '', '', null]);

      // PASIVOS Y PATRIMONIO
      rows.push(['PASIVO Y PATRIMONIO DE LOS SOCIOS', '', '', null]);
      // PASIVOS CIRCULANTES - solo agregar si tiene saldo
      if (Math.abs(pasivosCorrientes) >= 0.01) {
        rows.push(['PASIVOS CIRCULANTES', '', '', null]);
        addRowIfNotZero(rows, 'Cuentas por Pagar Proveedores', cppProveedores);
        addRowIfNotZero(rows, 'Acumulaciones y Provisiones por Pagar', acumulacionesPorPagar);
        addRowIfNotZero(rows, 'Préstamos por Pagar a Corto Plazo', prestamosCortoPlazo);
        addRowIfNotZero(rows, 'Otras Cuentas por Pagar', otrasCxPCorrientes);
        rows.push(['  Total Pasivos Corrientes', '', '', pasivosCorrientes]);
        rows.push(['', '', '', null]);
      }

      // PASIVOS A LARGO PLAZO - solo agregar si tiene saldo
      if (Math.abs(pasivosLargoPlazo) >= 0.01) {
        rows.push(['PASIVOS A LARGO PLAZO', '', '', null]);
        addRowIfNotZero(rows, 'Pasivos a Largo Plazo', pasivosLargoPlazo);
        rows.push(['  Total Pasivos a Largo Plazo', '', '', pasivosLargoPlazo]);
        rows.push(['', '', '', null]);
      }

      // TOTAL PASIVOS - solo agregar si tiene saldo
      if (Math.abs(totals.totalLiabilities) >= 0.01) {
        rows.push(['TOTAL PASIVOS', '', '', totals.totalLiabilities]);
        rows.push(['', '', '', null]);
      }

      // PATRIMONIO - solo agregar si tiene saldo
      if (
        Math.abs(patrimonioTotal) >= 0.01 ||
        Math.abs(beneficiosPeriodoActual) >= 0.01
      ) {
        rows.push(['PATRIMONIO', '', '', null]);
        addRowIfNotZero(rows, 'Capital Suscrito y Pagado', capitalSuscrito);
        addRowIfNotZero(rows, 'Reservas (incluye Reserva Legal)', reservas);
        addRowIfNotZero(rows, 'Beneficios o Pérdidas Acumuladas', resultadosAcumulados);
        addRowIfNotZero(rows, 'Beneficios del período actual', beneficiosPeriodoActual);
        rows.push(['  Total Patrimonio', '', '', patrimonioConResultado]);
        rows.push(['', '', '', null]);
      }

      rows.push(['TOTAL PASIVOS Y PATRIMONIO', '', '', totalLiabilitiesAndEquity]);

      // Construir archivo Excel usando ExcelJS para poder centrar el título
      const headerRow = ['', '', '', 'Monto'];
      const allRows = [headerRow, ...rows];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Balance');

      // Definir anchos de columna similares al reporte original
      ws.getColumn(1).width = 55;
      ws.getColumn(2).width = 10;
      ws.getColumn(3).width = 10;
      ws.getColumn(4).width = 18;

      allRows.forEach((r) => {
        ws.addRow(r as any[]);
      });

      // Formato numérico para la columna de montos
      ws.getColumn(4).numFmt = '#,##0.00';

      // Centrar y negrita para las primeras filas de título (empresa, título, fecha, moneda)
      const titleRowCount = 4;
      for (let i = 0; i < titleRowCount; i++) {
        const excelRowIndex = 2 + i; // fila 1 es la cabecera de columnas
        ws.mergeCells(excelRowIndex, 1, excelRowIndex, 4);
        const cell = ws.getRow(excelRowIndex).getCell(1);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { ...(cell.font || {}), bold: true };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `balance_general_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error downloading Balance Sheet:', error);
      alert('Error al descargar el Balance General');
    }
  };

  const downloadIncomeStatementExcel = async () => {
    try {
      const dataRows: any[] = [];

      if (Math.abs(totals.totalRevenue) >= 0.01) {
        financialData.revenue
          .filter(i => Math.abs(i.amount) >= 0.01)
          .forEach(i => dataRows.push(['INGRESOS', i.name, i.amount]));
        dataRows.push(['', 'Total Ventas', totals.totalRevenue]);
      }

      if (Math.abs(totals.totalCosts) >= 0.01) {
        const costItemsForExport = [
          ...financialData.costs,
          ...financialData.expenses.filter((item) => {
            const code = item.code || '';
            const normalized = code.replace(/\./g, '');
            return normalized.startsWith('5');
          }),
        ];

        costItemsForExport
          .filter((i) => Math.abs(i.amount) >= 0.01)
          .forEach((i) => dataRows.push(['COSTOS', i.name, i.amount]));
        dataRows.push(['', 'Total Costos', totals.totalCosts]);
      }

      if (Math.abs(totals.totalExpenses) >= 0.01) {
        financialData.expenses
          .filter(i => Math.abs(i.amount) >= 0.01)
          .forEach(i => dataRows.push(['GASTOS', i.name, i.amount]));
        dataRows.push(['', 'Total Gastos', totals.totalExpenses]);
      }

      dataRows.push(['', 'UTILIDAD NETA', totals.netIncome]);

      const today = new Date().toISOString().split('T')[0];

      const headerRow = ['Grupo', 'Cuenta', 'Monto'];
      const titleRows = [
        ['ESTADO DE RESULTADOS', '', ''],
        [periodDates.periodLabel.toUpperCase(), '', ''],
        ['VALORES EN RD$', '', ''],
        ['', '', ''],
      ];

      const allRows = [headerRow, ...titleRows, ...dataRows];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Resultados');

      ws.getColumn(1).width = 16;
      ws.getColumn(2).width = 36;
      ws.getColumn(3).width = 14;
      ws.getColumn(3).numFmt = '#,##0.00';

      allRows.forEach((r) => {
        ws.addRow(r as any[]);
      });

      const titleRowCount = 3;
      for (let i = 0; i < titleRowCount; i++) {
        const excelRowIndex = 2 + i;
        ws.mergeCells(excelRowIndex, 1, excelRowIndex, 3);
        const cell = ws.getRow(excelRowIndex).getCell(1);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { ...(cell.font || {}), bold: true };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `estado_resultados_${today}.xlsx`);
    } catch (error) {
      console.error('Error downloading Income Statement:', error);
      alert('Error al descargar el Estado de Resultados');
    }
  };

  const downloadExpensesStatementExcel = async () => {
    try {
      const dataRows: any[] = [];

      const addCategory = (
        categoryName: string,
        total: number,
        items: { name: string; amount: number }[],
      ) => {
        if (Math.abs(total) >= 0.01) {
          dataRows.push([categoryName, '', total]);
          items
            .filter(item => Math.abs(item.amount) >= 0.01)
            .forEach((item) => {
              dataRows.push(['', item.name, item.amount]);
            });
          dataRows.push(['', '', null]);
        }
      };

      addCategory('Gastos de Personal', gastosPersonal, expenseItemsPersonal);
      addCategory('Gastos Generales y Administrativos', gastosGeneralesAdm, expenseItemsGeneralesAdm);
      addCategory('Gastos de Mantenimiento de Activos Fijos', gastosMantenimientoAF, expenseItemsMantenimientoAF);
      addCategory('Gastos de Depreciación', gastosDepreciacion, expenseItemsDepreciacion);
      addCategory('Gastos de Impuestos No Deducibles', gastosImpuestosNoDeducibles, expenseItemsImpuestosNoDeducibles);
      addCategory('Gastos Financieros', gastosFinancieros, expenseItemsFinancieros);

      dataRows.push(['Total gastos del Periodo', '', totals.totalExpenses]);

      const today = new Date().toISOString().split('T')[0];

      const headerRow = ['Categoría', 'Cuenta', 'Monto'];
      const titleRows = [
        ['ESTADO DE GASTOS GENERALES Y ADMINISTRATIVOS', '', ''],
        [periodDates.periodLabel.toUpperCase(), '', ''],
        ['VALORES EN RD$', '', ''],
        ['', '', ''],
      ];

      const allRows = [headerRow, ...titleRows, ...dataRows];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Gastos');

      ws.getColumn(1).width = 32;
      ws.getColumn(2).width = 42;
      ws.getColumn(3).width = 16;
      ws.getColumn(3).numFmt = '#,##0.00';

      allRows.forEach((r) => {
        ws.addRow(r as any[]);
      });

      const titleRowCount = 3;
      for (let i = 0; i < titleRowCount; i++) {
        const excelRowIndex = 2 + i;
        ws.mergeCells(excelRowIndex, 1, excelRowIndex, 3);
        const cell = ws.getRow(excelRowIndex).getCell(1);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { ...(cell.font || {}), bold: true };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `estado_gastos_${today}.xlsx`);
    } catch (error) {
      console.error('Error downloading Expenses Statement:', error);
      alert('Error al descargar el Estado de Gastos');
    }
  };

  const downloadCostOfSalesExcel = async () => {
    try {
      const dataRows: any[] = [];

      if (Math.abs(costOfSalesData.openingInventory) >= 0.01) {
        dataRows.push(['Inventario Inicial', costOfSalesData.openingInventory]);
      }
      if (Math.abs(costOfSalesData.purchasesLocal) >= 0.01) {
        dataRows.push(['Compras Proveedores Locales', costOfSalesData.purchasesLocal]);
      }
      if (Math.abs(costOfSalesData.purchasesImports) >= 0.01) {
        dataRows.push(['Importaciones', costOfSalesData.purchasesImports]);
      }
      if (Math.abs(costOfSalesData.totalPurchases) >= 0.01) {
        dataRows.push(['Total Compras del Periodo', costOfSalesData.totalPurchases]);
      }
      if (Math.abs(costOfSalesData.indirectCosts) >= 0.01) {
        dataRows.push(['Costos Indirectos', costOfSalesData.indirectCosts]);
      }
      if (Math.abs(costOfSalesData.availableForSale) >= 0.01) {
        dataRows.push(['Mercancía Disponible para la venta', costOfSalesData.availableForSale]);
      }
      if (Math.abs(costOfSalesData.closingInventory) >= 0.01) {
        dataRows.push(['Inventario Final', costOfSalesData.closingInventory]);
      }
      dataRows.push(['Costo de Venta del Periodo', totals.totalCosts]);

      const today = new Date().toISOString().split('T')[0];

      const headerRow = ['Concepto', 'Monto'];
      const titleRows = [
        ['ESTADO DE COSTOS DE VENTAS', ''],
        [periodDates.periodLabel.toUpperCase(), ''],
        ['VALORES EN RD$', ''],
        ['', ''],
      ];

      const allRows = [headerRow, ...titleRows, ...dataRows];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Costos de Ventas');

      ws.getColumn(1).width = 45;
      ws.getColumn(2).width = 18;
      ws.getColumn(2).numFmt = '#,##0.00';

      allRows.forEach((r) => {
        ws.addRow(r as any[]);
      });

      const titleRowCount = 3;
      for (let i = 0; i < titleRowCount; i++) {
        const excelRowIndex = 2 + i;
        ws.mergeCells(excelRowIndex, 1, excelRowIndex, 2);
        const cell = ws.getRow(excelRowIndex).getCell(1);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { ...(cell.font || {}), bold: true };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `estado_costos_ventas_${today}.xlsx`);
    } catch (error) {
      console.error('Error downloading Cost of Sales Statement:', error);
      alert('Error al descargar el Estado de Costos de Ventas');
    }
  };

  const downloadCashFlowExcel = async () => {
    try {
      const dataRows: any[] = [];
      const openingCash = cashFlow.openingCash || 0;
      const closingCash = cashFlow.closingCash || 0;
      const netChange = closingCash - openingCash;

      if (Math.abs(cashFlow.operatingCashFlow || 0) >= 0.01) {
        dataRows.push(['ACTIVIDADES DE OPERACIÓN', 'Efectivo de Actividades de Operación', cashFlow.operatingCashFlow]);
      }
      if (Math.abs(cashFlow.investingCashFlow || 0) >= 0.01) {
        dataRows.push(['ACTIVIDADES DE INVERSIÓN', 'Efectivo de Actividades de Inversión', cashFlow.investingCashFlow]);
      }
      if (Math.abs(cashFlow.financingCashFlow || 0) >= 0.01) {
        dataRows.push(['ACTIVIDADES DE FINANCIAMIENTO', 'Efectivo de Actividades de Financiamiento', cashFlow.financingCashFlow]);
      }
      dataRows.push(['RESUMEN', 'Aumento Neto en Efectivo', netChange]);

      const today = new Date().toISOString().split('T')[0];

      const headerRow = ['Actividad', 'Concepto', 'Monto'];
      const titleRows = [
        ['ESTADO DE FLUJOS DE EFECTIVO', '', ''],
        [periodDates.periodLabel.toUpperCase(), '', ''],
        ['VALORES EN RD$', '', ''],
        ['', '', ''],
      ];

      const allRows = [headerRow, ...titleRows, ...dataRows];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Flujo');

      ws.getColumn(1).width = 18;
      ws.getColumn(2).width = 36;
      ws.getColumn(3).width = 14;
      ws.getColumn(3).numFmt = '#,##0.00';

      allRows.forEach((r) => {
        ws.addRow(r as any[]);
      });

      const titleRowCount = 3;
      for (let i = 0; i < titleRowCount; i++) {
        const excelRowIndex = 2 + i;
        ws.mergeCells(excelRowIndex, 1, excelRowIndex, 3);
        const cell = ws.getRow(excelRowIndex).getCell(1);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { ...(cell.font || {}), bold: true };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `flujo_efectivo_${today}.xlsx`);
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
      {/* Estilos de impresión */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center print-hidden">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estados Financieros</h1>
            <p className="text-gray-600">Generación y gestión de reportes financieros</p>
          </div>
          <div className="flex space-x-3">
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
        <div className="border-b border-gray-200 print-hidden">
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
                  {periodOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
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
              {/* Header con botón de descarga */}
              <div className="flex justify-end gap-2 mb-4 print-hidden">
                <button
                  onClick={downloadExpensesStatementExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-file-pdf-line mr-2"></i>
                  PDF
                </button>
              </div>

              {/* Contenido para impresión */}
              <div id="printable-statement">
              {/* Header y título */}
              <div className="text-center mb-8">
                <h1 className="text-base font-semibold text-gray-800 mb-1">
                  RESUMEN DE LOS GASTOS DE PERSONAL, DE VENTAS Y ADMINISTRATIVOS
                </h1>
                <p className="text-sm text-gray-700 mb-0.5">{periodDates.periodLabel}</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              <div className="max-w-3xl mx-auto space-y-6">
                {/* Título del estado */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-800 pb-1">
                    Estado de Gastos Generales y Adm.
                  </h2>
                </div>

                <div className="flex justify-end print-hidden">
                  <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={showExpensesDetail}
                      onChange={(e) => setShowExpensesDetail(e.target.checked)}
                    />
                    <span>Ver detalle por cuenta</span>
                  </label>
                </div>

                {/* Categorías de gastos */}
                <div className="space-y-1">
                  <div className={`py-0.5 pl-4 ${Math.abs(gastosPersonal) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Gastos de Personal</span>
                      <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(gastosPersonal)}</span>
                    </div>
                    {showExpensesDetail && expenseItemsPersonal.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {expenseItemsPersonal.map((item) => (
                          <div key={item.code} className={`flex justify-between text-xs text-gray-600 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                            <span>{item.name}</span>
                            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`py-0.5 pl-4 ${Math.abs(gastosGeneralesAdm) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Gastos Generales y Administrativos</span>
                      <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(gastosGeneralesAdm)}</span>
                    </div>
                    {showExpensesDetail && expenseItemsGeneralesAdm.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {expenseItemsGeneralesAdm.map((item) => (
                          <div key={item.code} className={`flex justify-between text-xs text-gray-600 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                            <span>{item.name}</span>
                            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`py-0.5 pl-4 ${Math.abs(gastosMantenimientoAF) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Gastos de Mantenimiento de Activos Fijos</span>
                      <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(gastosMantenimientoAF)}</span>
                    </div>
                    {showExpensesDetail && expenseItemsMantenimientoAF.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {expenseItemsMantenimientoAF.map((item) => (
                          <div key={item.code} className={`flex justify-between text-xs text-gray-600 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                            <span>{item.name}</span>
                            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`py-0.5 pl-4 ${Math.abs(gastosDepreciacion) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Gastos de Depreciación</span>
                      <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(gastosDepreciacion)}</span>
                    </div>
                    {showExpensesDetail && expenseItemsDepreciacion.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {expenseItemsDepreciacion.map((item) => (
                          <div key={item.code} className={`flex justify-between text-xs text-gray-600 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                            <span>{item.name}</span>
                            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`py-0.5 pl-4 ${Math.abs(gastosImpuestosNoDeducibles) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Gastos de Impuestos No Deducibles</span>
                      <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(gastosImpuestosNoDeducibles)}</span>
                    </div>
                    {showExpensesDetail && expenseItemsImpuestosNoDeducibles.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {expenseItemsImpuestosNoDeducibles.map((item) => (
                          <div key={item.code} className={`flex justify-between text-xs text-gray-600 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                            <span>{item.name}</span>
                            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`py-0.5 pl-4 ${Math.abs(gastosFinancieros) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-700">Gastos Financieros</span>
                      <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(gastosFinancieros)}</span>
                    </div>
                    {showExpensesDetail && expenseItemsFinancieros.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {expenseItemsFinancieros.map((item) => (
                          <div key={item.code} className={`flex justify-between text-xs text-gray-600 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                            <span>{item.name}</span>
                            <span className="tabular-nums">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Total gastos del periodo */}
                <div className="border-t-2 border-gray-800 pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-base">Total gastos del Periodo</span>
                    <span className="text-base tabular-nums">{formatCurrencyRD(totals.totalExpenses)}</span>
                  </div>
                </div>
              </div>
              </div> {/* Cierre de printable-statement */}
            </div>
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header con botón de descarga */}
              <div className="flex justify-end gap-2 mb-4 print-hidden">
                <button
                  onClick={downloadCostOfSalesExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-file-pdf-line mr-2"></i>
                  PDF
                </button>
              </div>

              {/* Contenido para impresión */}
              <div id="printable-statement">
              {/* Header y título */}
              <div className="text-center mb-8">
                <h1 className="text-base font-semibold text-gray-800 mb-1">NOTAS A LOS ESTADOS FINANCIEROS</h1>
                <p className="text-sm text-gray-700 mb-0.5">{periodDates.periodLabel}</p>
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
                  {renderBalanceLineIfNotZero('Inventario Inicial', costOfSalesData.openingInventory)}
                </div>

                {/* Compras del periodo */}
                <div className="space-y-1 pt-2">
                  <div className="text-sm font-semibold text-gray-800 pl-2">Más:</div>
                  <div className="pl-2">
                    {renderBalanceLineIfNotZero('Compras Proveedores Locales', costOfSalesData.purchasesLocal)}
                    {renderBalanceLineIfNotZero('Importaciones', costOfSalesData.purchasesImports)}
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-6">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total Compras del Periodo</span>
                      <span className="text-sm tabular-nums">{formatCurrencyRD(costOfSalesData.totalPurchases)}</span>
                    </div>
                  </div>
                </div>

                {/* Costos indirectos */}
                <div className="space-y-1 pt-4">
                  <div className="text-sm font-semibold text-gray-800 pl-2">Más:</div>
                  <div className="pl-2">
                    {renderBalanceLineIfNotZero('Costos Indirectos', costOfSalesData.indirectCosts)}
                  </div>
                </div>

                {/* Mercancía disponible para la venta */}
                <div className="border-t border-gray-800 pt-2 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-sm">Mercancía Disponible para la venta</span>
                    <span className="text-sm tabular-nums">{formatCurrencyRD(costOfSalesData.availableForSale)}</span>
                  </div>
                </div>

                {/* Inventario final */}
                <div className="space-y-1 pt-4">
                  <div className="text-sm font-semibold text-gray-800 pl-2">Menos:</div>
                  <div className="flex justify-between py-0.5 pl-6">
                    <span className="text-sm text-gray-700">Inventario Final</span>
                    <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(costOfSalesData.closingInventory)}</span>
                  </div>
                </div>

                {/* Costo de Venta del Periodo */}
                <div className="border-t-2 border-gray-800 pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-base">Costo de Venta del Periodo</span>
                    <span className="text-base tabular-nums">{formatCurrencyRD(totals.totalCosts)}</span>
                  </div>
                </div>
              </div>
              </div> {/* Cierre de printable-statement */}
            </div>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header con botón de descarga */}
              <div className="flex justify-end gap-2 mb-4 print-hidden">
                <button
                  onClick={downloadBalanceSheetExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-file-pdf-line mr-2"></i>
                  PDF
                </button>
              </div>

              {/* Contenido para impresión */}
              <div id="printable-statement">
              {/* Título centrado estilo profesional */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">ESTADO DE SITUACIÓN FINANCIERA</h1>
                <p className="text-sm text-gray-700 mb-0.5">{periodDates.asOfDateLabel}</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              <div className="max-w-4xl mx-auto space-y-6">
                {/* ACTIVOS */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">ACTIVOS</h2>

                  {/* ACTIVOS CORRIENTES */}
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">ACTIVOS CORRIENTES</h3>

                    {renderBalanceLineIfNotZero('Efectivo en Caja y Bancos', efectivoCajaBancos)}
                    {renderBalanceLineIfNotZero('Cuentas por Cobrar Clientes', cxcClientes)}
                    {renderBalanceLineIfNotZero('Otras Cuentas por Cobrar', otrasCxc)}
                    {renderBalanceLineIfNotZero('Inventarios', inventarios)}
                    {renderBalanceLineIfNotZero('Gastos Pagados por Anticipado', gastosPagadosAnticipado)}
                    {renderBalanceLineIfNotZero('Anticipos sobre la Renta Pagados', anticiposISR)}

                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Activos Corrientes</span>
                        <span className="text-sm tabular-nums">{formatCurrencyRD(totals.totalCurrentAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVOS FIJOS */}
                  <div className={`mb-4 ${Math.abs(activosFijos) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">ACTIVOS FIJOS</h3>
                    {renderBalanceLineIfNotZero('Activos Fijos', activosFijos)}
                  </div>

                  {/* OTROS ACTIVOS */}
                  <div className={`mb-4 ${Math.abs(totals.totalNonCurrentAssets) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">OTROS ACTIVOS</h3>
                    {renderBalanceLineIfNotZero('Inversiones en Otras Compañías', invAcciones)}
                    {renderBalanceLineIfNotZero('Certificados Bancarios y Títulos Financieros', invCertificados)}
                    {renderBalanceLineIfNotZero('Fianzas y Depósitos', fianzasDepositos)}
                    {renderBalanceLineIfNotZero('Licencias y Softwares', licenciasSoftware)}
                    {renderBalanceLineIfNotZero('Otros Activos', otrosActivos)}

                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Otros Activos</span>
                        <span className="text-sm tabular-nums">{formatCurrencyRD(totals.totalNonCurrentAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* TOTAL ACTIVOS */}
                  <div className="border-t-2 border-gray-800 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-base">TOTAL ACTIVOS</span>
                      <span className="text-base tabular-nums">{formatCurrencyRD(totals.totalAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* PASIVO Y PATRIMONIO */}
                <div className="pt-4">
                  <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">PASIVO Y PATRIMONIO DE LOS SOCIOS</h2>

                  {/* PASIVOS CIRCULANTES */}
                  <div className={`mb-4 ${Math.abs(pasivosCorrientes) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">PASIVOS CIRCULANTES</h3>
                    {renderBalanceLineIfNotZero('Cuentas por Pagar Proveedores', cppProveedores)}
                    {renderBalanceLineIfNotZero('Acumulaciones y Provisiones por Pagar', acumulacionesPorPagar)}
                    {renderBalanceLineIfNotZero('Préstamos por Pagar a Corto Plazo', prestamosCortoPlazo)}
                    {renderBalanceLineIfNotZero('Otras Cuentas por Pagar', otrasCxPCorrientes)}

                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Pasivos Corrientes</span>
                        <span className="text-sm tabular-nums">{formatCurrencyRD(pasivosCorrientes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* PASIVOS A LARGO PLAZO */}
                  <div className={`mb-4 ${Math.abs(pasivosLargoPlazo) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">PASIVOS A LARGO PLAZO</h3>
                    {renderBalanceLineIfNotZero('Pasivos a Largo Plazo', pasivosLargoPlazo)}
                    {nonCurrentLiabilities.length > 0 && (
                      <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                        <div className="flex justify-between font-semibold">
                          <span className="text-sm">Total Pasivos a Largo Plazo</span>
                          <span className="text-sm tabular-nums">{formatCurrencyRD(pasivosLargoPlazo)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TOTAL PASIVOS */}
                  <div className={`border-t border-gray-400 pt-2 mb-4 ${Math.abs(totals.totalLiabilities) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                    <div className="flex justify-between font-bold">
                      <span className="text-sm">TOTAL PASIVOS</span>
                      <span className="text-sm tabular-nums">{formatCurrencyRD(totals.totalLiabilities)}</span>
                    </div>
                  </div>

                  {/* PATRIMONIO */}
                  <div
                    className={`mb-4 ${
                      Math.abs(patrimonioTotal) < 0.01 &&
                      Math.abs(beneficiosPeriodoActual) < 0.01
                        ? 'hide-zero-on-print'
                        : ''
                    }`}
                  >
                    <h3 className="text-sm font-bold text-gray-800 mb-2 underline">PATRIMONIO</h3>
                    {renderBalanceLineIfNotZero('Capital Suscrito y Pagado', capitalSuscrito)}
                    {renderBalanceLineIfNotZero('Reservas (incluye Reserva Legal)', reservas)}
                    {renderBalanceLineIfNotZero('Beneficios o Pérdidas Acumuladas', resultadosAcumulados)}
                    {renderBalanceLineIfNotZero('Beneficios del periodo actual', beneficiosPeriodoActual)}
                    <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                      <div className="flex justify-between font-semibold">
                        <span className="text-sm">Total Patrimonio</span>
                        <span className="text-sm tabular-nums">{formatCurrencyRD(patrimonioConResultado)}</span>
                      </div>
                    </div>
                  </div>

                  {/* TOTAL PASIVOS Y PATRIMONIO */}
                  <div className="border-t-2 border-gray-800 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-base">TOTAL PASIVOS Y PATRIMONIO</span>
                      <span className="text-base tabular-nums">{formatCurrencyRD(totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
              </div> {/* Cierre de printable-statement */}
            </div>
          </div>
        )}

        {activeTab === 'income' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header con botón de descarga */}
              <div className="flex justify-end gap-2 mb-4 print-hidden">
                <button
                  onClick={downloadIncomeStatementExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-file-pdf-line mr-2"></i>
                  PDF
                </button>
              </div>

              {/* Contenido para impresión */}
              <div id="printable-statement">
              {/* Título centrado estilo profesional */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">ESTADO DE RESULTADOS</h1>
                <p className="text-sm text-gray-700 mb-0.5">{periodDates.periodLabel}</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              <div className="max-w-3xl mx-auto space-y-6">
                {/* INGRESOS / VENTAS */}
                <div className={`${Math.abs(totals.totalRevenue) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                  <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b-2 border-gray-300">INGRESOS</h2>
                  {financialData.revenue.map((item, index) => (
                    <div key={index} className={`flex justify-between py-0.5 pl-4 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total Ventas</span>
                      <span className="text-sm tabular-nums">{formatCurrencyRD(totals.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* COSTO DE VENTAS Y BENEFICIO BRUTO */}
                <div className={`${Math.abs(totals.totalCosts) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 underline">COSTO DE VENTAS</h2>
                  {costItemsForIncome.map((item, index) => (
                    <div key={index} className={`flex justify-between py-0.5 pl-4 ${Math.abs(item.amount) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-sm text-gray-900 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Costo de Ventas</span>
                      <span className="text-sm tabular-nums">{formatCurrencyRD(totals.totalCosts)}</span>
                    </div>
                  </div>

                  {/* Beneficio Bruto */}
                  <div className="border-t-2 border-gray-800 pt-2 mt-3">
                    <div className="flex justify-between font-bold">
                      <span className="text-base">Beneficio Bruto</span>
                      <span className="text-base tabular-nums">{formatCurrencyRD(grossProfit)}</span>
                    </div>
                  </div>
                </div>

                {/* GASTOS DE OPERACIONES */}
                <div className={`pt-4 ${Math.abs(operatingExpenses) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 underline">GASTOS DE OPERACIONES</h2>
                  <div className="space-y-0.5 pl-4">
                    {renderBalanceLineIfNotZero('Gastos de Personal', gastosPersonal)}
                    {renderBalanceLineIfNotZero('Gastos Generales y Administrativos', gastosGeneralesAdm)}
                    {renderBalanceLineIfNotZero('Gastos de Mantenimiento de Activos Fijos', gastosMantenimientoAF)}
                    {renderBalanceLineIfNotZero('Gastos de Depreciación', gastosDepreciacion)}
                    {renderBalanceLineIfNotZero('Gastos de Impuestos No Deducibles', gastosImpuestosNoDeducibles)}
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-1 pl-4">
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Total Gastos de Operaciones</span>
                      <span className="text-sm tabular-nums">{formatCurrencyRD(operatingExpenses)}</span>
                    </div>
                  </div>

                  {/* Beneficios netos operacionales */}
                  <div className="border-t border-gray-400 pt-2 mb-4">
                    <div className="flex justify-between font-bold">
                      <span className="text-sm">Beneficios netos operacionales</span>
                      <span className="text-sm tabular-nums">{formatCurrencyRD(operatingIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* GASTOS FINANCIEROS Y RESULTADO ANTES DE ISR Y RESERVAS */}
                <div className={`${Math.abs(financialExpenses) < 0.01 ? 'hide-zero-on-print' : ''}`}>
                  <div className="mb-2">
                    {renderBalanceLineIfNotZero('Gastos financieros', financialExpenses)}
                  </div>

                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-sm">Beneficios (pérdida) antes de ISR y Reservas</span>
                      <span className="text-sm tabular-nums">{formatCurrencyRD(incomeBeforeTaxReserves)}</span>
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
                        {formatCurrencyRD(totals.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </div> {/* Cierre de printable-statement */}
            </div>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {/* Header con botón de descarga */}
              <div className="flex justify-end gap-2 mb-4 print-hidden">
                <button
                  onClick={downloadCashFlowExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-download-line mr-2"></i>
                  Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap text-sm"
                >
                  <i className="ri-file-pdf-line mr-2"></i>
                  PDF
                </button>
              </div>

              {/* Contenido para impresión */}
              <div id="printable-statement">
              {/* Título centrado estilo profesional */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 mb-1">ESTADO DE FLUJOS DE EFECTIVO</h1>
                <p className="text-sm text-gray-700 mb-0.5">{periodDates.periodLabel}</p>
                <p className="text-xs text-gray-600">VALORES EN RD$</p>
              </div>

              {(() => {
                const openingCash = cashFlow.openingCash || 0;
                const endingCash = cashFlow.closingCash || 0;
                const netChange = endingCash - openingCash;

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
                          <div className="flex justify-between py-0.5 hide-zero-on-print">
                            <span className="text-sm text-gray-700">Depreciación y Amortización</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                          <div className="flex justify-between py-0.5 hide-zero-on-print">
                            <span className="text-sm text-gray-700">Incremento/Disminución en cuentas por cobrar</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                          <div className="flex justify-between py-0.5 hide-zero-on-print">
                            <span className="text-sm text-gray-700">Incremento/Disminución en inventario</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                          <div className="flex justify-between py-0.5 hide-zero-on-print">
                            <span className="text-sm text-gray-700">Disminución/Incremento en otras cuentas</span>
                            <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total ajustes - placeholder 0 */}
                      <div className="border-t border-gray-300 mt-2 pt-1 pl-4 hide-zero-on-print">
                        <div className="flex justify-between font-semibold">
                          <span className="text-sm">Total ajustes</span>
                          <span className="text-sm tabular-nums">{formatCurrencyRD(0)}</span>
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
                        <div className="flex justify-between py-0.5 hide-zero-on-print">
                          <span className="text-sm text-gray-700">Adquisición de Terrenos</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between py-0.5 hide-zero-on-print">
                          <span className="text-sm text-gray-700">Adquisición de Planta y Edificaciones</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between py-0.5 hide-zero-on-print">
                          <span className="text-sm text-gray-700">Adquisición de Maquinarias y Equipos</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                      </div>

                      <div className={`border-t border-gray-300 mt-2 pt-1 pl-4 ${Math.abs(cashFlow.investingCashFlow || 0) < 0.01 ? 'hide-zero-on-print' : ''}`}>
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
                        <div className="flex justify-between py-0.5 hide-zero-on-print">
                          <span className="text-sm text-gray-700">Disminución/Incremento en Doc. por Pagar</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between py-0.5 hide-zero-on-print">
                          <span className="text-sm text-gray-700">Incremento en otras cuentas de Capital</span>
                          <span className="text-sm text-gray-900 tabular-nums">{formatCurrency(0)}</span>
                        </div>
                      </div>

                      <div className={`border-t border-gray-300 mt-2 pt-1 pl-4 ${Math.abs(cashFlow.financingCashFlow || 0) < 0.01 ? 'hide-zero-on-print' : ''}`}>
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
              </div> {/* Cierre de printable-statement */}
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
