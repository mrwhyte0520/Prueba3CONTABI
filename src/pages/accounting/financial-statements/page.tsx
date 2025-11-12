
import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

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
  expenses: { name: string; amount: number }[];
}

export default function FinancialStatementsPage() {
  const [activeTab, setActiveTab] = useState<'statements' | 'balance' | 'income' | 'cashflow'>('statements');
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('2024-12');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewStatementModal, setShowNewStatementModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<FinancialStatement | null>(null);

  // Datos financieros de ejemplo
  const financialData: FinancialData = {
    assets: {
      current: [
        { name: 'Efectivo y Equivalentes', amount: 2500000 },
        { name: 'Cuentas por Cobrar', amount: 1800000 },
        { name: 'Inventarios', amount: 3200000 },
        { name: 'Gastos Pagados por Anticipado', amount: 150000 }
      ],
      nonCurrent: [
        { name: 'Propiedad, Planta y Equipo', amount: 8500000 },
        { name: 'Depreciación Acumulada', amount: -2100000 },
        { name: 'Inversiones a Largo Plazo', amount: 1200000 },
        { name: 'Activos Intangibles', amount: 450000 }
      ]
    },
    liabilities: {
      current: [
        { name: 'Cuentas por Pagar', amount: 1200000 },
        { name: 'Impuestos por Pagar', amount: 380000 },
        { name: 'Préstamos a Corto Plazo', amount: 800000 },
        { name: 'Gastos Acumulados', amount: 220000 }
      ],
      nonCurrent: [
        { name: 'Préstamos a Largo Plazo', amount: 4500000 },
        { name: 'Bonos por Pagar', amount: 2000000 },
        { name: 'Provisiones', amount: 150000 }
      ]
    },
    equity: [
      { name: 'Capital Social', amount: 5000000 },
      { name: 'Utilidades Retenidas', amount: 2847000 },
      { name: 'Reservas Legales', amount: 500000 }
    ],
    revenue: [
      { name: 'Ventas de Productos', amount: 12500000 },
      { name: 'Ventas de Servicios', amount: 3200000 },
      { name: 'Ingresos Financieros', amount: 180000 },
      { name: 'Otros Ingresos', amount: 120000 }
    ],
    expenses: [
      { name: 'Costo de Ventas', amount: 8200000 },
      { name: 'Gastos de Administración', amount: 2100000 },
      { name: 'Gastos de Ventas', amount: 1800000 },
      { name: 'Gastos Financieros', amount: 320000 },
      { name: 'Otros Gastos', amount: 180000 }
    ]
  };

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = () => {
    // Datos de ejemplo de estados financieros
    const mockStatements: FinancialStatement[] = [
      {
        id: '1',
        name: 'Balance General Diciembre 2024',
        type: 'balance_sheet',
        period: '2024-12',
        status: 'final',
        created_at: '2024-12-31',
        totalAssets: 15700000,
        totalLiabilities: 9250000,
        totalEquity: 6450000
      },
      {
        id: '2',
        name: 'Estado de Resultados Diciembre 2024',
        type: 'income_statement',
        period: '2024-12',
        status: 'final',
        created_at: '2024-12-31',
        totalRevenue: 16000000,
        totalExpenses: 12600000,
        netIncome: 3400000
      },
      {
        id: '3',
        name: 'Flujo de Efectivo Diciembre 2024',
        type: 'cash_flow',
        period: '2024-12',
        status: 'approved',
        created_at: '2024-12-31'
      },
      {
        id: '4',
        name: 'Estado de Patrimonio Diciembre 2024',
        type: 'equity_statement',
        period: '2024-12',
        status: 'draft',
        created_at: '2024-12-31'
      }
    ];
    setStatements(mockStatements);
  };

  const generateStatement = async (type: string) => {
    setIsGenerating(true);
    // Simular generación
    setTimeout(() => {
      setIsGenerating(false);
      setShowNewStatementModal(false);
      loadStatements();
      alert('Estado financiero generado exitosamente');
    }, 2000);
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
    const totalExpenses = financialData.expenses.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      totalCurrentAssets,
      totalNonCurrentAssets,
      totalAssets,
      totalCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome
    };
  };

  const totals = calculateTotals();

  const downloadExcel = () => {
    try {
      // Crear contenido CSV
      let csvContent = 'Estados Financieros\n';
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      csvContent += 'Nombre,Tipo,Período,Estado,Fecha Creación\n';
      
      statements.forEach(statement => {
        const row = [
          `"${statement.name}"`,
          getTypeLabel(statement.type),
          statement.period,
          statement.status === 'draft' ? 'Borrador' : 
          statement.status === 'final' ? 'Final' : 'Aprobado',
          new Date(statement.created_at).toLocaleDateString()
        ].join(',');
        csvContent += row + '\n';
      });

      // Agregar resumen
      csvContent += '\nResumen:\n';
      csvContent += `Total Estados:,${statements.length}\n`;
      csvContent += `Balance General:,${statements.filter(s => s.type === 'balance_sheet').length}\n`;
      csvContent += `Estado de Resultados:,${statements.filter(s => s.type === 'income_statement').length}\n`;
      csvContent += `Flujo de Efectivo:,${statements.filter(s => s.type === 'cash_flow').length}\n`;
      csvContent += `Estado de Patrimonio:,${statements.filter(s => s.type === 'equity_statement').length}\n`;

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `estados_financieros_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo');
    }
  };

  const downloadBalanceSheetExcel = () => {
    try {
      let csvContent = 'Balance General\n';
      csvContent += `Período: Diciembre 2024\n`;
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      
      // Activos Corrientes
      csvContent += 'ACTIVOS\n';
      csvContent += 'Activos Corrientes\n';
      csvContent += 'Cuenta,Monto\n';
      financialData.assets.current.forEach(item => {
        csvContent += `"${item.name}","${item.amount.toLocaleString()}"\n`;
      });
      csvContent += `"Total Activos Corrientes","${totals.totalCurrentAssets.toLocaleString()}"\n\n`;
      
      // Activos No Corrientes
      csvContent += 'Activos No Corrientes\n';
      csvContent += 'Cuenta,Monto\n';
      financialData.assets.nonCurrent.forEach(item => {
        csvContent += `"${item.name}","${item.amount.toLocaleString()}"\n`;
      });
      csvContent += `"Total Activos No Corrientes","${totals.totalNonCurrentAssets.toLocaleString()}"\n\n`;
      csvContent += `"TOTAL ACTIVOS","${totals.totalAssets.toLocaleString()}"\n\n`;
      
      // Pasivos Corrientes
      csvContent += 'PASIVOS Y PATRIMONIO\n';
      csvContent += 'Pasivos Corrientes\n';
      csvContent += 'Cuenta,Monto\n';
      financialData.liabilities.current.forEach(item => {
        csvContent += `"${item.name}","${item.amount.toLocaleString()}"\n`;
      });
      csvContent += `"Total Pasivos Corrientes","${totals.totalCurrentLiabilities.toLocaleString()}"\n\n`;
      
      // Pasivos No Corrientes
      csvContent += 'Pasivos No Corrientes\n';
      csvContent += 'Cuenta,Monto\n';
      financialData.liabilities.nonCurrent.forEach(item => {
        csvContent += `"${item.name}","${item.amount.toLocaleString()}"\n`;
      });
      csvContent += `"Total Pasivos No Corrientes","${totals.totalNonCurrentLiabilities.toLocaleString()}"\n\n`;
      
      // Patrimonio
      csvContent += 'Patrimonio\n';
      csvContent += 'Cuenta,Monto\n';
      financialData.equity.forEach(item => {
        csvContent += `"${item.name}","${item.amount.toLocaleString()}"\n`;
      });
      csvContent += `"Total Patrimonio","${totals.totalEquity.toLocaleString()}"\n\n`;
      csvContent += `"TOTAL PASIVOS Y PATRIMONIO","${(totals.totalLiabilities + totals.totalEquity).toLocaleString()}"\n`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `balance_general_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Balance Sheet:', error);
      alert('Error al descargar el Balance General');
    }
  };

  const downloadIncomeStatementExcel = () => {
    try {
      let csvContent = 'Estado de Resultados\n';
      csvContent += `Período: Diciembre 2024\n`;
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      
      // Ingresos
      csvContent += 'INGRESOS\n';
      csvContent += 'Cuenta,Monto\n';
      financialData.revenue.forEach(item => {
        csvContent += `"${item.name}","${item.amount.toLocaleString()}"\n`;
      });
      csvContent += `"Total Ingresos","${totals.totalRevenue.toLocaleString()}"\n\n`;
      
      // Gastos
      csvContent += 'GASTOS\n';
      csvContent += 'Cuenta,Monto\n';
      financialData.expenses.forEach(item => {
        csvContent += `"${item.name}","${item.amount.toLocaleString()}"\n`;
      });
      csvContent += `"Total Gastos","${totals.totalExpenses.toLocaleString()}"\n\n`;
      
      // Utilidad Neta
      csvContent += `"UTILIDAD NETA","${totals.netIncome.toLocaleString()}"\n\n`;
      
      // Análisis de Márgenes
      csvContent += 'ANÁLISIS DE MÁRGENES\n';
      csvContent += 'Indicador,Porcentaje\n';
      const grossMargin = ((totals.totalRevenue - financialData.expenses.find(e => e.name === 'Costo de Ventas')!.amount) / totals.totalRevenue * 100).toFixed(2);
      const netMargin = (totals.netIncome / totals.totalRevenue * 100).toFixed(2);
      csvContent += `"Margen Bruto","${grossMargin}%"\n`;
      csvContent += `"Margen Neto","${netMargin}%"\n`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `estado_resultados_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading Income Statement:', error);
      alert('Error al descargar el Estado de Resultados');
    }
  };

  const downloadCashFlowExcel = () => {
    try {
      let csvContent = 'Estado de Flujo de Efectivo\n';
      csvContent += `Período: Diciembre 2024\n`;
      csvContent += `Generado: ${new Date().toLocaleDateString()}\n\n`;
      
      // Actividades de Operación
      csvContent += 'ACTIVIDADES DE OPERACIÓN\n';
      csvContent += 'Concepto,Monto\n';
      csvContent += '"Utilidad Neta","3400000"\n';
      csvContent += '"Depreciación","180000"\n';
      csvContent += '"Cambios en Cuentas por Cobrar","-120000"\n';
      csvContent += '"Cambios en Inventarios","-200000"\n';
      csvContent += '"Cambios en Cuentas por Pagar","80000"\n';
      csvContent += '"Efectivo de Actividades de Operación","3340000"\n\n';
      
      // Actividades de Inversión
      csvContent += 'ACTIVIDADES DE INVERSIÓN\n';
      csvContent += 'Concepto,Monto\n';
      csvContent += '"Compra de Equipos","-450000"\n';
      csvContent += '"Venta de Activos","120000"\n';
      csvContent += '"Inversiones","-200000"\n';
      csvContent += '"Efectivo de Actividades de Inversión","-530000"\n\n';
      
      // Actividades de Financiamiento
      csvContent += 'ACTIVIDADES DE FINANCIAMIENTO\n';
      csvContent += 'Concepto,Monto\n';
      csvContent += '"Préstamos Obtenidos","800000"\n';
      csvContent += '"Pago de Préstamos","-600000"\n';
      csvContent += '"Dividendos Pagados","-500000"\n';
      csvContent += '"Efectivo de Actividades de Financiamiento","-300000"\n\n';
      
      // Resumen
      csvContent += 'RESUMEN\n';
      csvContent += 'Concepto,Monto\n';
      csvContent += '"Aumento Neto en Efectivo","2510000"\n';
      csvContent += '"Efectivo al Inicio del Período","1200000"\n';
      csvContent += '"Efectivo al Final del Período","3710000"\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `flujo_efectivo_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Utilidad Neta</span>
                      <span className="font-medium">{formatCurrency(3400000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Depreciación</span>
                      <span className="font-medium">{formatCurrency(180000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cambios en Cuentas por Cobrar</span>
                      <span className="font-medium">{formatCurrency(-120000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cambios en Inventarios</span>
                      <span className="font-medium">{formatCurrency(-200000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cambios en Cuentas por Pagar</span>
                      <span className="font-medium">{formatCurrency(80000)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Efectivo de Actividades de Operación</span>
                      <span>{formatCurrency(3340000)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-purple-600">Actividades de Inversión</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Compra de Equipos</span>
                      <span className="font-medium">{formatCurrency(-450000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Venta de Activos</span>
                      <span className="font-medium">{formatCurrency(120000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inversiones</span>
                      <span className="font-medium">{formatCurrency(-200000)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Efectivo de Actividades de Inversión</span>
                      <span>{formatCurrency(-530000)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-orange-600">Actividades de Financiamiento</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Préstamos Obtenidos</span>
                      <span className="font-medium">{formatCurrency(800000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pago de Préstamos</span>
                      <span className="font-medium">{formatCurrency(-600000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dividendos Pagados</span>
                      <span className="font-medium">{formatCurrency(-500000)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Efectivo de Actividades de Financiamiento</span>
                      <span>{formatCurrency(-300000)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-gray-800 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between font-bold">
                      <span>Aumento Neto en Efectivo</span>
                      <span>{formatCurrency(2510000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efectivo al Inicio del Período</span>
                      <span>{formatCurrency(1200000)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Efectivo al Final del Período</span>
                      <span>{formatCurrency(3710000)}</span>
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
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8">
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
                    defaultValue="2024-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Estado
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ej: Balance General Enero 2025"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewStatementModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => generateStatement('balance_sheet')}
                  disabled={isGenerating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {isGenerating ? 'Generando...' : 'Generar Estado'}
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
