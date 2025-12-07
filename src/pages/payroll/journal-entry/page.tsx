import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { chartAccountsService, journalEntriesService, resolveTenantId } from '../../../services/database';

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: string;
}

interface PayrollJournalEntry {
  account: string;
  debit: number;
  credit: number;
  description: string;
}

export default function PayrollJournalEntryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [journalEntries, setJournalEntries] = useState<PayrollJournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, [user]);

  useEffect(() => {
    if (selectedPeriod) {
      generateJournalEntries();
    }
  }, [selectedPeriod]);

  const loadPeriods = async () => {
    if (!user) return;
    try {
      const tenantId = await resolveTenantId(user.id);
      if (!tenantId) {
        setPeriods([]);
        return;
      }

      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('user_id', tenantId)
        // Soportar tanto estados en inglés como en español por compatibilidad
        .in('status', ['closed', 'paid', 'cerrado', 'pagado'])
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      if (data) setPeriods(data);
    } catch (error) {
      console.error('Error loading periods:', error);
    }
  };

  const generateJournalEntries = async () => {
    if (!selectedPeriod) return;
    
    setLoading(true);
    try {
      const period = periods.find(p => p.id === selectedPeriod);
      if (!period) return;

      // Generar asientos contables para la nómina
      // Usamos códigos alineados con el catálogo base:
      // 6101 - Sueldos y Salarios (gasto)
      // 2102 - Retenciones TSS por Pagar (pasivo)
      // 2101 - Nómina por Pagar (pasivo)
      const entries = [
        {
          account: '6101 - Sueldos y Salarios',
          debit: period.total_gross,
          credit: 0,
          description: `Registro de sueldos - ${period.period_name}`
        },
        {
          account: '2102 - Retenciones TSS por Pagar',
          debit: 0,
          credit: period.total_deductions,
          description: `Retenciones TSS - ${period.period_name}`
        },
        {
          account: '2101 - Nómina por Pagar',
          debit: 0,
          credit: period.total_net,
          description: `Nómina neta por pagar - ${period.period_name}`
        }
      ];

      setJournalEntries(entries);
    } catch (error) {
      console.error('Error generating journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const postToGeneralLedger = async () => {
    if (!selectedPeriod || journalEntries.length === 0) {
      alert('No hay asientos para contabilizar');
      return;
    }

    if (!user?.id) {
      alert('Debes iniciar sesión para contabilizar la nómina');
      return;
    }

    if (!confirm('¿Desea contabilizar estos asientos en el libro mayor?')) return;

    setLoading(true);
    try {
      const period = periods.find(p => p.id === selectedPeriod);
      if (!period) {
        alert('No se encontró el período de nómina seleccionado');
        return;
      }

      const totalDebit = journalEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = journalEntries.reduce((sum, e) => sum + e.credit, 0);

      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        alert('El asiento de nómina no está balanceado. Verifique los montos.');
        return;
      }

      // Mapear códigos de cuenta a IDs reales del catálogo de cuentas
      const accounts = await chartAccountsService.getAll(user.id);
      const accountsByCode = new Map<string, string>();
      (accounts || []).forEach((acc: any) => {
        if (acc.code && acc.id) {
          accountsByCode.set(String(acc.code), String(acc.id));
        }
      });

      const lines = journalEntries.map((entry, index) => {
        const [codePart] = String(entry.account).split(' - ');
        const code = codePart.trim();
        const accountId = accountsByCode.get(code);

        if (!accountId) {
          throw new Error(`No se encontró en el catálogo la cuenta contable con código ${code} para la nómina.`);
        }

        return {
          account_id: accountId,
          description: entry.description,
          debit_amount: entry.debit,
          credit_amount: entry.credit,
          line_number: index + 1,
        };
      });

      const today = new Date().toISOString().split('T')[0];
      const entryNumber = `NOM-${today}-${String(period.id).slice(0, 6)}`;

      await journalEntriesService.createWithLines(user.id, {
        entry_number: entryNumber,
        entry_date: today,
        description: `Asiento de nómina del período ${period.period_name}`,
        reference: `Nómina - ${period.period_name}`,
        status: 'posted',
      }, lines);

      alert('Asientos de nómina contabilizados correctamente en el libro mayor');
      setJournalEntries([]);
      setSelectedPeriod('');
    } catch (error) {
      console.error('Error posting to general ledger:', error);
      alert('Error al contabilizar los asientos');
    } finally {
      setLoading(false);
    }
  };

  const totalDebit = journalEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = journalEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Entrada al Diario de Nómina</h1>
            <p className="text-gray-600">Contabilización de nómina en el libro mayor</p>
          </div>
          <button
            onClick={() => navigate('/payroll')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Volver
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Período de Nómina
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar período --</option>
              {periods.map(period => (
                <option key={period.id} value={period.id}>
                  {period.period_name} - {period.status}
                </option>
              ))}
            </select>
          </div>

          {selectedPeriod && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <i className="ri-information-line mr-2"></i>
                Se generarán los asientos contables para contabilizar esta nómina en el libro mayor
              </p>
            </div>
          )}
        </div>

        {journalEntries.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Asientos Contables Generados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débito</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {journalEntries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.account}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{entry.description}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                          {entry.debit > 0 ? `RD$ ${entry.debit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                          {entry.credit > 0 ? `RD$ ${entry.credit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={2} className="px-6 py-4 text-sm text-gray-900 text-right">TOTALES</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        RD$ {totalDebit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        RD$ {totalCredit.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isBalanced ? (
                      <div className="flex items-center text-green-600">
                        <i className="ri-checkbox-circle-fill text-xl mr-2"></i>
                        <span className="font-semibold">Asiento Balanceado</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <i className="ri-error-warning-fill text-xl mr-2"></i>
                        <span className="font-semibold">Asiento Desbalanceado</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Diferencia: RD$ {Math.abs(totalDebit - totalCredit).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  onClick={postToGeneralLedger}
                  disabled={!isBalanced || loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <i className="ri-send-plane-line mr-2"></i>
                  Contabilizar en Libro Mayor
                </button>
              </div>
            </div>
          </>
        )}

        {selectedPeriod && journalEntries.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <i className="ri-file-list-line text-5xl text-gray-400 mb-4"></i>
            <p className="text-gray-600">Generando asientos contables...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
