
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import BasicDashboard from './components/BasicDashboard';
import AdvancedKPIDashboard from './components/AdvancedKPIDashboard';
import FeatureGuard from '../../components/common/FeatureGuard';
import { usePlanLimitations } from '../../hooks/usePlanLimitations';
import { useAuth } from '../../hooks/useAuth';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<'basic' | 'advanced'>('advanced');
  const { checkFeatureAccess } = usePlanLimitations();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const hasAdvancedDashboard = checkFeatureAccess('hasAdvancedAnalytics');

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-700 to-navy-800 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-navy-200">Panel de control y métricas de tu empresa</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Dashboard Type Selector */}
              <div className="flex bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('advanced')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeView === 'advanced'
                      ? 'bg-white text-navy-700 shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <i className="ri-dashboard-3-line mr-2"></i>
                  KPI Avanzado
                </button>
                <button
                  onClick={() => setActiveView('basic')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeView === 'basic'
                      ? 'bg-white text-navy-700 shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <i className="ri-dashboard-line mr-2"></i>
                  Básico
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                <i className="ri-logout-box-line mr-2"></i>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        {activeView === 'advanced' ? (
          <AdvancedKPIDashboard />
        ) : (
          <BasicDashboard />
        )}
      </div>
    </DashboardLayout>
  );
}
