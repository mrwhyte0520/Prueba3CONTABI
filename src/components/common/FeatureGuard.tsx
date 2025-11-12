import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePlanLimitations } from '../../hooks/usePlanLimitations';

interface FeatureGuardProps {
  children: ReactNode;
  feature: keyof import('../../hooks/usePlanLimitations').PlanLimitations;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGuard({ 
  children, 
  feature, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGuardProps) {
  const { checkFeatureAccess, getUpgradeMessage, currentPlan } = usePlanLimitations();

  const hasAccess = checkFeatureAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <i className="ri-lock-line text-4xl text-gray-400 mb-3"></i>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Función No Disponible
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {getUpgradeMessage()}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-center mb-2">
            <i className="ri-vip-crown-line text-blue-500 mr-2"></i>
            <span className="font-semibold text-gray-700">Plan Actual</span>
          </div>
          <div className="text-lg font-bold text-blue-600">
            {currentPlan}
          </div>
        </div>

        <Link
          to="/plans"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 whitespace-nowrap"
        >
          <i className="ri-arrow-up-line mr-2"></i>
          Actualizar Plan
        </Link>

        <p className="text-xs text-gray-500 mt-3">
          Mejora tu plan para acceder a todas las funciones
        </p>
      </div>
    </div>
  );
}

export default FeatureGuard;
