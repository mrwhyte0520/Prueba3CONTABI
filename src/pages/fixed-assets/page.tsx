import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';

export default function FixedAssetsPage() {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Registro de Activos',
      description: 'Registro y mantenimiento de activos fijos',
      icon: 'ri-building-line',
      href: '/fixed-assets/register',
      color: 'blue'
    },
    {
      title: 'Tipos de Activos',
      description: 'Configuración de categorías de activos',
      icon: 'ri-list-check-line',
      href: '/fixed-assets/types',
      color: 'green'
    },
    {
      title: 'Depreciación',
      description: 'Cálculo y registro de depreciaciones',
      icon: 'ri-line-chart-line',
      href: '/fixed-assets/depreciation',
      color: 'purple'
    },
    {
      title: 'Revalorización',
      description: 'Revalorización de activos fijos',
      icon: 'ri-trending-up-line',
      href: '/fixed-assets/revaluation',
      color: 'orange'
    },
    {
      title: 'Retiro de Activos',
      description: 'Proceso de baja de activos fijos',
      icon: 'ri-delete-bin-line',
      href: '/fixed-assets/disposal',
      color: 'red'
    }
  ];

  const assetsStats = [
    {
      title: 'Valor Total de Activos',
      value: 'RD$ 8,450,000',
      change: '+3.2%',
      icon: 'ri-building-line',
      color: 'blue'
    },
    {
      title: 'Depreciación Acumulada',
      value: 'RD$ 2,150,000',
      change: '+5.8%',
      icon: 'ri-line-chart-line',
      color: 'red'
    },
    {
      title: 'Valor Neto',
      value: 'RD$ 6,300,000',
      change: '+2.1%',
      icon: 'ri-money-dollar-circle-line',
      color: 'green'
    },
    {
      title: 'Total de Activos',
      value: '245',
      change: '+8',
      icon: 'ri-archive-line',
      color: 'purple'
    }
  ];

  const assetsByCategory = [
    {
      category: 'Edificios y Construcciones',
      count: 15,
      value: 'RD$ 4,200,000',
      depreciation: '2%'
    },
    {
      category: 'Maquinaria y Equipo',
      count: 45,
      value: 'RD$ 2,800,000',
      depreciation: '10%'
    },
    {
      category: 'Vehículos',
      count: 12,
      value: 'RD$ 850,000',
      depreciation: '20%'
    },
    {
      category: 'Mobiliario y Equipo de Oficina',
      count: 85,
      value: 'RD$ 450,000',
      depreciation: '10%'
    },
    {
      category: 'Equipo de Computación',
      count: 88,
      value: 'RD$ 150,000',
      depreciation: '25%'
    }
  ];

  const recentDepreciations = [
    {
      asset: 'Edificio Principal',
      code: 'ACT-001',
      monthlyDepreciation: 'RD$ 7,000',
      accumulatedDepreciation: 'RD$ 420,000',
      date: '01/01/2024'
    },
    {
      asset: 'Maquinaria Industrial A',
      code: 'ACT-045',
      monthlyDepreciation: 'RD$ 2,333',
      accumulatedDepreciation: 'RD$ 140,000',
      date: '01/01/2024'
    },
    {
      asset: 'Vehículo Toyota Hilux',
      code: 'ACT-123',
      monthlyDepreciation: 'RD$ 1,417',
      accumulatedDepreciation: 'RD$ 85,000',
      date: '01/01/2024'
    }
  ];

  // Module Access Functions
  const handleAccessModule = (moduleHref: string, moduleName: string) => {
    navigate(moduleHref);
  };

  // Navigation Functions
  const handleViewAllDepreciations = () => {
    alert('Viewing all depreciations...');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulo de Activos Fijos</h1>
          <p className="text-gray-600">Gestión integral de activos fijos y depreciaciones</p>
        </div>

        {/* Assets Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assetsStats.map((stat, index) => (
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
                <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
              </div>
            </div>
          ))}
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
                onClick={() => handleAccessModule(module.href, module.title)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Acceder
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets by Category */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Activos por Categoría</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {assetsByCategory.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{category.category}</p>
                      <p className="text-sm text-gray-600">{category.count} activos</p>
                      <p className="text-xs text-gray-500">Depreciación: {category.depreciation} anual</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{category.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Depreciations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Depreciaciones del Mes</h3>
                <button 
                  onClick={handleViewAllDepreciations}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium whitespace-nowrap"
                >
                  Ver todas
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentDepreciations.map((depreciation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{depreciation.asset}</p>
                      <p className="text-sm text-gray-600">Código: {depreciation.code}</p>
                      <p className="text-xs text-gray-500">Acumulada: {depreciation.accumulatedDepreciation}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{depreciation.monthlyDepreciation}</p>
                      <p className="text-xs text-gray-500">{depreciation.date}</p>
                    </div>
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