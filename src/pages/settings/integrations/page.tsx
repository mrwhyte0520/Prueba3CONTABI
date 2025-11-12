import { useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
}

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'banco_popular',
      name: 'Banco Popular Dominicano',
      description: 'Sincronización automática de transacciones bancarias',
      icon: 'ri-bank-line',
      status: 'disconnected'
    },
    {
      id: 'banco_bhd',
      name: 'Banco BHD León',
      description: 'Importar estados de cuenta y movimientos',
      icon: 'ri-bank-line',
      status: 'disconnected'
    },
    {
      id: 'dgii',
      name: 'DGII - Dirección General de Impuestos Internos',
      description: 'Envío automático de declaraciones fiscales',
      icon: 'ri-government-line',
      status: 'disconnected'
    },
    {
      id: 'tss',
      name: 'TSS - Tesorería de la Seguridad Social',
      description: 'Declaraciones de nómina y seguridad social',
      icon: 'ri-shield-check-line',
      status: 'disconnected'
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Importar/exportar datos contables',
      icon: 'ri-file-chart-line',
      status: 'disconnected'
    },
    {
      id: 'excel',
      name: 'Microsoft Excel',
      description: 'Exportar reportes a hojas de cálculo',
      icon: 'ri-file-excel-line',
      status: 'connected',
      lastSync: '2024-01-15 10:30:00'
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConnect = async (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowModal(true);
  };

  const handleDisconnect = async (integrationId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      // Simular desconexión
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIntegrations(prev => 
        prev.map(int => 
          int.id === integrationId 
            ? { ...int, status: 'disconnected' as const, lastSync: undefined }
            : int
        )
      );
      
      setMessage({ type: 'success', text: 'Integración desconectada exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al desconectar la integración' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration) return;

    setLoading(true);
    setMessage(null);

    try {
      // Simular conexión
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIntegrations(prev => 
        prev.map(int => 
          int.id === selectedIntegration.id 
            ? { ...int, status: 'connected' as const, lastSync: new Date().toISOString() }
            : int
        )
      );
      
      setMessage({ type: 'success', text: 'Integración conectada exitosamente' });
      setShowModal(false);
      setSelectedIntegration(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al conectar la integración' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'error':
        return 'Error';
      default:
        return 'Desconectado';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
              <p className="text-gray-600 mt-1">
                Configura conexiones con bancos, APIs y servicios externos
              </p>
            </div>
            <button
              onClick={() => window.REACT_APP_NAVIGATE('/settings')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <i className="ri-arrow-left-line"></i>
              <span>Volver a Configuración</span>
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className={`${integration.icon} text-blue-600 text-lg`}></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                      {getStatusText(integration.status)}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {integration.description}
              </p>
              
              {integration.lastSync && (
                <p className="text-xs text-gray-500 mb-4">
                  Última sincronización: {new Date(integration.lastSync).toLocaleString()}
                </p>
              )}
              
              <div className="flex space-x-2">
                {integration.status === 'connected' ? (
                  <>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={loading}
                      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      Desconectar
                    </button>
                    <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm">
                      Sincronizar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(integration)}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                  >
                    Conectar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* API Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de API</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Base de API
              </label>
              <input
                type="url"
                placeholder="https://api.contabi.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clave de API
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Guardar Configuración
            </button>
          </div>
        </div>

        {/* Webhook Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Webhooks</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notificaciones de Facturación</h3>
                <p className="text-xs text-gray-500">Recibir notificaciones cuando se creen nuevas facturas</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Alertas de Inventario</h3>
                <p className="text-xs text-gray-500">Notificar cuando el stock esté bajo</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Modal */}
      {showModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Conectar {selectedIntegration.name}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitConnection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario/ID de Cliente
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña/Clave de API
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="save_credentials"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="save_credentials" className="ml-2 block text-sm text-gray-900">
                  Guardar credenciales de forma segura
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Conectando...' : 'Conectar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}