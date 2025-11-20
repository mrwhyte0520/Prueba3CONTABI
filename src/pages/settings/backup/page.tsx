import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { settingsService, auditLogsService } from '../../../services/database';

interface BackupRecord {
  id: string;
  backup_type: string;
  backup_name: string;
  backup_date: string;
  file_size: number | null;
  status: string;
  created_at?: string;
}

export default function BackupSettingsPage() {
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [retentionDays, setRetentionDays] = useState(30);
  const [encryptBackups, setEncryptBackups] = useState(true);
  const [auditLogEnabled, setAuditLogEnabled] = useState(true);
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accountingSettings, setAccountingSettings] = useState<any | null>(null);
  const [history, setHistory] = useState<BackupRecord[]>([]);

  const handleDownloadAuditLog = async () => {
    try {
      const logs = await auditLogsService.exportLogs();
      const blob = new Blob([JSON.stringify(logs, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading audit log:', error);
      setMessage({ type: 'error', text: 'Error al descargar el log de auditoría' });
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [acc, backups] = await Promise.all([
          settingsService.getAccountingSettings(),
          settingsService.getBackups(),
        ]);
        if (acc) {
          setAccountingSettings(acc);
          setAutoBackup(acc.auto_backup ?? true);
          setBackupFrequency(acc.backup_frequency || 'daily');
          setRetentionDays(acc.retention_period ?? 30);
          setAuditLogEnabled(acc.audit_log_enabled ?? true);
          setAutoLogoutEnabled(acc.auto_logout_enabled ?? true);
        }
        setHistory(backups as BackupRecord[]);
      } catch (error) {
        console.error('Error loading backup settings:', error);
      }
    };

    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        ...(accountingSettings || {}),
        auto_backup: autoBackup,
        backup_frequency: backupFrequency,
        retention_period: retentionDays,
        audit_log_enabled: auditLogEnabled,
        auto_logout_enabled: autoLogoutEnabled,
      };
      await settingsService.saveAccountingSettings(payload);
      setAccountingSettings(payload);
      setMessage({ type: 'success', text: 'Configuración de respaldos guardada exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleBackupNow = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const backup = await settingsService.createBackup({
        backup_type: 'manual',
        backup_name: `Respaldo manual - ${new Date().toLocaleString()}`,
        retention_days: retentionDays,
      });
      setHistory((prev) => [backup as BackupRecord, ...prev]);
      setMessage({ type: 'success', text: 'Respaldo creado exitosamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al crear el respaldo' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (backup: BackupRecord) => {
    try {
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backup.backup_name || 'backup'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
    }
  };

  const handleDelete = async (backup: BackupRecord) => {
    if (!window.confirm('¿Eliminar este respaldo de forma permanente?')) return;
    try {
      await settingsService.deleteBackup(backup.id);
      setHistory((prev) => prev.filter((b) => b.id !== backup.id));
      setMessage({ type: 'success', text: 'Respaldo eliminado correctamente' });
    } catch (error) {
      console.error('Error deleting backup:', error);
      setMessage({ type: 'error', text: 'Error al eliminar el respaldo' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Respaldos y Seguridad</h1>
              <p className="text-gray-600 mt-1">
                Configura respaldos automáticos y políticas de seguridad
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.REACT_APP_NAVIGATE('/settings')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <i className="ri-arrow-left-line"></i>
                <span>Volver</span>
              </button>
              <button
                onClick={handleBackupNow}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <i className="ri-download-cloud-line"></i>
                <span>{loading ? 'Creando...' : 'Respaldar Ahora'}</span>
              </button>
            </div>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Backup Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Respaldos</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_backup"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_backup" className="ml-2 block text-sm text-gray-900">
                  Habilitar respaldos automáticos
                </label>
              </div>
              
              {autoBackup && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frecuencia de Respaldo
                    </label>
                    <select
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="hourly">Cada hora</option>
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Período de Retención (días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="encrypt_backups"
                  checked={encryptBackups}
                  onChange={(e) => setEncryptBackups(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="encrypt_backups" className="ml-2 block text-sm text-gray-900">
                  Encriptar respaldos
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Seguridad</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Registro de Auditoría</h3>
                    <p className="text-xs text-gray-500">Habilitar logs de actividad</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleDownloadAuditLog}
                      className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                    >
                      Descargar log (JSON)
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={auditLogEnabled}
                        onChange={(e) => setAuditLogEnabled(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Sesiones Automáticas</h3>
                    <p className="text-xs text-gray-500">Cerrar sesión automáticamente</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={autoLogoutEnabled}
                      onChange={(e) => setAutoLogoutEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => window.REACT_APP_NAVIGATE('/settings')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        {/* Backup History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Historial de Respaldos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((backup) => (
                  <tr key={backup.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(backup.backup_date || backup.created_at || '').toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backup.file_size ? `${(backup.file_size / (1024 * 1024)).toFixed(2)} MB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {backup.status || 'Completado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(backup)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-download-line"></i>
                        </button>
                        <button
                          type="button"
                          className="text-green-400 cursor-not-allowed"
                          title="Restaurar (próximamente)"
                          disabled
                        >
                          <i className="ri-refresh-line"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(backup)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <i className="ri-delete-bin-line"></i>
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
    </DashboardLayout>
  );
}