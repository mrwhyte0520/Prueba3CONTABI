
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { taxService } from '../../services/database';

export default function TaxesPage() {
  const navigate = useNavigate();
  const [taxStats, setTaxStats] = useState({
    itbis_cobrado: 0,
    itbis_pagado: 0,
    itbis_neto: 0,
    retenciones: 0
  });
  const [ncfSeries, setNcfSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [stats, series] = await Promise.all([
        taxService.getTaxStatistics(),
        taxService.getNcfSeries()
      ]);
      setTaxStats(stats);
      setNcfSeries(series);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      title: 'Configuración de Impuestos',
      description: 'Configurar tasas y parámetros fiscales',
      icon: 'ri-settings-line',
      href: '/taxes/configuration',
      color: 'blue'
    },
    {
      title: 'Gestión NCF/E-CF',
      description: 'Mantenimiento de secuencias fiscales',
      icon: 'ri-file-shield-line',
      href: '/taxes/ncf',
      color: 'green'
    },
    {
      title: 'Series Fiscales',
      description: 'Gestionar series de documentos fiscales',
      icon: 'ri-list-ordered-line',
      href: '/taxes/fiscal-series',
      color: 'purple'
    },
    {
      title: 'Reporte 606',
      description: 'Reporte de compras y servicios',
      icon: 'ri-file-chart-line',
      href: '/taxes/report-606',
      color: 'orange'
    },
    {
      title: 'Reporte 607',
      description: 'Reporte de ventas y servicios',
      icon: 'ri-file-chart-2-line',
      href: '/taxes/report-607',
      color: 'red'
    },
    {
      title: 'Reporte 608',
      description: 'Reporte de documentos cancelados',
      icon: 'ri-file-damage-line',
      href: '/taxes/report-608',
      color: 'indigo'
    },
    {
      title: 'Reporte 623',
      description: 'Reporte de pagos al exterior',
      icon: 'ri-global-line',
      href: '/taxes/report-623',
      color: 'pink'
    },
    {
      title: 'Reporte IT-1',
      description: 'Declaración mensual del ITBIS',
      icon: 'ri-calendar-check-line',
      href: '/taxes/report-it1',
      color: 'teal'
    },
    {
      title: 'Reporte IR-17',
      description: 'Reporte de retenciones de ISR',
      icon: 'ri-percent-line',
      href: '/taxes/report-ir17',
      color: 'cyan'
    },
    {
      title: 'Formulario 607',
      description: 'Registro de ventas con comprobantes fiscales NCF según DGII',
      icon: 'ri-file-list-3-line',
      href: '/taxes/formulario-607',
      color: 'purple'
    }
  ];

  const taxStatsDisplay = [
    {
      title: 'ITBIS Cobrado',
      value: `RD$ ${taxStats.itbis_cobrado.toLocaleString('es-DO')}`,
      change: '+12%',
      icon: 'ri-money-dollar-circle-line',
      color: 'green'
    },
    {
      title: 'ITBIS Pagado',
      value: `RD$ ${taxStats.itbis_pagado.toLocaleString('es-DO')}`,
      change: '+8%',
      icon: 'ri-bank-card-line',
      color: 'blue'
    },
    {
      title: 'ITBIS Neto a Pagar',
      value: `RD$ ${taxStats.itbis_neto.toLocaleString('es-DO')}`,
      change: '+15%',
      icon: 'ri-calculator-line',
      color: 'orange'
    },
    {
      title: 'Retenciones',
      value: `RD$ ${taxStats.retenciones.toLocaleString('es-DO')}`,
      change: '+5%',
      icon: 'ri-percent-line',
      color: 'purple'
    }
  ];

  const documentTypes = [
    { value: 'B01', label: 'B01 - Crédito Fiscal' },
    { value: 'B02', label: 'B02 - Consumidor Final' },
    { value: 'B14', label: 'B14 - Régimen Especial' },
    { value: 'B15', label: 'B15 - Gubernamental' },
    { value: 'B16', label: 'B16 - Exportaciones' }
  ];

  const fiscalDocuments = ncfSeries.map(series => ({
    type: documentTypes.find(t => t.value === series.document_type)?.label || series.document_type,
    series: series.series_prefix,
    current: series.current_number.toString().padStart(8, '0'),
    remaining: series.end_number - series.current_number + 1,
    status: series.status === 'active' ? 'Activo' : 'Inactivo'
  }));

  const upcomingDeadlines = [
    {
      report: 'IT-1 Febrero 2024',
      dueDate: '20/03/2024',
      daysLeft: 5,
      priority: 'High'
    },
    {
      report: 'Reporte 607 Febrero',
      dueDate: '29/03/2024',
      daysLeft: 14,
      priority: 'Medium'
    },
    {
      report: 'IR-17 Retenciones',
      dueDate: '15/03/2024',
      daysLeft: 0,
      priority: 'Urgent'
    }
  ];

  const handleAccessModule = (moduleHref: string) => {
    navigate(moduleHref);
  };

  const handleGenerateReport = (reportName: string) => {
    if (reportName.includes('IT-1')) {
      navigate('/taxes/report-it1');
    } else if (reportName.includes('607')) {
      navigate('/taxes/report-607');
    } else if (reportName.includes('IR-17')) {
      navigate('/taxes/report-ir17');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo de Gestión Fiscal</h1>
          <p className="text-gray-600">Sistema completo de cumplimiento fiscal para República Dominicana</p>
        </div>

        {/* Tax Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {taxStatsDisplay.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                  <i className={`${stat.icon} text-xl text-${stat.color}-600`}></i>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm font-medium text-green-600">{stat.change}</span>
                <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
              </div>
            </div>
          ))}
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${module.color}-100 mr-4`}>
                  <i className={`${module.icon} text-xl text-${module.color}-600`}></i>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
              <p className="text-gray-600 mb-4 text-sm">{module.description}</p>
              <button 
                onClick={() => handleAccessModule(module.href)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Acceder
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fiscal Documents Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Estado de Series Fiscales</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {fiscalDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{doc.type}</p>
                      <p className="text-sm text-gray-600">Serie: {doc.series}</p>
                      <p className="text-xs text-gray-500">Actual: {doc.current}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{doc.remaining}</p>
                      <p className="text-xs text-gray-500">disponibles</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        doc.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
                {fiscalDocuments.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <i className="ri-file-shield-line text-4xl text-gray-300 mb-2"></i>
                    <p>No hay series fiscales configuradas</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => navigate('/taxes/ncf')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Configurar Series NCF
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Próximos Vencimientos Fiscales</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    deadline.priority === 'Urgent' ? 'bg-red-50 border-red-200' :
                    deadline.priority === 'High' ? 'bg-orange-50 border-orange-200' :
                    'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        deadline.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                        deadline.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {deadline.priority === 'Urgent' ? 'Urgente' :
                         deadline.priority === 'High' ? 'Alto' : 'Medio'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {deadline.daysLeft === 0 ? 'Vence Hoy' : `${deadline.daysLeft} días`}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{deadline.report}</p>
                    <p className="text-sm text-gray-600">Vence: {deadline.dueDate}</p>
                    <button 
                      onClick={() => handleGenerateReport(deadline.report)}
                      className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                    >
                      Generar Reporte
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
