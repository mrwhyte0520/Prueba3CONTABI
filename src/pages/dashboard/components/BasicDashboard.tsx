
import { useState } from 'react';
import { FeatureGuard } from '../../../components/common/FeatureGuard';

export default function BasicDashboard() {
  return (
    <div className="space-y-6">
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-green-600">RD$ 125,450</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-green-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+12.5%</span>
            <span className="text-gray-500 ml-2">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gastos del Mes</p>
              <p className="text-2xl font-bold text-red-600">RD$ 78,320</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <i className="ri-shopping-cart-line text-red-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-red-600 font-medium">+8.2%</span>
            <span className="text-gray-500 ml-2">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilidad Neta</p>
              <p className="text-2xl font-bold text-blue-600">RD$ 47,130</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-line-chart-line text-blue-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">+15.3%</span>
            <span className="text-gray-500 ml-2">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Facturas Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">23</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <i className="ri-file-list-3-line text-orange-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-orange-600 font-medium">RD$ 89,450</span>
            <span className="text-gray-500 ml-2">por cobrar</span>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureGuard feature="advanced_analytics" fallback={
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <i className="ri-bar-chart-line text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500">Gráfico disponible en plan PRO</p>
              </div>
            </div>
          </div>
        }>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos vs Gastos</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <i className="ri-bar-chart-line text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500">Gráfico de barras aquí</p>
              </div>
            </div>
          </div>
        </FeatureGuard>

        <FeatureGuard feature="advanced_analytics" fallback={
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Gastos</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <i className="ri-pie-chart-line text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500">Gráfico disponible en plan PRO</p>
              </div>
            </div>
          </div>
        }>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Gastos</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <i className="ri-pie-chart-line text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500">Gráfico circular aquí</p>
              </div>
            </div>
          </div>
        </FeatureGuard>
      </div>

      {/* Alertas y Notificaciones */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertas Importantes</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <i className="ri-alert-line text-yellow-600 text-xl mr-3"></i>
            <div>
              <p className="text-sm font-medium text-yellow-800">5 facturas vencen en los próximos 7 días</p>
              <p className="text-xs text-yellow-600">Total: RD$ 45,230</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <i className="ri-error-warning-line text-red-600 text-xl mr-3"></i>
            <div>
              <p className="text-sm font-medium text-red-800">3 productos con stock bajo</p>
              <p className="text-xs text-red-600">Revisar inventario</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <i className="ri-information-line text-blue-600 text-xl mr-3"></i>
            <div>
              <p className="text-sm font-medium text-blue-800">Backup automático completado</p>
              <p className="text-xs text-blue-600">Última copia: Hoy 3:00 AM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
