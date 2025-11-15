import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { chartAccountsService, invoicesService } from '../../../services/database';

interface KPIData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  cashFlow: number;
  profitMargin: number;
  liquidityRatio: number;
  efficiency: number;
  monthlyGrowth: number;
  customerSatisfaction: number;
}

interface ChartData {
  month: string;
  ingresos: number;
  gastos: number;
}

interface ExpenseData {
  category: string;
  amount: number;
  color: string;
}

export default function AdvancedKPIDashboard() {
  const { user } = useAuth();
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingInvoices: 0,
    cashFlow: 0,
    profitMargin: 0,
    liquidityRatio: 0,
    efficiency: 0,
    monthlyGrowth: 0,
    customerSatisfaction: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [pendingAmount, setPendingAmount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = user?.id || '';
        // Rango del mes actual
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const fromDate = start.toISOString().slice(0, 10);
        const toDate = end.toISOString().slice(0, 10);

        const [incomeStmt, cashFlowRes, invoices] = await Promise.all([
          chartAccountsService.generateIncomeStatement(uid, fromDate, toDate),
          chartAccountsService.generateCashFlowStatement(uid, fromDate, toDate),
          invoicesService.getAll(uid)
        ]);

        const totalRevenue = incomeStmt.totalIncome || 0;
        const totalExpenses = incomeStmt.totalExpenses || 0;
        const netProfit = incomeStmt.netIncome || 0;
        const cashFlow = cashFlowRes.netCashFlow || 0;
        const pendingInvoices = (invoices || []).filter((inv: any) => {
          const status = (inv.status || '').toLowerCase();
          return status === 'pending' || status === 'unpaid' || status === 'vencida';
        }).length;
        const pendingAmountCalc = (invoices || []).filter((inv: any) => {
          const status = (inv.status || '').toLowerCase();
          return status === 'pending' || status === 'unpaid' || status === 'vencida';
        }).reduce((sum: number, inv: any) => sum + (inv.total_amount || inv.total || 0), 0);

        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        setKpiData(prev => ({
          ...prev,
          totalRevenue,
          totalExpenses,
          netProfit,
          cashFlow,
          pendingInvoices,
          profitMargin,
        }));
        setPendingAmount(pendingAmountCalc);

        // Datos para gráfico: una sola barra del mes actual
        setChartData([{ month: now.toLocaleString('es-DO', { month: 'short' }), ingresos: totalRevenue, gastos: totalExpenses }]);

        // Distribución de gastos: si hay detalle disponible, podríamos armar por categorías.
        // De momento, dejamos vacío para evitar datos de prueba.
        setExpenseData([]);
      } catch (e) {
        // En caso de error, dejamos los datos en cero (sin mocks)
        setChartData([]);
        setExpenseData([]);
      }
    };

    fetchData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 whitespace-normal break-words leading-tight">{formatCurrency(kpiData.totalRevenue)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ri-money-dollar-circle-line text-2xl text-green-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-green-600 font-medium">+{formatPercentage(kpiData.monthlyGrowth)}</span>
            <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Gastos Totales</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 whitespace-normal break-words leading-tight">{formatCurrency(kpiData.totalExpenses)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ri-money-dollar-circle-line text-2xl text-red-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Utilidad Neta</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 whitespace-normal break-words leading-tight">{formatCurrency(kpiData.netProfit)}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ri-line-chart-line text-2xl text-blue-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-blue-600 font-medium">Margen: {formatPercentage(kpiData.profitMargin)}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Facturas Pendientes</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600 whitespace-normal break-words leading-tight">{kpiData.pendingInvoices}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="ri-file-list-3-line text-2xl text-orange-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-orange-600 font-medium">Valor: {formatCurrency(pendingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos</h3>
          {(() => {
            const maxValue = Math.max(1, ...chartData.flatMap(d => [d.ingresos, d.gastos]));
            return (
              <div className="h-64 flex items-end justify-between space-x-2">
                {chartData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                    <div className="flex items-end space-x-1 h-48">
                      <div 
                        className="bg-green-500 rounded-t w-4"
                        style={{ height: `${Math.min((data.ingresos / maxValue) * 100, 100)}%` }}
                        title={`Ingresos: ${formatCurrency(data.ingresos)}`}
                      ></div>
                      <div 
                        className="bg-red-500 rounded-t w-4"
                        style={{ height: `${Math.min((data.gastos / maxValue) * 100, 100)}%` }}
                        title={`Gastos: ${formatCurrency(data.gastos)}`}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">{data.month}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Ingresos</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Gastos</span>
            </div>
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Gastos</h3>
          <div className="space-y-4">
            {expenseData.map((expense, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: expense.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">{expense.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</div>
                  <div className="text-xs text-gray-500">
                    {((expense.amount / kpiData.totalExpenses) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Liquidez</h3>
            <i className="ri-drop-line text-2xl text-blue-600"></i>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">{kpiData.liquidityRatio.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Ratio de liquidez corriente</div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min((kpiData.liquidityRatio / 3) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rentabilidad</h3>
            <i className="ri-percent-line text-2xl text-green-600"></i>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">{formatPercentage(kpiData.profitMargin)}</div>
          <div className="text-sm text-gray-600">Margen de utilidad</div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${kpiData.profitMargin}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Eficiencia</h3>
            <i className="ri-speed-line text-2xl text-purple-600"></i>
          </div>
          <div className="text-3xl font-bold text-purple-600 mb-2">{formatPercentage(kpiData.efficiency)}</div>
          <div className="text-sm text-gray-600">Eficiencia operacional</div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${kpiData.efficiency}%` }}
            ></div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
