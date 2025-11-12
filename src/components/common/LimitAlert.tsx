import { usePlanLimitations } from '../../hooks/usePlanLimitations';
import { Link } from 'react-router-dom';

interface LimitAlertProps {
  feature: 'maxCompanies' | 'maxUsers' | 'maxProducts' | 'maxEmployees';
  currentCount: number;
  itemName?: string;
  showWhenNearLimit?: boolean;
  warningThreshold?: number;
}

export default function LimitAlert({ 
  feature, 
  currentCount, 
  itemName,
  showWhenNearLimit = true,
  warningThreshold = 0.8 
}: LimitAlertProps) {
  const { checkQuantityLimit, currentPlan } = usePlanLimitations();
  
  const { allowed, limit, message } = checkQuantityLimit(feature, currentCount);
  
  // Si es ilimitado, no mostrar alerta
  if (limit === -1) {
    return null;
  }
  
  // Calcular si está cerca del límite
  const isNearLimit = currentCount >= (limit * warningThreshold);
  const isAtLimit = !allowed;
  
  // No mostrar si no está cerca del límite y no se solicita mostrar
  if (!isNearLimit && !isAtLimit && !showWhenNearLimit) {
    return null;
  }
  
  const getAlertType = () => {
    if (isAtLimit) return 'error';
    if (isNearLimit) return 'warning';
    return 'info';
  };
  
  const getAlertStyles = () => {
    const type = getAlertType();
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };
  
  const getIcon = () => {
    const type = getAlertType();
    switch (type) {
      case 'error':
        return 'ri-error-warning-line';
      case 'warning':
        return 'ri-alarm-warning-line';
      default:
        return 'ri-information-line';
    }
  };
  
  const getTitle = () => {
    if (isAtLimit) return 'Límite Alcanzado';
    if (isNearLimit) return 'Cerca del Límite';
    return 'Información del Límite';
  };
  
  const getMessage = () => {
    if (isAtLimit) {
      return message || `Has alcanzado el límite de ${limit} ${itemName || 'elementos'}.`;
    }
    if (isNearLimit) {
      return `Estás usando ${currentCount} de ${limit} ${itemName || 'elementos'} disponibles en tu plan ${currentPlan}.`;
    }
    return `Tienes ${currentCount} de ${limit} ${itemName || 'elementos'} en tu plan ${currentPlan}.`;
  };

  return (
    <div className={`rounded-lg border p-4 ${getAlertStyles()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <i className={`${getIcon()} text-xl`}></i>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold">
            {getTitle()}
          </h3>
          <p className="text-sm mt-1">
            {getMessage()}
          </p>
          
          {(isAtLimit || isNearLimit) && (
            <div className="mt-3">
              <Link
                to="/plans"
                className="inline-flex items-center text-sm font-medium hover:underline"
              >
                <i className="ri-arrow-up-line mr-1"></i>
                Actualizar Plan
              </Link>
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 ml-4">
          <div className="text-right">
            <div className="text-lg font-bold">
              {currentCount}/{limit === -1 ? '∞' : limit}
            </div>
            <div className="text-xs opacity-75">
              {itemName || 'elementos'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Barra de progreso */}
      <div className="mt-3">
        <div className="bg-white bg-opacity-50 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-orange-500' 
                : 'bg-blue-500'
            }`}
            style={{ 
              width: `${Math.min((currentCount / limit) * 100, 100)}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}