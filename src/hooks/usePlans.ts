
import { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  active: boolean;
}

interface TrialInfo {
  isActive: boolean;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  startDate: Date;
  endDate: Date;
  hasExpired: boolean;
}

export function usePlans() {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo>({
    isActive: true,
    daysLeft: 15,
    hoursLeft: 0,
    minutesLeft: 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    hasExpired: false
  });

  // Función para calcular el tiempo restante
  const calculateTimeLeft = (endDate: Date) => {
    const now = new Date();
    const timeLeft = endDate.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return {
        daysLeft: 0,
        hoursLeft: 0,
        minutesLeft: 0,
        isActive: false,
        hasExpired: true
      };
    }

    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return {
      daysLeft,
      hoursLeft,
      minutesLeft,
      isActive: timeLeft > 0,
      hasExpired: false
    };
  };

  // Inicializar o recuperar información del trial
  useEffect(() => {
    const initializeTrial = () => {
      const savedTrialInfo = localStorage.getItem('contard_trial_info');
      const savedPlan = localStorage.getItem('contard_current_plan');
      
      // Cargar plan actual si existe
      if (savedPlan) {
        try {
          const plan = JSON.parse(savedPlan);
          setCurrentPlan(plan);
        } catch (error) {
          console.error('Error parsing saved plan:', error);
          localStorage.removeItem('contard_current_plan');
        }
      }

      if (savedTrialInfo) {
        try {
          const parsed = JSON.parse(savedTrialInfo);
          const endDate = new Date(parsed.endDate);
          const startDate = new Date(parsed.startDate);
          
          // Validar que las fechas sean válidas
          if (isNaN(endDate.getTime()) || isNaN(startDate.getTime())) {
            throw new Error('Invalid dates');
          }

          const timeLeft = calculateTimeLeft(endDate);
          
          setTrialInfo({
            startDate,
            endDate,
            ...timeLeft
          });
        } catch (error) {
          console.error('Error parsing trial info:', error);
          // Si hay error, iniciar nuevo trial
          startNewTrial();
        }
      } else {
        // Primera vez - iniciar trial
        startNewTrial();
      }
    };

    const startNewTrial = () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      
      const newTrialInfo = {
        isActive: true,
        daysLeft: 15,
        hoursLeft: 0,
        minutesLeft: 0,
        startDate,
        endDate,
        hasExpired: false
      };
      
      localStorage.setItem('contard_trial_info', JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }));
      
      setTrialInfo(newTrialInfo);
    };

    initializeTrial();
  }, []);

  // Actualizar contador cada minuto
  useEffect(() => {
    const updateTimer = () => {
      if (trialInfo.endDate && !currentPlan?.active) {
        const timeLeft = calculateTimeLeft(trialInfo.endDate);
        
        setTrialInfo(prev => ({
          ...prev,
          ...timeLeft
        }));

        // Si el trial expiró, limpiar cualquier acceso
        if (timeLeft.hasExpired) {
          localStorage.setItem('contard_trial_expired', 'true');
        }
      }
    };

    // Actualizar inmediatamente
    updateTimer();

    // Actualizar cada minuto
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [trialInfo.endDate, currentPlan?.active]);

  const subscribeToPlan = async (planId: string) => {
    try {
      // Verificar que el trial no haya expirado antes de permitir suscripción
      if (trialInfo.hasExpired && !currentPlan?.active) {
        return { 
          success: false, 
          error: 'El período de prueba ha expirado. Debe completar el pago para continuar.' 
        };
      }

      console.log('Subscribing to plan:', planId);
      
      const plan: Plan = {
        id: planId,
        name: planId.toUpperCase(),
        price: getPlanPrice(planId),
        features: getPlanFeatures(planId),
        active: true
      };
      
      setCurrentPlan(plan);
      
      // Marcar trial como completado (no expirado, sino completado por suscripción)
      setTrialInfo(prev => ({
        ...prev,
        isActive: false,
        hasExpired: false
      }));
      
      localStorage.setItem('contard_current_plan', JSON.stringify(plan));
      localStorage.removeItem('contard_trial_expired');
      
      return { success: true };
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      return { success: false, error: 'Error al procesar la suscripción' };
    }
  };

  const cancelSubscription = async () => {
    try {
      setCurrentPlan(null);
      localStorage.removeItem('contard_current_plan');
      
      // NO iniciar nuevo trial automáticamente al cancelar
      // El usuario debe contactar soporte o pagar nuevamente
      setTrialInfo(prev => ({
        ...prev,
        isActive: false,
        hasExpired: true,
        daysLeft: 0,
        hoursLeft: 0,
        minutesLeft: 0
      }));
      
      localStorage.setItem('contard_trial_expired', 'true');
      
      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return { success: false, error: 'Error al cancelar la suscripción' };
    }
  };

  const hasAccess = () => {
    // Tiene acceso si tiene plan activo O si el trial está activo y no ha expirado
    return (currentPlan?.active === true) || (trialInfo.isActive && !trialInfo.hasExpired);
  };

  const canSelectPlan = () => {
    // Puede seleccionar plan si tiene plan activo O si el trial no ha expirado
    return (currentPlan?.active === true) || !trialInfo.hasExpired;
  };

  const getTrialStatus = () => {
    if (currentPlan?.active) {
      return 'subscribed';
    }
    
    if (trialInfo.hasExpired) {
      return 'expired';
    }
    
    if (trialInfo.daysLeft <= 3) {
      return 'warning';
    }
    
    return 'active';
  };

  const getPlanPrice = (planId: string): number => {
    const prices: Record<string, number> = {
      'pyme': 19.97,
      'pro': 49.97,
      'plus': 99.97,
      'student': 49.97
    };
    return prices[planId] || 0;
  };

  const getPlanFeatures = (planId: string): string[] => {
    const features: Record<string, string[]> = {
      'pyme': [
        'Una empresa', 
        'Facturación básica con NCF', 
        'Dashboard básico',
        'Reportes DGII básicos', 
        'Inventario limitado (500 productos)',
        '2 usuarios'
      ],
      'pro': [
        '3 empresas', 
        'Contabilidad completa', 
        'Dashboard básico',
        'Gestión bancaria básica', 
        'Inventario limitado (2,000 productos)',
        'Nómina básica (10 empleados)',
        '5 usuarios'
      ],
      'plus': [
        'Empresas ilimitadas', 
        'Todas las funciones contables', 
        'Dashboard KPI avanzado',
        'Inventario ilimitado',
        'Nómina completa',
        'Análisis financiero avanzado',
        'Usuarios ilimitados'
      ],
      'student': [
        'Empresas ilimitadas', 
        'Todas las funciones contables', 
        'Dashboard KPI avanzado',
        'Inventario ilimitado',
        'Nómina completa',
        'Análisis financiero avanzado',
        'Válido con ID estudiantil',
        'Usuarios ilimitados'
      ]
    };
    return features[planId] || [];
  };

  return {
    currentPlan,
    trialInfo,
    subscribeToPlan,
    cancelSubscription,
    hasAccess,
    canSelectPlan,
    getTrialStatus
  };
}
