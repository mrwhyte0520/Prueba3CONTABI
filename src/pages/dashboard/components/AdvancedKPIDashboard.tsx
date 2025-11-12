
import { useState, useEffect } from 'react';

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

  const [chartData] = useState<ChartData[]>([
    { month: 'Ene', ingresos: 45000, gastos: 32000 },
    { month: 'Feb', ingresos: 52000, gastos: 38000 },
    { month: 'Mar', ingresos: 48000, gastos: 35000 },
    { month: 'Abr', ingresos: 61000, gastos: 42000 },
    { month: 'May', ingresos: 55000, gastos: 39000 },
    { month: 'Jun', ingresos: 67000, gastos: 45000 }
  ]);

  const [expenseData] = useState<ExpenseData[]>([
    { category: 'Nómina', amount: 25000, color: '#3B82F6' },
    { category: 'Alquiler', amount: 8000, color: '#10B981' },
    { category: 'Servicios', amount: 5000, color: '#F59E0B' },
    { category: 'Marketing', amount: 3000, color: '#EF4444' },
    { category: 'Otros', amount: 4000, color: '#8B5CF6' }
  ]);

  useEffect(() => {
    // Simular carga de datos
    const loadKPIData = () => {
      setKpiData({
        totalRevenue: 67000,
        totalExpenses: 45000,
        netProfit: 22000,
        pendingInvoices: 12,
        cashFlow: 15000,
        profitMargin: 32.8,
        liquidityRatio: 2.1,
        efficiency: 85,
        monthlyGrowth: 12.5,
        customerSatisfaction: 94
      });
    };

    loadKPIData();
  }, []);

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(kpiData.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-2xl text-green-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-green-600 font-medium">+{formatPercentage(kpiData.monthlyGrowth)}</span>
            <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gastos Totales</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(kpiData.totalExpenses)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-2xl text-red-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-red-600 font-medium">+5.2%</span>
            <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilidad Neta</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(kpiData.netProfit)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="ri-line-chart-line text-2xl text-blue-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-blue-600 font-medium">Margen: {formatPercentage(kpiData.profitMargin)}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Facturas Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">{kpiData.pendingInvoices}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <i className="ri-file-list-3-line text-2xl text-orange-600"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-orange-600 font-medium">Valor: {formatCurrency(85000)}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                <div className="flex items-end space-x-1 h-48">
                  <div 
                    className="bg-green-500 rounded-t w-4"
                    style={{ height: `${(data.ingresos / 70000) * 100}%` }}
                    title={`Ingresos: ${formatCurrency(data.ingresos)}`}
                  ></div>
                  <div 
                    className="bg-red-500 rounded-t w-4"
                    style={{ height: `${(data.gastos / 70000) * 100}%` }}
                    title={`Gastos: ${formatCurrency(data.gastos)}`}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">{data.month}</span>
              </div>
            ))}
          </div>
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

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Importantes</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <i className="ri-alert-line text-yellow-600 mr-3"></i>
            <div>
              <p className="text-sm font-medium text-yellow-800">Facturas por vencer</p>
              <p className="text-xs text-yellow-600">5 facturas vencen en los próximos 7 días</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <i className="ri-error-warning-line text-red-600 mr-3"></i>
            <div>
              <p className="text-sm font-medium text-red-800">Stock bajo</p>
              <p className="text-xs text-red-600">3 productos con inventario crítico</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <i className="ri-information-line text-blue-600 mr-3"></i>
            <div>
              <p className="text-sm font-medium text-blue-800">Backup programado</p>
              <p className="text-xs text-blue-600">Próximo backup automático: Mañana 2:00 AM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
