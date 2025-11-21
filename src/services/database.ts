
import { supabase } from '../lib/supabase';

// Error handling wrapper
const handleDatabaseError = (error: any, fallbackData: any = []) => {
  console.warn('Database operation failed:', error?.message ?? error);
  return fallbackData;
};

/* ==========================================================
   Referrals Service
========================================================== */
export const referralsService = {
  async getOrCreateCode(userId: string) {
    try {
      // Try get existing code
      const { data: existing, error: getErr } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (!getErr && existing) return existing;

      const code = Math.random().toString(36).slice(2, 8) + userId.slice(0, 4);
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({ user_id: userId, code })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('referralsService.getOrCreateCode error', e);
      throw e;
    }
  },

  async recordVisit(refCode: string) {
    try {
      const payload:any = { ref_code: refCode };
      if (typeof window !== 'undefined') {
        payload.user_agent = navigator.userAgent;
        // Basic fingerprint: day + UA
        payload.fingerprint = `${new Date().toISOString().slice(0,10)}_${navigator.userAgent.slice(0,64)}`;
      }
      await supabase.from('referral_visits').insert(payload);
    } catch (e) {
      console.warn('referralsService.recordVisit warn', e);
    }
  },

  async getStats(userId: string) {
    try {
      // Get code
      const { data: codeRow } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .maybeSingle();
      const code = codeRow?.code || '';
      if (!code) return { code: '', visits: 0, purchases: 0, pending: 0, paid: 0 };

      const [{ data: visitRows }, { data: commissions }] = await Promise.all([
        supabase
          .from('referral_visits')
          .select('id,fingerprint')
          .eq('ref_code', code),
        supabase.from('referral_commissions').select('amount,status').eq('ref_code', code)
      ]);

      // Contar visitas únicas por fingerprint (o id si no hay fingerprint)
      const uniqueVisitKeys = new Set(
        (visitRows || []).map((v: any) => v.fingerprint || v.id)
      );
      const visits = uniqueVisitKeys.size;

      let pending = 0, paid = 0, purchases = 0;
      (commissions || []).forEach((c: any) => {
        if (c.status === 'pending') { pending += Number(c.amount)||0; purchases++; }
        if (c.status === 'paid') { paid += Number(c.amount)||0; purchases++; }
      });
      return { code, visits, purchases, pending, paid };
    } catch (e) {
      console.error('referralsService.getStats error', e);
      return { code: '', visits: 0, purchases: 0, pending: 0, paid: 0 };
    }
  },

  async requestPayout(userId: string, paypalEmail: string, amount: number, currency = 'USD') {
    try {
      const { data, error } = await supabase
        .from('referral_payouts')
        .insert({ user_id: userId, paypal_email: paypalEmail, amount, currency, status: 'requested' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('referralsService.requestPayout error', e);
      throw e;
    }
  },

  async listCommissions(userId: string) {
    try {
      const { data: codeRow } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .maybeSingle();
      const code = codeRow?.code || '';
      if (!code) return [] as Array<{ id: string; referee_user_id: string | null; plan_id: string | null; amount: number; currency: string; status: string; created_at: string }>;

      const { data, error } = await supabase
        .from('referral_commissions')
        .select('id, referee_user_id, plan_id, amount, currency, status, created_at')
        .eq('ref_code', code)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      // Enrich with users (no profiles table required)
      const ids = Array.from(new Set(rows.map((r: any) => r.referee_user_id).filter(Boolean)));
      if (ids.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .in('id', ids);
        const byId: Record<string, any> = {};
        (users || []).forEach((u: any) => { byId[u.id] = u; });
        return rows.map((r: any) => ({
          ...r,
          referee_email: r.referee_user_id ? byId[r.referee_user_id]?.email || null : null,
          referee_name: r.referee_user_id 
            ? [byId[r.referee_user_id]?.first_name, byId[r.referee_user_id]?.last_name]
                .filter(Boolean)
                .join(' ') || null 
            : null,
        }));
      }
      return rows;
    } catch (e) {
      console.error('referralsService.listCommissions error', e);
      return [];
    }
  }
  ,

  async getReferrerByCode(code: string): Promise<{ user_id: string; code: string } | null> {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('user_id, code')
        .eq('code', code)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (e) {
      console.error('referralsService.getReferrerByCode error', e);
      return null;
    }
  },

  async createCommission(params: { ref_code: string; referee_user_id: string; plan_id: string; amount: number; currency?: string }) {
    try {
      const { ref_code, referee_user_id, plan_id, amount, currency = 'USD' } = params;
      const { data, error } = await supabase
        .from('referral_commissions')
        .insert({ ref_code, referee_user_id, plan_id, amount, currency, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('referralsService.createCommission error', e);
      throw e;
    }
  }
};

/* ==========================================================
   Cash Closing Service (Daily Cash Register Closings)
   Tabla: cash_closings
========================================================== */
export const cashClosingService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('cash_closings')
        .select('*')
        .eq('user_id', userId)
        .order('closing_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async getByDate(userId: string, closingDate: string) {
    try {
      if (!userId || !closingDate) return [];
      const { data, error } = await supabase
        .from('cash_closings')
        .select('*')
        .eq('user_id', userId)
        .eq('closing_date', closingDate)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, closing: any) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...closing,
        user_id: userId,
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await supabase
        .from('cash_closings')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('cashClosingService.create error', error);
      throw error;
    }
  },

  async update(id: string, closing: any) {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('cash_closings')
        .update({ ...closing, updated_at: now })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('cashClosingService.update error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Audit Logs Service
   (simple helper used by other services)
========================================================== */
export const auditLogsService = {
  async logAction(payload: { action: string; entity?: string; entity_id?: string | null; details?: any }) {
    try {
      // Leer configuración para saber si está habilitado
      const { data: settings, error: settingsError } = await supabase
        .from('accounting_settings')
        .select('audit_log_enabled')
        .limit(1)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (!settings?.audit_log_enabled) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const logPayload: any = {
        user_id: user?.id ?? null,
        action: payload.action,
        entity: payload.entity ?? null,
        entity_id: payload.entity_id ?? null,
        details: payload.details ?? {},
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(logPayload);

      if (error) throw error;
    } catch (error) {
      // No romper el flujo de negocio si falla el log
      // eslint-disable-next-line no-console
      console.error('auditLogsService.logAction error', error);
    }
  },

  async exportLogs() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('auditLogsService.exportLogs error', error);
      return [];
    }
  },
};

/* ==========================================================
   Customers Service (Accounts Receivable)
========================================================== */
export const customersService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id as string,
        name: c.name || '',
        document: c.document || '',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        creditLimit: Number(c.credit_limit) || 0,
        currentBalance: Number(c.current_balance) || 0,
        status: (c.status as 'active' | 'inactive' | 'blocked') || 'active',
      }));
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, customer: { name: string; document: string; phone: string; email: string; address: string; creditLimit: number; status: 'active' | 'inactive' | 'blocked' }) {
    try {
      const payload = {
        user_id: userId,
        name: customer.name,
        document: customer.document,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        credit_limit: customer.creditLimit,
        current_balance: 0,
        status: customer.status,
      };
      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      await auditLogsService.logAction({
        action: 'create_customer',
        entity: 'customer',
        entity_id: data.id,
        details: { name: data.name, document: data.document },
      });
      return data;
    } catch (error) {
      console.error('customersService.create error', error);
      throw error;
    }
  },

  async update(id: string, customer: { name: string; document: string; phone: string; email: string; address: string; creditLimit: number; status: 'active' | 'inactive' | 'blocked' }) {
    try {
      const payload = {
        name: customer.name,
        document: customer.document,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        credit_limit: customer.creditLimit,
        status: customer.status,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      await auditLogsService.logAction({
        action: 'update_customer',
        entity: 'customer',
        entity_id: data.id,
        details: { name: data.name, document: data.document },
      });
      return data;
    } catch (error) {
      console.error('customersService.update error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Chart of Accounts Service
========================================================== */
export const chartAccountsService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('chart_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('code');
      
      if (error) {
        console.error('Database error:', error);
        return [];
      }
      
      // Mapear los datos de la base de datos al formato esperado por el componente
      const rawAccounts = data || [];

      const mappedData = rawAccounts.map(account => {
        const level = account.level || 1;
        const parentId = account.parent_id || undefined;

        // Determinar si la cuenta tiene subcuentas (hijas)
        const hasChildren = rawAccounts.some(a => a.parent_id === account.id);

        // Regla de negocio:
        // - Niveles 1 y 2 siempre son cuentas de control (no permiten movimientos).
        // - Para nivel >= 3, si la cuenta tiene subcuentas también se trata como control.
        const effectiveAllowPosting =
          level <= 2 || hasChildren ? false : account.allow_posting !== false;

        return {
          id: account.id,
          code: account.code || '',
          name: account.name || '',
          type: account.type || 'asset',
          parentId,
          level,
          balance: account.balance || 0,
          isActive: account.is_active !== false,
          description: account.description || '',
          normalBalance: account.normal_balance || 'debit',
          allowPosting: effectiveAllowPosting,
          isBankAccount: account.is_bank_account === true,
          createdAt: account.created_at || new Date().toISOString(),
          updatedAt: account.updated_at || new Date().toISOString()
        };
      });

      return mappedData;
    } catch (error) {
      console.error('Error in getAll:', error);
      return [];
    }
  },

  // Obtener saldos por cuenta a partir de las líneas de diario general.
  // Esto es la base para balances y estados financieros.
  async getBalances(userId: string) {
    try {
      // 1. Cargar cuentas activas con su tipo y saldo normal
      const { data: accounts, error: accError } = await supabase
        .from('chart_accounts')
        .select('id, code, name, type, normal_balance, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('code');

      if (accError) {
        console.error('Error loading accounts for balances:', accError);
        return [];
      }

      // 2. Cargar líneas de diario solo de asientos contabilizados (status = 'posted')
      const { data: lines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select('account_id, debit_amount, credit_amount, journal_entries!inner(status, user_id)')
        .eq('journal_entries.user_id', userId)
        .eq('journal_entries.status', 'posted');

      if (linesError) {
        console.error('Error loading journal lines for balances:', linesError);
        return [];
      }

      // 3. Agrupar débitos y créditos por cuenta
      const sums: Record<string, { debit: number; credit: number }> = {};

      (lines || []).forEach((line: any) => {
        const accountId = line.account_id;
        if (!accountId) return;
        if (!sums[accountId]) {
          sums[accountId] = { debit: 0, credit: 0 };
        }
        sums[accountId].debit += Number(line.debit_amount || 0);
        sums[accountId].credit += Number(line.credit_amount || 0);
      });

      // 4. Calcular saldo firmado según normal_balance
      const balances = (accounts || []).map((acc: any) => {
        const sum = sums[acc.id] || { debit: 0, credit: 0 };
        const normal: 'debit' | 'credit' = acc.normal_balance || 'debit';

        const balance =
          normal === 'debit'
            ? sum.debit - sum.credit
            : sum.credit - sum.debit;

        return {
          id: acc.id,
          code: acc.code || '',
          name: acc.name || '',
          type: acc.type || 'asset',
          normalBalance: normal,
          debit: sum.debit,
          credit: sum.credit,
          balance,
        };
      });

      return balances;
    } catch (error) {
      console.error('Error in getBalances:', error);
      return [];
    }
  },

  async create(userId: string, account: any) {
    try {
      const normalizeAccountType = (t: string) => {
        const v = (t || '').toLowerCase().trim();
        if (['asset', 'liability', 'equity', 'income', 'cost', 'expense'].includes(v)) return v;
        if (['activo', 'activos'].includes(v)) return 'asset';
        if (['pasivo', 'pasivos'].includes(v)) return 'liability';
        if (['patrimonio', 'capital'].includes(v)) return 'equity';
        if (['ingreso', 'ingresos'].includes(v)) return 'income';
        if (['costo', 'costos'].includes(v)) return 'cost';
        if (['gasto', 'gastos'].includes(v)) return 'expense';
        return 'asset';
      };

      const accountData = {
        ...account,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      accountData.type = normalizeAccountType(accountData.type);
      if (!accountData.normal_balance) {
        accountData.normal_balance = ['asset', 'expense'].includes(accountData.type) ? 'debit' : 'credit';
      }

      const { data, error } = await supabase
        .from('chart_accounts')
        .upsert(accountData, { onConflict: 'user_id,code' })
        .select()
        .single();
      
      if (error) throw error;
      
      // Mapear la respuesta al formato esperado
      return {
        id: data.id,
        code: data.code || '',
        name: data.name || '',
        type: data.type || 'asset',
        parentId: data.parent_id || undefined,
        level: data.level || 1,
        balance: data.balance || 0,
        isActive: data.is_active !== false,
        description: data.description || '',
        normalBalance: data.normal_balance || 'debit',
        allowPosting: data.allow_posting !== false,
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  },

  async update(id: string, account: any) {
    try {
      const updateData = {
        ...account,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chart_accounts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('chart_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  async generateBalanceSheet(userId: string, asOfDate: string) {
    try {
      const { data, error } = await supabase
        .from('chart_accounts')
        .select('*')
        .in('type', ['asset', 'liability', 'equity'])
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('code');

      if (error) {
        console.error('Error in generateBalanceSheet:', error);
        return {
          assets: [],
          liabilities: [],
          equity: [],
          totalAssets: 0,
          totalLiabilities: 0,
          totalEquity: 0,
          asOfDate,
        };
      }

      const assets = data?.filter((account: any) => account.type === 'asset') || [];
      const liabilities = data?.filter((account: any) => account.type === 'liability') || [];
      const equity = data?.filter((account: any) => account.type === 'equity') || [];

      const totalAssets = assets.reduce((sum: number, account: any) => sum + Math.abs(account.balance || 0), 0);
      const totalLiabilities = liabilities.reduce((sum: number, account: any) => sum + Math.abs(account.balance || 0), 0);
      const totalEquity = equity.reduce((sum: number, account: any) => sum + Math.abs(account.balance || 0), 0);

      return {
        assets: assets.map((acc: any) => ({ ...acc, balance: Math.abs(acc.balance || 0) })),
        liabilities: liabilities.map((acc: any) => ({ ...acc, balance: Math.abs(acc.balance || 0) })),
        equity: equity.map((acc: any) => ({ ...acc, balance: Math.abs(acc.balance || 0) })),
        totalAssets,
        totalLiabilities,
        totalEquity,
        asOfDate,
      };
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      return {
        assets: [],
        liabilities: [],
        equity: [],
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        asOfDate,
      };
    }
  },

  async generateIncomeStatement(userId: string, fromDate: string, toDate: string) {
    if (!userId) {
      return {
        income: [],
        expenses: [],
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        fromDate,
        toDate
      };
    }
    try {
      const { data, error } = await supabase
        .from('chart_accounts')
        .select('*')
        .in('type', ['income', 'cost', 'expense'])
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('code');

      if (error) {
        console.error('Error in generateIncomeStatement:', error);
        // Retornar datos de ejemplo
        return {
          income: [],
          expenses: [],
          totalIncome: 0,
          totalExpenses: 0,
          netIncome: 0,
          fromDate,
          toDate
        };
      }

      const income = data?.filter(account => account.type === 'income') || [];
      // Por ahora, tratar las cuentas de tipo 'cost' como parte de gastos en el estado de resultados
      const expenses = data?.filter(account => account.type === 'expense' || account.type === 'cost') || [];

      const totalIncome = income.reduce((sum, account) => sum + Math.abs(account.balance || 0), 0);
      const totalExpenses = expenses.reduce((sum, account) => sum + Math.abs(account.balance || 0), 0);
      const netIncome = totalIncome - totalExpenses;

      return {
        income: income.map(acc => ({ ...acc, balance: Math.abs(acc.balance || 0) })),
        expenses: expenses.map(acc => ({ ...acc, balance: Math.abs(acc.balance || 0) })),
        totalIncome,
        totalExpenses,
        netIncome,
        fromDate,
        toDate
      };
    } catch (error) {
      console.error('Error generating income statement:', error);
      return {
        income: [],
        expenses: [],
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        fromDate,
        toDate
      };
    }
  },

  async generateTrialBalance(userId: string, asOfDate: string) {
    try {
      if (!userId) {
        return {
          accounts: [],
          totalDebits: 0,
          totalCredits: 0,
          isBalanced: true,
          asOfDate,
        };
      }

      const trial = await financialReportsService.getTrialBalance(userId, '1900-01-01', asOfDate);

      const totalDebits = trial.reduce((sum: number, acc: any) => sum + (acc.debit || 0), 0);
      const totalCredits = trial.reduce((sum: number, acc: any) => sum + (acc.credit || 0), 0);

      return {
        accounts: trial,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        asOfDate,
      };
    } catch (error) {
      console.error('Error generating trial balance:', error);
      return {
        accounts: [],
        totalDebits: 0,
        totalCredits: 0,
        isBalanced: true,
        asOfDate,
      };
    }
  },

  async generateCashFlowStatement(userId: string, fromDate: string, toDate: string) {
    if (!userId) {
      return {
        operatingCashFlow: 0,
        investingCashFlow: 0,
        financingCashFlow: 0,
        netCashFlow: 0,
        fromDate,
        toDate
      };
    }
    try {
      // Obtener movimientos de efectivo del período
      const { data: journalEntries, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_accounts (code, name, type)
          )
        `)
        .eq('user_id', userId)
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate)
        .order('entry_date');

      if (error) {
        console.error('Error in generateCashFlowStatement:', error);
        // Retornar datos de ejemplo
        return {
          operatingCashFlow: 0,
          investingCashFlow: 0,
          financingCashFlow: 0,
          netCashFlow: 0,
          fromDate,
          toDate
        };
      }

      let operatingCashFlow = 0;
      let investingCashFlow = 0;
      let financingCashFlow = 0;

      journalEntries?.forEach(entry => {
        entry.journal_entry_lines?.forEach((line: any) => {
          const account = line.chart_accounts;
          const amount = (line.debit_amount || 0) - (line.credit_amount || 0);

          // Clasificar flujos de efectivo basado en códigos de cuenta
          if (account?.code?.startsWith('111')) {
            // Cuentas de efectivo (1111, 1112, 1113)
            if (entry.description?.toLowerCase().includes('venta') || 
                entry.description?.toLowerCase().includes('cobro') ||
                entry.description?.toLowerCase().includes('ingreso') ||
                entry.description?.toLowerCase().includes('nómina') ||
                entry.description?.toLowerCase().includes('alquiler') ||
                entry.description?.toLowerCase().includes('servicios')) {
              operatingCashFlow += amount;
            } else if (entry.description?.toLowerCase().includes('compra activo') ||
                      entry.description?.toLowerCase().includes('inversión') ||
                      entry.description?.toLowerCase().includes('equipo')) {
              investingCashFlow += amount;
            } else if (entry.description?.toLowerCase().includes('préstamo') ||
                      entry.description?.toLowerCase().includes('capital') ||
                      entry.description?.toLowerCase().includes('dividendo')) {
              financingCashFlow += amount;
            } else {
              operatingCashFlow += amount; // Por defecto operativo
            }
          }
        });
      });

      const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

      return {
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow,
        fromDate,
        toDate
      };
    } catch (error) {
      console.error('Error generating cash flow statement:', error);
      // Retornar datos de ejemplo si hay error
      return {
        operatingCashFlow: 0,
        investingCashFlow: 0,
        financingCashFlow: 0,
        netCashFlow: 0,
        fromDate,
        toDate
      };
    }
  }
};

/* ==========================================================
   Petty Cash Service
========================================================== */
export const pettyCashService = {
  async getFunds(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('petty_cash_funds')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async getExpenses(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('petty_cash_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async getReimbursements(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('petty_cash_reimbursements')
        .select('*')
        .eq('user_id', userId)
        .order('reimbursement_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async createFund(userId: string, fund: any) {
    try {
      const payload = {
        ...fund,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('petty_cash_funds')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashService.createFund error', error);
      throw error;
    }
  },

  async createExpense(userId: string, expense: any) {
    try {
      const payload = {
        ...expense,
        user_id: userId,
        status: expense.status || 'pending',
      };
      const { data, error } = await supabase
        .from('petty_cash_expenses')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashService.createExpense error', error);
      throw error;
    }
  },

  async approveExpense(userId: string, expenseId: string, approvedBy: string | null) {
    try {
      const updatePayload: any = {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('petty_cash_expenses')
        .update(updatePayload)
        .eq('id', expenseId)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashService.approveExpense error', error);
      throw error;
    }
  },

  async rejectExpense(userId: string, expenseId: string, approvedBy: string | null) {
    try {
      const updatePayload: any = {
        status: 'rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('petty_cash_expenses')
        .update(updatePayload)
        .eq('id', expenseId)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashService.rejectExpense error', error);
      throw error;
    }
  },

  async createReimbursement(userId: string, reimbursement: any) {
    try {
      const payload = {
        ...reimbursement,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('petty_cash_reimbursements')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashService.createReimbursement error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Financial Reports Service (Trial Balance / Statements)
========================================================== */
/**
 * Servicio para generar reportes financieros, incluyendo el balance de prueba y los estados financieros.
 */
export const financialReportsService = {
  async getTrialBalance(userId: string, fromDate: string, toDate: string) {
    try {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entries (entry_date, user_id),
          chart_accounts (code, name, type, normal_balance)
        `)
        .eq('journal_entries.user_id', userId)
        .gte('journal_entries.entry_date', fromDate)
        .lte('journal_entries.entry_date', toDate);

      if (error) {
        console.error('financialReportsService.getTrialBalance error', error);
        return [];
      }

      const byAccount: Record<string, any> = {};

      (data || []).forEach((line: any) => {
        const account = line.chart_accounts;
        if (!account) return;

        const accountId = line.account_id as string;
        const debit = Number(line.debit_amount) || 0;
        const credit = Number(line.credit_amount) || 0;

        if (!byAccount[accountId]) {
          byAccount[accountId] = {
            account_id: accountId,
            code: account.code,
            name: account.name,
            type: account.type,
            normal_balance: account.normal_balance,
            total_debit: 0,
            total_credit: 0,
            balance: 0,
          };
        }

        byAccount[accountId].total_debit += debit;
        byAccount[accountId].total_credit += credit;
      });

      // Calcular saldo según el balance normal de la cuenta
      Object.values(byAccount).forEach((acc: any) => {
        if (acc.normal_balance === 'credit') {
          acc.balance = acc.total_credit - acc.total_debit;
        } else {
          acc.balance = acc.total_debit - acc.total_credit;
        }
      });

      return Object.values(byAccount);
    } catch (error) {
      console.error('financialReportsService.getTrialBalance unexpected error', error);
      return [];
    }
  },
};

/* ==========================================================
   Financial Statements Persistence Service
   (Estados Generados)
========================================================== */
export const financialStatementsService = {
  async getAll(userId: string, period?: string | null) {
    try {
      if (!userId) return [];

      let query = supabase
        .from('financial_statements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (period) {
        query = query.eq('period', period);
      }

      const { data, error } = await query;
      if (error) {
        console.error('financialStatementsService.getAll error', error);
        return [];
      }
      return data ?? [];
    } catch (error) {
      console.error('financialStatementsService.getAll unexpected error', error);
      return [];
    }
  },

  async create(userId: string, params: { type: string; period?: string | null; name?: string | null }) {
    try {
      if (!userId) throw new Error('User is required');

      const type = params.type as
        | 'balance_sheet'
        | 'income_statement'
        | 'cash_flow'
        | 'equity_statement';

      const period = params.period || new Date().toISOString().slice(0, 7); // YYYY-MM
      const [yearStr, monthStr] = period.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      if (!year || !month) throw new Error('Invalid period');

      const fromDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const toDate = new Date(year, month, 0).toISOString().slice(0, 10);

      let payload: any = {
        user_id: userId,
        type,
        period,
        from_date: fromDate,
        to_date: toDate,
        status: 'final',
        name:
          params.name ||
          (type === 'balance_sheet'
            ? `Balance General ${period}`
            : type === 'income_statement'
            ? `Estado de Resultados ${period}`
            : type === 'cash_flow'
            ? `Flujo de Efectivo ${period}`
            : `Estado Financiero ${period}`),
      };

      if (type === 'balance_sheet') {
        const result: any = await chartAccountsService.generateBalanceSheet(userId, toDate);
        payload = {
          ...payload,
          total_assets: result?.totalAssets ?? 0,
          total_liabilities: result?.totalLiabilities ?? 0,
          total_equity: result?.totalEquity ?? 0,
        };
      } else if (type === 'income_statement') {
        const result: any = await chartAccountsService.generateIncomeStatement(userId, fromDate, toDate);
        payload = {
          ...payload,
          total_revenue: result?.totalIncome ?? 0,
          total_expenses: result?.totalExpenses ?? 0,
          net_income: result?.netIncome ?? 0,
        };
      } else if (type === 'cash_flow') {
        const result: any = await chartAccountsService.generateCashFlowStatement(userId, fromDate, toDate);
        payload = {
          ...payload,
          operating_cash_flow: result?.operatingCashFlow ?? 0,
          investing_cash_flow: result?.investingCashFlow ?? 0,
          financing_cash_flow: result?.financingCashFlow ?? 0,
          net_cash_flow: result?.netCashFlow ?? 0,
        };
      }

      const { data, error } = await supabase
        .from('financial_statements')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('financialStatementsService.create error', error);
      throw error;
    }
   /**
    * Servicio para gestionar asientos contables.
    */
  }
};

/**
 * Servicio para gestionar asientos contables.
 */
export const journalEntriesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_accounts (code, name)
          )
        `)
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });
      
      if (error) {
        console.error('Error in journalEntriesService.getAll:', error);
        return [];
      }
      
      return data ?? [];
    } catch (error) {
      console.error('Error in journalEntriesService.getAll:', error);
      return [];
    }
  },

  async create(userId: string, entry: any) {
    try {
      const entryData = {
        ...entry,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('journal_entries')
        .insert(entryData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating journal entry:', error);
      throw error;
    }
  },

  async createWithLines(userId: string, entry: any, lines: any[]) {
    try {
      // Validar que los débitos y créditos estén balanceados
      const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Los débitos y créditos deben estar balanceados');
      }

      const entryData = {
        ...entry,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: entryData_result, error: entryError } = await supabase
        .from('journal_entries')
        .insert(entryData)
        .select()
        .single();

      if (entryError) throw entryError;

      const linesWithEntry = lines.map((line, index) => ({
        ...line,
        journal_entry_id: entryData_result.id,
        line_number: index + 1,
        created_at: new Date().toISOString(),
      }));

      const { data: linesData, error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntry)
        .select();

      if (linesError) throw linesError;

      // Actualizar los balances de las cuentas afectadas
      await this.updateAccountBalances(lines);

      return { entry: entryData_result, lines: linesData };
    } catch (error) {
      console.error('Error creating journal entry with lines:', error);
      throw error;
    }
  },

  async updateAccountBalances(lines: any[]) {
    try {
      for (const line of lines) {
        const { account_id, debit_amount, credit_amount } = line;
        
        // Obtener la cuenta para determinar el balance normal
        const { data: account, error: accountError } = await supabase
          .from('chart_accounts')
          .select('balance, normal_balance')
          .eq('id', account_id)
          .single();

        if (accountError) {
          console.error('Error getting account:', accountError);
          continue;
        }

        let balanceChange = 0;
        if (account.normal_balance === 'debit') {
          balanceChange = (debit_amount || 0) - (credit_amount || 0);
        } else {
          balanceChange = (credit_amount || 0) - (debit_amount || 0);
        }

        const newBalance = (account.balance || 0) + balanceChange;

        const { error: updateError } = await supabase
          .from('chart_accounts')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', account_id);

        if (updateError) {
          console.error('Error updating account balance:', updateError);
        }
      }
    } catch (error) {
      console.error('Error updating account balances:', error);
    }
  },

  async update(id: string, entry: any) {
    try {
      const updateData = {
        ...entry,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('journal_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating journal entry:', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      // Primero eliminar las líneas del asiento
      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', id);

      if (linesError) throw linesError;

      // Luego eliminar el asiento
      const { error: entryError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (entryError) throw entryError;
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_accounts (code, name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting journal entry by id:', error);
      throw error;
    }
  },

  async getByDateRange(_userId: string, fromDate: string, toDate: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_accounts (code, name)
          )
        `)
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('Error getting journal entries by date range:', error);
      throw error;
    }
  },
};

/* ==========================================================
   Bank Reconciliation Service
========================================================== */
export const bankReconciliationService = {
  async getOrCreateReconciliation(userId: string, bankAccountId: string, reconciliationDate: string) {
    try {
      if (!userId || !bankAccountId) throw new Error('User and bank account are required');

      // Try to find an existing reconciliation for this bank and date
      const { data: existing, error: existingError } = await supabase
        .from('bank_reconciliations')
        .select('*')
        .eq('user_id', userId)
        .eq('bank_account_id', bankAccountId)
        .eq('reconciliation_date', reconciliationDate)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 = no rows found for maybeSingle
        throw existingError;
      }

      if (existing) {
        return existing;
      }

      // Create a new reconciliation
      const payload = {
        user_id: userId,
        bank_account_id: bankAccountId,
        reconciliation_date: reconciliationDate,
        status: 'open',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('bank_reconciliations')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('bankReconciliationService.getOrCreateReconciliation error', error);
      throw error;
    }
  },

  async upsertBookItemsFromJournal(reconciliationId: string, userId: string, bankAccountId: string, reconciliationDate: string) {
    try {
      if (!reconciliationId || !userId || !bankAccountId) return;

      // Very simple implementation: pull journal entries for the date and bank account
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select(`
          id,
          entry_date,
          description
        `)
        .eq('user_id', userId)
        .eq('bank_account_id', bankAccountId)
        .eq('entry_date', reconciliationDate);

      if (error) {
        console.error('bankReconciliationService.upsertBookItemsFromJournal error', error);
        return;
      }

      if (!entries || entries.length === 0) return;

      // For now, just ensure there is at least one corresponding book item per entry
      for (const entry of entries) {
        const { error: insertError } = await supabase
          .from('bank_reconciliation_items')
          .upsert(
            {
              reconciliation_id: reconciliationId,
              journal_entry_id: entry.id,
              transaction_type: 'book',
              transaction_date: entry.entry_date,
              description: entry.description || 'Movimiento contable',
            },
            { onConflict: 'reconciliation_id,journal_entry_id,transaction_type' }
          );

        if (insertError) {
          console.error('bankReconciliationService.upsertBookItemsFromJournal upsert error', insertError);
        }
      }
    } catch (error) {
      console.error('bankReconciliationService.upsertBookItemsFromJournal unexpected error', error);
    }
  },

  async getItems(reconciliationId: string) {
    try {
      if (!reconciliationId) return [];
      const { data, error } = await supabase
        .from('bank_reconciliation_items')
        .select('*')
        .eq('reconciliation_id', reconciliationId)
        .order('transaction_date', { ascending: true });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async setItemsReconciled(itemIds: string[], isReconciled: boolean) {
    try {
      if (!itemIds || itemIds.length === 0) return;
      const { error } = await supabase
        .from('bank_reconciliation_items')
        .update({ is_reconciled: isReconciled })
        .in('id', itemIds);
      if (error) throw error;
    } catch (error) {
      console.error('bankReconciliationService.setItemsReconciled error', error);
      throw error;
    }
  },

  async addBankItem(reconciliationId: string, item: any) {
    try {
      const payload = {
        ...item,
        reconciliation_id: reconciliationId,
        transaction_type: 'bank',
      };

      const { data, error } = await supabase
        .from('bank_reconciliation_items')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('bankReconciliationService.addBankItem error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Employees Service
========================================================== */
export const employeesService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments (name),
          positions (title)
        `)
        .eq('user_id', userId)
        .order('employee_code');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, employee: any) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({ ...employee, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, employee: any) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(employee)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async setStatus(id: string, status: 'active' | 'inactive') {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
};

/* ==========================================================
   Inventory Service
========================================================== */
export const inventoryService = {
  async getItems(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async getMovements(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory_items (name, sku)
        `)
        .eq('user_id', userId)
        .order('movement_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async createItem(userId: string, item: any) {
    try {
      const payload = {
        ...item,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('inventoryService.createItem error', error);
      throw error;
    }
  },

  async updateItem(id: string, item: any) {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(item)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        console.warn('inventoryService.updateItem: item not found', id);
        return null;
      }
      return data;
    } catch (error) {
      console.error('inventoryService.updateItem error', error);
      throw error;
    }
  },

  async deleteItem(id: string) {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('inventoryService.deleteItem error', error);
      throw error;
    }
  },

  async createMovement(userId: string, movement: any) {
    try {
      const payload = {
        ...movement,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('inventoryService.createMovement error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Departments Service
========================================================== */
export const departmentsService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, department: any) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({ ...department, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, department: any) {
    try {
      const { data, error } = await supabase
        .from('departments')
        .update(department)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
};

/* ==========================================================
   Positions Service
========================================================== */
export const positionsService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          *,
          departments (name)
        `)
        .eq('user_id', userId)
        .order('title');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, position: any) {
    try {
      const { data, error } = await supabase
        .from('positions')
        .insert({ ...position, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, position: any) {
    try {
      const { data, error } = await supabase
        .from('positions')
        .update(position)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
};

/* ==========================================================
   Employee Types Service
========================================================== */
export const employeeTypesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('employee_types')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, type: any) {
    try {
      const payload = {
        ...type,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('employee_types')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('employeeTypesService.create error', error);
      throw error;
    }
  },

  async update(id: string, type: any) {
    try {
      const { data, error } = await supabase
        .from('employee_types')
        .update(type)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('employeeTypesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('employee_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('employeeTypesService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Salary Types Service
========================================================== */
export const salaryTypesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('salary_types')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, type: any) {
    try {
      const payload = {
        ...type,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('salary_types')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('salaryTypesService.create error', error);
      throw error;
    }
  },

  async update(id: string, type: any) {
    try {
      const { data, error } = await supabase
        .from('salary_types')
        .update(type)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('salaryTypesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('salary_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('salaryTypesService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Commission Types Service
========================================================== */
export const commissionTypesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('commission_types')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, type: any) {
    try {
      const payload = {
        ...type,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('commission_types')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('commissionTypesService.create error', error);
      throw error;
    }
  },

  async update(id: string, type: any) {
    try {
      const { data, error } = await supabase
        .from('commission_types')
        .update(type)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('commissionTypesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('commission_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('commissionTypesService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Vacations Service
========================================================== */
export const vacationsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('vacations')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, vacation: any) {
    try {
      const payload = {
        ...vacation,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('vacations')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('vacationsService.create error', error);
      throw error;
    }
  },

  async update(id: string, vacation: any) {
    try {
      const { data, error } = await supabase
        .from('vacations')
        .update(vacation)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('vacationsService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('vacations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('vacationsService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Holidays Service
========================================================== */
export const holidaysService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, holiday: any) {
    try {
      const payload = {
        ...holiday,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('holidays')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('holidaysService.create error', error);
      throw error;
    }
  },

  async update(id: string, holiday: any) {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .update(holiday)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('holidaysService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('holidaysService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Bonuses Service
========================================================== */
export const bonusesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bonuses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, bonus: any) {
    try {
      const payload = {
        ...bonus,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('bonuses')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('bonusesService.create error', error);
      throw error;
    }
  },

  async update(id: string, bonus: any) {
    try {
      const { data, error } = await supabase
        .from('bonuses')
        .update(bonus)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('bonusesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('bonuses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('bonusesService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Royalties Service
========================================================== */
export const royaltiesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('royalties')
        .select('*')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, royalty: any) {
    try {
      const payload = {
        ...royalty,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('royalties')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('royaltiesService.create error', error);
      throw error;
    }
  },

  async update(id: string, royalty: any) {
    try {
      const { data, error } = await supabase
        .from('royalties')
        .update(royalty)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('royaltiesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('royalties')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('royaltiesService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Overtime Service
========================================================== */
export const overtimeService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('overtime_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, record: any) {
    try {
      const payload = {
        ...record,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('overtime_records')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('overtimeService.create error', error);
      throw error;
    }
  },

  async update(id: string, record: any) {
    try {
      const { data, error } = await supabase
        .from('overtime_records')
        .update(record)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('overtimeService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('overtime_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('overtimeService.delete error', error);
      throw error;
    }
  }
};

/* ==========================================================
   Payroll Service
========================================================== */
export const payrollService = {
  async getPeriods(userId: string) {
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async createPeriod(userId: string, period: any) {
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .insert({ ...period, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getEntries(periodId: string) {
    try {
      const { data, error } = await supabase
        .from('payroll_entries')
        .select(`
          *,
          employees (first_name, last_name, employee_code)
        `)
        .eq('payroll_period_id', periodId);
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async processPayroll(_periodId: string, entries: any[]) {
    try {
      const { data, error } = await supabase
        .from('payroll_entries')
        .insert(entries)
        .select();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, po: any) {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(po)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async updateStatus(id: string, status: string) {
    try {
      const patch: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(patch)
      return data;
    } catch (error) {
      console.error('payrollService.updateStatus error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Accounting Settings Service
========================================================== */
export const accountingSettingsService = {
  async get(userId?: string) {
    try {
      const { data, error } = await supabase
        .from('accounting_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ?? null;
    } catch (error) {
      console.error('accountingSettingsService.get error', error);
      return null;
    }
  },
};

/* ==========================================================
   Invoices Service
========================================================== */
export const invoicesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (id, name),
          invoice_lines (
            *,
            inventory_items (name)
          )
        `)
        .eq('user_id', userId)
        .order('invoice_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, invoice: any, lines: any[]) {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({ ...invoice, user_id: userId })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const linesWithInvoice = lines.map((line) => ({
        ...line,
        invoice_id: invoiceData.id,
      }));

      const { data: linesData, error: linesError } = await supabase
        .from('invoice_lines')
        .insert(linesWithInvoice)
        .select();

      if (linesError) throw linesError;

      // Intentar registrar asiento contable para la factura (best-effort)
      try {
        const settings = await accountingSettingsService.get(userId);
        const arAccountId = settings?.ar_account_id;
        const salesAccountId = settings?.sales_account_id;
        const taxAccountId = settings?.sales_tax_account_id;

        if (arAccountId && salesAccountId) {
          const subtotal = Number(invoiceData.subtotal) || 0;
          const taxAmount = Number(invoiceData.tax_amount) || 0;
          const totalAmount = Number(invoiceData.total_amount) || subtotal + taxAmount;

          const entryLines: any[] = [
            {
              account_id: arAccountId,
              description: 'Cuentas por Cobrar Clientes',
              debit_amount: totalAmount,
              credit_amount: 0,
              line_number: 1,
            },
            {
              account_id: salesAccountId,
              description: 'Ventas',
              debit_amount: 0,
              credit_amount: subtotal,
              line_number: 2,
            },
          ];

          if (taxAmount > 0 && taxAccountId) {
            entryLines.push({
              account_id: taxAccountId,
              description: 'ITBIS por pagar',
              debit_amount: 0,
              credit_amount: taxAmount,
              line_number: entryLines.length + 1,
            });
          }

          const entryPayload = {
            entry_number: invoiceData.invoice_number || null,
            entry_date: invoiceData.invoice_date,
            description: `Factura ${invoiceData.invoice_number || ''}`.trim(),
            reference: invoiceData.id,
            total_debit: totalAmount,
            total_credit: totalAmount,
            status: 'posted',
          };

          await journalEntriesService.createWithLines(userId, entryPayload, entryLines);
        }

        // Segundo asiento: Costo de Ventas vs Inventario (best-effort, por producto)
        try {
          const { data: costLines, error: costLinesError } = await supabase
            .from('invoice_lines')
            .select(`
              *,
              inventory_items (cost_price, inventory_account_id, cogs_account_id)
            `)
            .eq('invoice_id', invoiceData.id);

          if (!costLinesError && costLines && costLines.length > 0) {
            const cogsTotals: Record<string, number> = {};
            const inventoryTotals: Record<string, number> = {};

            let totalCost = 0;

            costLines.forEach((line: any) => {
              const invItem = line.inventory_items as any | null;
              const qty = Number(line.quantity) || 0;
              const unitCost = invItem ? Number(invItem.cost_price) || 0 : 0;
              const lineCost = qty * unitCost;

              if (!invItem || lineCost <= 0) return;

              const cogsAccountId = invItem.cogs_account_id as string | null;
              const inventoryAccountId = invItem.inventory_account_id as string | null;

              if (cogsAccountId && inventoryAccountId) {
                totalCost += lineCost;
                cogsTotals[cogsAccountId] = (cogsTotals[cogsAccountId] || 0) + lineCost;
                inventoryTotals[inventoryAccountId] = (inventoryTotals[inventoryAccountId] || 0) + lineCost;
              }
            });

            if (totalCost > 0) {
              const cogsLines: any[] = [];
              let lineNumber = 1;

              for (const [accountId, amount] of Object.entries(cogsTotals)) {
                if (amount > 0) {
                  cogsLines.push({
                    account_id: accountId,
                    description: 'Costo de Ventas',
                    debit_amount: amount,
                    credit_amount: 0,
                    line_number: lineNumber++,
                  });
                }
              }

              for (const [accountId, amount] of Object.entries(inventoryTotals)) {
                if (amount > 0) {
                  cogsLines.push({
                    account_id: accountId,
                    description: 'Inventario',
                    debit_amount: 0,
                    credit_amount: amount,
                    line_number: lineNumber++,
                  });
                }
              }

              if (cogsLines.length > 0) {
                const cogsEntryPayload = {
                  entry_number: invoiceData.invoice_number
                    ? `${invoiceData.invoice_number}-COGS`
                    : null,
                  entry_date: invoiceData.invoice_date,
                  description: `Costo de ventas factura ${invoiceData.invoice_number || ''}`.trim(),
                  reference: invoiceData.id,
                  total_debit: totalCost,
                  total_credit: totalCost,
                  status: 'posted',
                };

                await journalEntriesService.createWithLines(userId, cogsEntryPayload, cogsLines);
              }
            }
          }
        } catch (cogsError) {
          console.error('Error posting invoice COGS to ledger:', cogsError);
        }
      } catch (error) {
        console.error('Error posting invoice to ledger:', error);
      }

      return { invoice: invoiceData, lines: linesData };
    } catch (error) {
      throw error;
    }
  },

  async updatePayment(id: string, paidAmount: number, status: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          paid_amount: paidAmount,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('invoicesService.updatePayment error', error);
      throw error;
    }
  },

  async updateTotals(id: string, totalAmount: number, status: string) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          total_amount: totalAmount,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('invoicesService.updateTotals error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Receipt Applications Service (Receipts applied to Invoices)
========================================================== */
export const receiptApplicationsService = {
  async create(userId: string, payload: {
    receipt_id: string;
    invoice_id: string;
    amount_applied: number;
    application_date?: string;
    notes?: string | null;
  }) {
    try {
      const body = {
        user_id: userId,
        receipt_id: payload.receipt_id,
        invoice_id: payload.invoice_id,
        amount_applied: payload.amount_applied,
        application_date: payload.application_date || new Date().toISOString().slice(0, 10),
        notes: payload.notes ?? null,
      };
      const { data, error } = await supabase
        .from('receipt_applications')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('receiptApplicationsService.create error', error);
      throw error;
    }
  },

  async getByReceipt(userId: string, receiptId: string) {
    try {
      const { data, error } = await supabase
        .from('receipt_applications')
        .select(`
          *,
          invoices (invoice_number)
        `)
        .eq('user_id', userId)
        .eq('receipt_id', receiptId)
        .order('application_date', { ascending: true });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },
};

/* ==========================================================
   Receipts Service (Accounts Receivable)
========================================================== */
export const receiptsService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          customers (name)
        `)
        .eq('user_id', userId)
        .order('receipt_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, receipt: { customer_id: string; receipt_number: string; receipt_date: string; amount: number; payment_method: string; reference?: string | null; concept?: string | null; status?: string }) {
    try {
      const payload = {
        user_id: userId,
        customer_id: receipt.customer_id,
        receipt_number: receipt.receipt_number,
        receipt_date: receipt.receipt_date,
        amount: receipt.amount,
        payment_method: receipt.payment_method,
        reference: receipt.reference ?? null,
        concept: receipt.concept ?? null,
        status: receipt.status ?? 'active',
      };
      const { data, error } = await supabase
        .from('receipts')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('receiptsService.create error', error);
      throw error;
    }
  },

  async updateStatus(id: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('receiptsService.updateStatus error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Customer Advances Service (Accounts Receivable)
========================================================== */
export const customerAdvancesService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('customer_advances')
        .select(`
          *,
          customers (name)
        `)
        .eq('user_id', userId)
        .order('advance_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: {
    customer_id: string;
    advance_number: string;
    advance_date: string;
    amount: number;
    payment_method: string;
    reference?: string | null;
    concept?: string | null;
    status?: string;
    applied_amount?: number;
    balance_amount?: number;
  }) {
    try {
      const body = {
        user_id: userId,
        customer_id: payload.customer_id,
        advance_number: payload.advance_number,
        advance_date: payload.advance_date,
        amount: payload.amount,
        payment_method: payload.payment_method,
        reference: payload.reference ?? null,
        concept: payload.concept ?? null,
        applied_amount: typeof payload.applied_amount === 'number' ? payload.applied_amount : 0,
        balance_amount: typeof payload.balance_amount === 'number' ? payload.balance_amount : payload.amount,
        status: payload.status ?? 'pending',
      };
      const { data, error } = await supabase
        .from('customer_advances')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('customerAdvancesService.create error', error);
      throw error;
    }
  },

  async updateStatus(
    id: string,
    status: string,
    extra?: { appliedAmount?: number; balanceAmount?: number }
  ) {
    try {
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (typeof extra?.appliedAmount === 'number') {
        patch.applied_amount = extra.appliedAmount;
      }
      if (typeof extra?.balanceAmount === 'number') {
        patch.balance_amount = extra.balanceAmount;
      }

      const { data, error } = await supabase
        .from('customer_advances')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('customerAdvancesService.updateStatus error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Credit/Debit Notes Service (Accounts Receivable)
========================================================== */
export const creditDebitNotesService = {
  async getAll(userId: string, noteType: 'credit' | 'debit') {
    try {
      const { data, error } = await supabase
        .from('credit_debit_notes')
        .select(`
          *,
          customers (name),
          invoices (invoice_number)
        `)
        .eq('user_id', userId)
        .eq('note_type', noteType)
        .order('note_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: {
    note_type: 'credit' | 'debit';
    customer_id: string;
    invoice_id?: string | null;
    note_number: string;
    note_date: string;
    total_amount: number;
    reason?: string | null;
    status?: string;
    applied_amount?: number;
    balance_amount?: number;
  }) {
    try {
      const body = {
        user_id: userId,
        note_type: payload.note_type,
        customer_id: payload.customer_id,
        invoice_id: payload.invoice_id ?? null,
        note_number: payload.note_number,
        note_date: payload.note_date,
        total_amount: payload.total_amount,
        reason: payload.reason ?? null,
        applied_amount: typeof payload.applied_amount === 'number' ? payload.applied_amount : 0,
        balance_amount: typeof payload.balance_amount === 'number' ? payload.balance_amount : payload.total_amount,
        status: payload.status ?? 'pending',
      };
      const { data, error } = await supabase
        .from('credit_debit_notes')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('creditDebitNotesService.create error', error);
      throw error;
    }
  },

  async updateStatus(
    id: string,
    status: string,
    extra?: { appliedAmount?: number; balanceAmount?: number }
  ) {
    try {
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (typeof extra?.appliedAmount === 'number') {
        patch.applied_amount = extra.appliedAmount;
      }
      if (typeof extra?.balanceAmount === 'number') {
        patch.balance_amount = extra.balanceAmount;
      }

      const { data, error } = await supabase
        .from('credit_debit_notes')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('creditDebitNotesService.updateStatus error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Suppliers Service
========================================================== */
export const suppliersService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, supplier: any) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...supplier, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, supplier: any) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(supplier)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
};

/* ==========================================================
   Sales Quotes Service (Cotizaciones de Ventas - CxC)
========================================================== */
export const quotesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_lines (* )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, quotePayload: any, linePayloads: Array<any>) {
    try {
      const baseQuote = {
        ...quotePayload,
        user_id: userId,
      };

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert(baseQuote)
        .select('*')
        .single();

      if (quoteError) throw quoteError;

      const quoteId = quote.id as string;

      const linesToInsert = (linePayloads || []).map((l) => {
        const qty = Number(l.quantity ?? l.qty ?? 0) || 0;
        const unitPrice = Number(l.unit_price ?? l.price ?? 0) || 0;
        const lineTotal = Number(l.line_total ?? l.total ?? qty * unitPrice) || 0;
        return {
          quote_id: quoteId,
          description: l.description || '',
          quantity: qty || 1,
          price: unitPrice,
          unit_price: unitPrice,
          total: lineTotal,
          line_total: lineTotal,
        };
      }).filter((l) => l.description && l.quantity > 0);

      let lines = [] as any[];
      if (linesToInsert.length > 0) {
        const { data: insertedLines, error: linesError } = await supabase
          .from('quote_lines')
          .insert(linesToInsert)
          .select('*');
        if (linesError) throw linesError;
        lines = insertedLines || [];
      }

      return { ...quote, quote_lines: lines };
    } catch (error) {
      console.error('quotesService.create error', error);
      throw error;
    }
  },

  async update(id: string, patch: any) {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('quotesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('quotesService.delete error', error);
      throw error;
    }
  },
};

/* ==========================================================
   AP Quotes Service (Solicitudes de Cotización - CxP)
========================================================== */
export const apQuotesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('ap_quotes')
        .select(`
          *,
          ap_quote_suppliers (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, quote: any, supplierNames: string[]) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...quote,
        user_id: userId,
        created_at: now,
        updated_at: now,
      };
      const { data: q, error: qErr } = await supabase
        .from('ap_quotes')
        .insert(payload)
        .select()
        .single();
      if (qErr) throw qErr;

      if (supplierNames && supplierNames.length > 0) {
        const supplierRows = supplierNames
          .filter((name) => name && name.trim() !== '')
          .map((name) => ({
            quote_id: q.id,
            supplier_name: name,
            created_at: now,
          }));
        if (supplierRows.length > 0) {
          const { error: sErr } = await supabase
            .from('ap_quote_suppliers')
            .insert(supplierRows);
          if (sErr) throw sErr;
        }
      }

      return q;
    } catch (error) {
      console.error('apQuotesService.create error', error);
      throw error;
    }
  },

  async update(id: string, quote: any, supplierNames?: string[]) {
    try {
      const now = new Date().toISOString();
      const { data: q, error: qErr } = await supabase
        .from('ap_quotes')
        .update({ ...quote, updated_at: now })
        .eq('id', id)
        .select()
        .single();
      if (qErr) throw qErr;

      if (Array.isArray(supplierNames)) {
        const { error: delErr } = await supabase
          .from('ap_quote_suppliers')
          .delete()
          .eq('quote_id', id);
        if (delErr) throw delErr;

        const supplierRows = supplierNames
          .filter((name) => name && name.trim() !== '')
          .map((name) => ({
            quote_id: id,
            supplier_name: name,
            created_at: now,
          }));
        if (supplierRows.length > 0) {
          const { error: insErr } = await supabase
            .from('ap_quote_suppliers')
            .insert(supplierRows);
          if (insErr) throw insErr;
        }
      }

      return q;
    } catch (error) {
      console.error('apQuotesService.update error', error);
      throw error;
    }
  },

  async updateStatus(id: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('ap_quotes')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('apQuotesService.updateStatus error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('ap_quotes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('apQuotesService.delete error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Purchase Orders Service
========================================================== */
export const purchaseOrdersService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (name)
        `)
        .eq('user_id', userId)
        .order('order_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, po: any) {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({ ...po, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, po: any) {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(po)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async updateStatus(id: string, status: string) {
    try {
      const patch: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },
};

/* ==========================================================
   Purchase Order Items Service
========================================================== */
export const purchaseOrderItemsService = {
  async getAllByUser(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          inventory_items (current_stock, name, sku)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async getByOrder(orderId: string) {
    try {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          inventory_items (current_stock, name, sku)
        `)
        .eq('purchase_order_id', orderId)
        .order('created_at', { ascending: true });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async deleteByOrder(orderId: string) {
    try {
      if (!orderId) return;
      const { error } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', orderId);
      if (error) throw error;
    } catch (error) {
      console.error('purchaseOrderItemsService.deleteByOrder error', error);
      throw error;
    }
  },

  async createMany(userId: string, orderId: string, items: Array<{ itemId: string | null; name: string; quantity: number; price: number }>) {
    try {
      if (!userId || !orderId || !items || items.length === 0) return [];

      const rows = items.map((it, index) => {
        const quantity = Number(it.quantity) || 0;
        const unitCost = Number(it.price) || 0;
        return {
          user_id: userId,
          purchase_order_id: orderId,
          inventory_item_id: it.itemId,
          description: it.name || '',
          quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
        };
      }).filter(r => r.quantity > 0);

      if (rows.length === 0) return [];

      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert(rows)
        .select('*');
      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('purchaseOrderItemsService.createMany error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Supplier Payments Service (Accounts Payable)
========================================================== */
export const supplierPaymentsService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select(`
          *,
          suppliers (name)
        `)
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: {
    supplier_id: string;
    payment_date: string;
    reference: string;
    method: string;
    amount: number;
    status: string;
    description?: string | null;
    bank_account?: string | null;
    bank_account_id?: string | null;
    invoice_number?: string | null;
  }) {
    try {
      const body = {
        user_id: userId,
        supplier_id: payload.supplier_id,
        payment_date: payload.payment_date,
        reference: payload.reference,
        method: payload.method,
        amount: payload.amount,
        status: payload.status,
        description: payload.description ?? null,
        bank_account_id: payload.bank_account_id ?? null,
        bank_account: payload.bank_account ?? null,
        invoice_number: payload.invoice_number ?? null,
      };
      const { data, error } = await supabase
        .from('supplier_payments')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('supplierPaymentsService.create error', error);
      throw error;
    }
  },

  async updateStatus(id: string, status: string) {
    try {
      const patch: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('supplier_payments')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      // Best-effort: registrar asiento contable solo cuando el pago se completa
      if (data && status === 'Completado') {
        try {
          // Obtener configuración contable global
          const settings = await accountingSettingsService.get(data.user_id);
          const apAccountId = settings?.ap_account_id;
          const defaultApBankAccountId = settings?.ap_bank_account_id;

          const amount = Number(data.amount) || 0;

          // Intentar usar la cuenta contable del banco específico del pago
          let bankChartAccountId: string | null = null;
          if (data.bank_account_id) {
            const { data: bankAccount, error: bankError } = await supabase
              .from('bank_accounts')
              .select('chart_account_id')
              .eq('id', data.bank_account_id)
              .maybeSingle();
            if (!bankError && bankAccount?.chart_account_id) {
              bankChartAccountId = bankAccount.chart_account_id as string;
            }
          }

          // Fallback al banco por defecto de CxP si no hay cuenta contable en el banco
          if (!bankChartAccountId && defaultApBankAccountId) {
            bankChartAccountId = defaultApBankAccountId as string;
          }

          if (apAccountId && bankChartAccountId && amount > 0) {
            const lines: any[] = [
              {
                account_id: bankChartAccountId,
                description: 'Pago a proveedor - Banco',
                debit_amount: amount,
                credit_amount: 0,
                line_number: 1,
              },
              {
                account_id: apAccountId,
                description: 'Pago a proveedor - Cuentas por Pagar',
                debit_amount: 0,
                credit_amount: amount,
                line_number: 2,
              },
            ];

            const entryPayload = {
              entry_number: data.reference || data.id,
              entry_date: data.payment_date,
              description: `Pago a proveedor ${data.invoice_number || ''}`.trim(),
              reference: data.id,
              total_debit: amount,
              total_credit: amount,
              status: 'posted',
            };

            await journalEntriesService.createWithLines(data.user_id, entryPayload, lines);
          }
        } catch (err) {
          console.error('Error posting supplier payment to ledger:', err);
          // No interrumpir el flujo de actualización de estado por errores contables
        }
      }
      return data;
    } catch (error) {
      console.error('supplierPaymentsService.updateStatus error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Customer Payments Service (Accounts Receivable)
========================================================== */
export const customerPaymentsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('customer_payments')
        .select(`
          *,
          customers (name),
          invoices (invoice_number),
          bank_accounts (chart_account_id, bank_name, account_number)
        `)
        .eq('user_id', userId)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: any) {
    try {
      const body = {
        ...payload,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('customer_payments')
        .insert(body)
        .select(`
          *,
          customers (name),
          invoices (invoice_number),
          bank_accounts (chart_account_id, bank_name, account_number)
        `)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('customerPaymentsService.create error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Recurring Subscriptions Service (Facturación Recurrente)
========================================================== */
export const recurringSubscriptionsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('recurring_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: any) {
    try {
      const body = {
        ...payload,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('recurring_subscriptions')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('recurringSubscriptionsService.create error', error);
      throw error;
    }
  },

  async update(id: string, patch: any) {
    try {
      const { data, error } = await supabase
        .from('recurring_subscriptions')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('recurringSubscriptionsService.update error', error);
      throw error;
    }
  },

  async processPending(userId: string) {
    try {
      if (!userId) return { processed: 0 };

      const todayStr = new Date().toISOString().slice(0, 10);

      const { data: subs, error } = await supabase
        .from('recurring_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('next_billing_date', todayStr);

      if (error) throw error;
      const list = subs ?? [];
      if (list.length === 0) return { processed: 0 };

      let processed = 0;

      for (const sub of list) {
        // Respetar fecha de fin si existe
        if (sub.end_date && sub.end_date < todayStr) {
          await this.update(sub.id, { status: 'expired' });
          continue;
        }

        const amount = Number(sub.amount) || 0;
        if (!amount || !sub.customer_id) continue;

        const invoicePayload = {
          customer_id: sub.customer_id as string,
          invoice_number: `SUB-${Date.now()}-${processed + 1}`,
          invoice_date: todayStr,
          due_date: todayStr,
          currency: 'DOP',
          subtotal: amount,
          tax_amount: 0,
          total_amount: amount,
          paid_amount: 0,
          status: 'pending',
          notes: `Factura recurrente para: ${sub.service_name || 'Suscripción'}`,
        };

        const linesPayload = [
          {
            description: sub.service_name || 'Servicio recurrente',
            quantity: 1,
            unit_price: amount,
            line_total: amount,
            line_number: 1,
          },
        ];

        try {
          const { invoice } = await invoicesService.create(userId, invoicePayload, linesPayload);

          // Calcular próxima fecha de facturación
          let nextDate: string | null = null;
          if (sub.next_billing_date) {
            const d = new Date(sub.next_billing_date as string);
            if (sub.frequency === 'weekly') d.setDate(d.getDate() + 7);
            else if (sub.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
            else if (sub.frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
            else if (sub.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
            nextDate = d.toISOString().slice(0, 10);
          }

          await this.update(sub.id, {
            last_invoice_id: invoice.id,
            next_billing_date: nextDate,
          });

          processed += 1;
        } catch (e) {
          // No detener todo el lote por un error individual
          console.error('recurringSubscriptionsService.processPending item error', e);
        }
      }

      return { processed };
    } catch (error) {
      console.error('recurringSubscriptionsService.processPending error', error);
      return { processed: 0 };
    }
  },
};

/* ==========================================================
   Bank Accounts Service
========================================================== */
export const bankAccountsService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('bank_name', { ascending: true });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: any) {
    try {
      const body = { ...payload, user_id: userId };
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('bankAccountsService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: any) {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('bankAccountsService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('bankAccountsService.delete error', error);
      throw error;
    }
  },
};


/* ==========================================================
   Tax Returns Service
========================================================== */
export const taxReturnsService = {
  async getAll(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tax_returns')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, taxReturn: any) {
    try {
      const { data, error } = await supabase
        .from('tax_returns')
        .insert({ ...taxReturn, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  async update(id: string, taxReturn: any) {
    try {
      const { data, error } = await supabase
        .from('tax_returns')
        .update(taxReturn)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
};

/* ==========================================================
   Tax Service (single consolidated export)
========================================================== */
export const taxService = {
  // -----------------------------------------------------------------
  // NCF Series Management - CORREGIDO COMPLETAMENTE
  // -----------------------------------------------------------------
  async getNcfSeries() {
    try {
      const { data, error } = await supabase
        .from('ncf_series')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting NCF series:', error);
      return [];
    }
  },

  async createNcfSeries(series: any) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      // Preparar los datos asegurando que la fecha esté en formato correcto
      const seriesData = {
        ...series,
        user_id: user?.id,
        expiration_date: series.expiration_date || null, // Permitir null si no hay fecha
        current_number: series.current_number || series.start_number || 1
      };

      // Si expiration_date está vacío, establecerlo como null
      if (seriesData.expiration_date === '') {
        seriesData.expiration_date = null;
      }

      const { data, error } = await supabase
        .from('ncf_series')
        .insert([seriesData])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error creating NCF series:', error);
      throw error;
    }
  },

  async updateNcfSeries(id: string, series: any) {
    try {
      // Preparar los datos asegurando que la fecha esté en formato correcto
      const seriesData = {
        ...series,
        expiration_date: series.expiration_date || null
      };

      // Si expiration_date está vacío, establecerlo como null
      if (seriesData.expiration_date === '') {
        seriesData.expiration_date = null;
      }

      const { data, error } = await supabase
        .from('ncf_series')
        .update(seriesData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error updating NCF series:', error);
      throw error;
    }
  },

  async deleteNcfSeries(id: string) {
    try {
      const { error } = await supabase
        .from('ncf_series')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting NCF series:', error);
      throw error;
    }
  },

  // -----------------------------------------------------------------
  // Tax Configuration
  // -----------------------------------------------------------------
  async getTaxConfiguration() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('tax_configuration')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting tax configuration:', error);
      return null;
    }
  },

  async saveTaxConfiguration(config: any) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('tax_configuration')
        .upsert({ ...config, user_id: user?.id })
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error saving tax configuration:', error);
      throw error;
    }
  },

  // -----------------------------------------------------------------
  // Report Generation - Reporte 606 (Compras)
  // -----------------------------------------------------------------
  async buildReport606(period: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Calcular primer y último día del mes del período (YYYY-MM)
      const [yearStr, monthStr] = period.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr); // 1-12
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

      // 1) Obtener órdenes de compra del período con proveedor
      const { data: purchases, error: poErr } = await supabase
        .from('purchase_orders')
        .select(
          `*,
           suppliers (name, tax_id)`
        )
        .eq('user_id', user.id)
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .neq('status', 'cancelled');

      if (poErr) throw poErr;

      const rows = (purchases || []).map((po: any) => {
        const supplierName = po.suppliers?.name || 'Proveedor';
        const supplierRnc = po.suppliers?.tax_id || '';
        const fecha = po.order_date;
        const monto = Number(po.total_amount) || 0;
        const itbis = Number(po.tax_amount) || 0;

        return {
          period,
          fecha_comprobante: fecha,
          tipo_comprobante: 'B01',
          ncf: po.po_number || po.id,
          tipo_gasto: 'Compras',
          rnc_cedula_proveedor: supplierRnc,
          nombre_proveedor: supplierName,
          monto_facturado: monto,
          itbis_facturado: itbis,
          itbis_retenido: 0,
          monto_retencion_renta: 0,
          tipo_pago: 'Credito',
        };
      });

      // 2) Limpiar datos anteriores del período y guardar los nuevos
      const { error: delErr } = await supabase
        .from('report_606_data')
        .delete()
        .eq('period', period);
      if (delErr) throw delErr;

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from('report_606_data')
          .insert(rows);
        if (insErr) throw insErr;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error building Report 606 data:', error);
      throw error;
    }
  },

  async generateReport606(period: string) {
    try {
      await this.buildReport606(period);
      const { data, error } = await supabase
        .from('report_606_data')
        .select('*')
        .eq('period', period)
        .order('fecha_comprobante');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error generating Report 606:', error);
      throw error;
    }
  },

  async getReport606Summary(period: string) {
    try {
      const { data, error } = await supabase
        .from('report_606_data')
        .select('monto_facturado, itbis_facturado, itbis_retenido, monto_retencion_renta')
        .eq('period', period);

      if (error) throw error;

      const summary = data?.reduce(
        (acc, item) => ({
          totalMonto: acc.totalMonto + (item.monto_facturado || 0),
          totalItbis: acc.totalItbis + (item.itbis_facturado || 0),
          totalRetenido: acc.totalRetenido + (item.itbis_retenido || 0),
          totalISR: acc.totalISR + (item.monto_retencion_renta || 0)
        }),
        { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 }
      );

      return summary || { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 };
    } catch (error) {
      console.error('Error getting Report 606 summary:', error);
      return { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 };
    }
  },

  // -----------------------------------------------------------------
  // Report Generation - Reporte 607 (Ventas) - CORREGIDO COMPLETAMENTE
  // -----------------------------------------------------------------
  async buildReport607(period: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Calcular rango de fechas del mes
      const [yearStr, monthStr] = period.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

      // Obtener facturas del período con cliente
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select(
          `*,
           customers (name, tax_id)`
        )
        .eq('user_id', user.id)
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .neq('status', 'draft');

      if (invErr) throw invErr;

      const rows = (invoices || []).map((inv: any) => {
        const customerName = inv.customers?.name || inv.customer_name || 'Cliente';
        const customerRnc = inv.customers?.tax_id || inv.tax_id || '';
        const fecha = inv.invoice_date;
        const monto = Number(inv.total_amount ?? inv.subtotal ?? 0);
        const itbis = Number(inv.tax_amount ?? 0);

        return {
          period,
          fecha_factura: fecha,
          fecha_comprobante: fecha,
          tipo_comprobante: 'B02',
          ncf: inv.invoice_number || inv.id,
          ncf_modificado: null,
          tipo_ingreso: 'VENTAS',
          rnc_cedula_cliente: customerRnc,
          nombre_cliente: customerName,
          monto_facturado: monto,
          itbis_facturado: itbis,
          tipo_pago: 'Otros',
          itbis_cobrado: itbis,
          monto_facturado_servicios: 0,
          monto_facturado_bienes: monto,
          efectivo: 0,
          tarjeta: 0,
          cheque: 0,
          credito: monto,
        };
      });

      // Limpiar datos anteriores del período y guardar nuevos
      const { error: delErr } = await supabase
        .from('report_607_data')
        .delete()
        .eq('period', period);
      if (delErr) throw delErr;

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from('report_607_data')
          .insert(rows);
        if (insErr) throw insErr;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error building Report 607 data:', error);
      throw error;
    }
  },

  async generateReport607(period: string) {
    try {
      await this.buildReport607(period);
      const { data, error } = await supabase
        .from('report_607_data')
        .select('*')
        .eq('period', period)
        .order('fecha_comprobante');

      if (error) throw error;

      const mappedData = data?.map(item => ({
        rnc_cedula: item.rnc_cedula || item.rnc_cedula_cliente || '',
        tipo_identificacion: (item.rnc_cedula || item.rnc_cedula_cliente || '').length === 11 ? 'RNC' : 'Cédula',
        numero_comprobante_fiscal: item.numero_comprobante_fiscal || item.numero_comprobante || item.ncf || '',
        fecha_comprobante: item.fecha_comprobante || item.fecha_factura || '',
        monto_facturado: item.monto_facturado || 0,
        itbis_facturado: item.itbis_facturado || item.itbis_cobrado || 0,
        itbis_retenido: item.itbis_retenido || 0,
        monto_propina_legal: item.monto_propina_legal || 0,
        itbis_retenido_propina: item.itbis_retenido_propina || 0,
        itbis_percibido_ventas: item.itbis_percibido_ventas || item.itbis_percibido || 0,
        retencion_renta_terceros: item.retencion_renta_terceros || 0,
        isr_percibido_ventas: item.isr_percibido_ventas || 0,
        impuesto_selectivo_consumo: item.impuesto_selectivo_consumo || 0,
        otros_impuestos_tasas: item.otros_impuestos_tasas || 0,
        monto_propina_legal_2: item.monto_propina_legal_2 || 0,
      })) || [];

      return mappedData;
    } catch (error) {
      console.error('Error generating Report 607:', error);
      throw error;
    }
  },

  async getReport607Summary(period: string) {
    try {
      const { data, error } = await supabase
        .from('report_607_data')
        .select('monto_facturado, itbis_facturado, itbis_retenido, retencion_renta_terceros, itbis_cobrado')
        .eq('period', period);

      if (error) throw error;

      const summary = data?.reduce(
        (acc, item) => ({
          totalMonto: acc.totalMonto + (item.monto_facturado || 0),
          totalItbis: acc.totalItbis + (item.itbis_facturado || item.itbis_cobrado || 0),
          totalRetenido: acc.totalRetenido + (item.itbis_retenido || 0),
          totalISR: acc.totalISR + (item.retencion_renta_terceros || 0)
        }),
        { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 }
      );

      return summary || { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 };
    } catch (error) {
      console.error('Error getting Report 607 summary:', error);
      return { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 };
    }
  },

  async buildReport608(period: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const [yearStr, monthStr] = period.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

      const { data: docs, error: fdErr } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'cancelled')
        .gte('cancelled_date', startDate)
        .lte('cancelled_date', endDate);

      if (fdErr) throw fdErr;

      const rows = (docs || []).map((doc: any) => ({
        period,
        cancellation_date: doc.cancelled_date || doc.issue_date,
        tipo_comprobante: doc.document_type || 'NCF',
        ncf: doc.ncf_number,
        ncf_modificado: doc.ncf_modificado || null,
        motivo: doc.cancellation_reason || 'Cancelado',
        amount: Number(doc.amount || 0),
        tax_amount: Number(doc.tax_amount || 0),
      }));

      const { error: delErr } = await supabase
        .from('report_608_data')
        .delete()
        .eq('period', period);
      if (delErr) throw delErr;

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from('report_608_data')
          .insert(rows);
        if (insErr) throw insErr;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error building Report 608 data:', error);
      throw error;
    }
  },

  async generateReport608(period: string) {
    try {
      await this.buildReport608(period);
      const { data, error } = await supabase
        .from('report_608_data')
        .select('*')
        .eq('period', period)
        .order('cancellation_date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error generating Report 608:', error);
      throw error;
    }
  },

  async getReport608Summary(period: string) {
    try {
      const { data, error } = await supabase
        .from('report_608_data')
        .select('amount, tax_amount')
        .eq('period', period);

      if (error) throw error;

      const summary = data?.reduce(
        (acc, item) => ({
          totalAmount: acc.totalAmount + (item.amount || 0),
          totalTax: acc.totalTax + (item.tax_amount || 0),
          count: acc.count + 1
        }),
        { totalAmount: 0, totalTax: 0, count: 0 }
      );

      return summary || { totalAmount: 0, totalTax: 0, count: 0 };
    } catch (error) {
      console.error('Error getting Report 608 summary:', error);
      return { totalAmount: 0, totalTax: 0, count: 0 };
    }
  },

  // -----------------------------------------------------------------
  // Report Generation - Reporte 623 (Pagos al Exterior)
  // -----------------------------------------------------------------
  async generateReport623(period: string) {
    try {
      const { data, error } = await supabase
        .from('report_623_data')
        .select('*')
        .eq('period', period)
        .order('payment_date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error generating Report 623:', error);
      throw error;
    }
  },

  async getReport623Summary(period: string) {
    try {
      const { data, error } = await supabase
        .from('report_623_data')
        .select('amount_usd, amount_dop, tax_withheld')
        .eq('period', period);

      if (error) throw error;

      const summary = data?.reduce(
        (acc, item) => ({
          totalUSD: acc.totalUSD + (item.amount_usd || 0),
          totalDOP: acc.totalDOP + (item.amount_dop || 0),
          totalTax: acc.totalTax + (item.tax_withheld || 0),
          count: acc.count + 1
        }),
        { totalUSD: 0, totalDOP: 0, totalTax: 0, count: 0 }
      );

      return summary || { totalUSD: 0, totalDOP: 0, totalTax: 0, count: 0 };
    } catch (error) {
      console.error('Error getting Report 623 summary:', error);
      return { totalUSD: 0, totalDOP: 0, totalTax: 0, count: 0 };
    }
  },

  // -----------------------------------------------------------------
  // Report Generation - Reporte IR-17 (Retenciones ISR)
  // -----------------------------------------------------------------
  async buildReportIR17(period: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const [yearStr, monthStr] = period.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

      // Obtener tasa de retención desde tax_settings (si existe)
      const { data: taxSettings } = await supabase
        .from('tax_settings')
        .select('retention_rate')
        .limit(1)
        .maybeSingle();

      const defaultRate = 10; // 10% por defecto si no hay configuración
      const retentionRate = Number(taxSettings?.retention_rate ?? defaultRate);

      // Pagos a suplidores del período
      const { data: payments, error: payErr } = await supabase
        .from('supplier_payments')
        .select(
          `*,
           suppliers (name, tax_id)`
        )
        .eq('user_id', user.id)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .in('status', ['completed', 'Completado']);

      if (payErr) throw payErr;

      const rows = (payments || []).map((p: any) => {
        const gross = Number(p.amount || 0);
        const rate = retentionRate;
        const withheld = (gross * rate) / 100;
        const net = gross - withheld;

        return {
          user_id: user.id,
          period,
          supplier_rnc: p.suppliers?.tax_id || null,
          supplier_name: p.suppliers?.name || null,
          payment_date: p.payment_date,
          service_type: p.description || p.method || null,
          gross_amount: gross,
          withholding_rate: rate,
          withheld_amount: withheld,
          net_amount: net,
        };
      });

      // Limpiar datos anteriores del período para este usuario
      const { error: delErr } = await supabase
        .from('report_ir17_data')
        .delete()
        .eq('period', period)
        .eq('user_id', user.id);
      if (delErr) throw delErr;

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from('report_ir17_data')
          .insert(rows);
        if (insErr) throw insErr;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error building Report IR-17 data:', error);
      throw error;
    }
  },

  async generateReportIR17(period: string) {
    try {
      await this.buildReportIR17(period);
      const { data, error } = await supabase
        .from('report_ir17_data')
        .select('*')
        .eq('period', period)
        .order('payment_date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error generating Report IR-17:', error);
      throw error;
    }
  },

  async getReportIR17Summary(period: string) {
    try {
      const { data, error } = await supabase
        .from('report_ir17_data')
        .select('gross_amount, withheld_amount, net_amount')
        .eq('period', period);

      if (error) throw error;

      const summary = data?.reduce(
        (acc, item) => ({
          totalGross: acc.totalGross + (item.gross_amount || 0),
          totalWithheld: acc.totalWithheld + (item.withheld_amount || 0),
          totalNet: acc.totalNet + (item.net_amount || 0),
          count: acc.count + 1
        }),
        { totalGross: 0, totalWithheld: 0, totalNet: 0, count: 0 }
      );

      return summary || { totalGross: 0, totalWithheld: 0, totalNet: 0, count: 0 };
    } catch (error) {
      console.error('Error getting Report IR-17 summary:', error);
      return { totalGross: 0, totalWithheld: 0, totalNet: 0, count: 0 };
    }
  },

  // -----------------------------------------------------------------
  // Report Generation - Reporte IT-1 (Declaración ITBIS) - MEJORADO
  // -----------------------------------------------------------------
  async generateReportIT1(period: string) {
    try {
      // Verificar si ya existe una declaración para este período
      const { data: existing, error: existingError } = await supabase
        .from('report_it1_data')
        .select('*')
        .eq('period', period)
        .maybeSingle();

      if (!existingError && existing) {
        return existing;
      }

      // Obtener datos de ventas y compras para el período
      const [salesResponse, purchasesResponse] = await Promise.all([
        supabase.from('report_607_data').select('*').eq('period', period),
        supabase.from('report_606_data').select('*').eq('period', period)
      ]);

      // Calcular totales de ventas
      const totalSales = salesResponse.data?.reduce(
        (sum, item) => sum + (item.monto_facturado || 0),
        0
      ) || 0;
      
      const itbisCollected = salesResponse.data?.reduce(
        (sum, item) => sum + (item.itbis_facturado || 0),
        0
      ) || 0;

      // Calcular totales de compras
      const totalPurchases = purchasesResponse.data?.reduce(
        (sum, item) => sum + (item.monto_facturado || 0),
        0
      ) || 0;
      
      const itbisPaid = purchasesResponse.data?.reduce(
        (sum, item) => sum + (item.itbis_facturado || 0),
        0
      ) || 0;

      // Calcular ITBIS neto a pagar
      const netItbisDue = itbisCollected - itbisPaid;

      // Construir la declaración SIEMPRE con datos reales (o ceros si no hay datos)
      const reportData = {
        period,
        total_sales: totalSales,
        itbis_collected: itbisCollected,
        total_purchases: totalPurchases,
        itbis_paid: itbisPaid,
        net_itbis_due: netItbisDue,
        generated_date: new Date().toISOString()
      };

      // Guardar la declaración en la base de datos
      const { data, error } = await supabase
        .from('report_it1_data')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating Report IT-1:', error);
      throw error;
    }
  },

  async getReportIT1Summary() {
    try {
      const { data, error } = await supabase
        .from('report_it1_data')
        .select('*')
        .order('period', { ascending: false })
        .limit(12);

      if (error) throw error;

      const totalDeclaraciones = data?.length || 0;
      const totalVentasGravadas = data?.reduce((sum, item) => sum + (item.total_sales || 0), 0) || 0;
      const totalITBISCobrado = data?.reduce((sum, item) => sum + (item.itbis_collected || 0), 0) || 0;
      const totalComprasGravadas = data?.reduce((sum, item) => sum + (item.total_purchases || 0), 0) || 0;
      const totalITBISPagado = data?.reduce((sum, item) => sum + (item.itbis_paid || 0), 0) || 0;
      const saldoNeto = totalITBISCobrado - totalITBISPagado;
      const ultimaDeclaracion = data?.[0]?.period || null;

      return {
        totalDeclaraciones,
        totalVentasGravadas,
        totalITBISCobrado,
        totalComprasGravadas,
        totalITBISPagado,
        saldoNeto,
        ultimaDeclaracion
      };
    } catch (error) {
      console.error('Error getting Report IT-1 summary:', error);
      return {
        totalDeclaraciones: 0,
        totalVentasGravadas: 0,
        totalITBISCobrado: 0,
        totalComprasGravadas: 0,
        totalITBISPagado: 0,
        saldoNeto: 0,
        ultimaDeclaracion: null
      };
    }
  },

  async getReportIT1History(year?: string) {
    try {
      let query = supabase
        .from('report_it1_data')
        .select('*')
        .order('period', { ascending: false });

      if (year) {
        query = query.like('period', `${year}-%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting Report IT-1 history:', error);
      return [];
    }
  },

  async updateReportIT1(id: string, reportData: any) {
    try {
      const { data, error } = await supabase
        .from('report_it1_data')
        .update(reportData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating Report IT-1:', error);
      throw error;
    }
  },

  async deleteReportIT1(id: string) {
    try {
      const { error } = await supabase
        .from('report_it1_data')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting Report IT-1:', error);
      throw error;
    }
  },

  async saveReportIT1Data(reportData: any) {
    try {
      const { data, error } = await supabase
        .from('report_it1_data')
        .upsert(reportData, { onConflict: 'period' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving Report IT-1 data:', error);
      throw error;
    }
  },

  async getReportIT1ByPeriod(period: string) {
    try {
      const { data, error } = await supabase
        .from('report_it1_data')
        .select('*')
        .eq('period', period)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting Report IT-1 by period:', error);
      return null;
    }
  },

  async validateReportIT1Data(reportData: any) {
    const errors = [];

    if (!reportData.period) {
      errors.push('El período es requerido');
    }

    if (reportData.total_sales < 0) {
      errors.push('El total de ventas no puede ser negativo');
    }

    if (reportData.itbis_collected < 0) {
      errors.push('El ITBIS cobrado no puede ser negativo');
    }

    if (reportData.total_purchases < 0) {
      errors.push('El total de compras no puede ser negativo');
    }

    if (reportData.itbis_paid < 0) {
      errors.push('El ITBIS pagado no puede ser negativo');
    }

    // Validar que el ITBIS cobrado no exceda el 18% de las ventas
    const maxItbisCollected = reportData.total_sales * 0.18;
    if (reportData.itbis_collected > maxItbisCollected * 1.1) { // 10% de tolerancia
      errors.push('El ITBIS cobrado parece excesivo para el monto de ventas');
    }

    // Validar que el ITBIS pagado no exceda el 18% de las compras
    const maxItbisPaid = reportData.total_purchases * 0.18;
    if (reportData.itbis_paid > maxItbisPaid * 1.1) { // 10% de tolerancia
      errors.push('El ITBIS pagado parece excesivo para el monto de compras');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // -----------------------------------------------------------------
  // Formulario 607 CRUD
  // -----------------------------------------------------------------
  async getFormulario607Records() {
    try {
      const { data, error } = await supabase
        .from('formulario_607')
        .select('*')
        .order('fecha_factura', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Formulario 607 records:', error);
      throw error;
    }
  },

  async createFormulario607Record(record: any) {
    try {
      const { data, error } = await supabase
        .from('formulario_607')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating Formulario 607 record:', error);
      throw error;
    }
  },

  async updateFormulario607Record(id: string, record: any) {
    try {
      const { data, error } = await supabase
        .from('formulario_607')
        .update(record)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating Formulario 607 record:', error);
      throw error;
    }
  },

  async deleteFormulario607Record(id: string) {
    try {
      const { error } = await supabase
        .from('formulario_607')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting Formulario 607 record:', error);
      throw error;
    }
  },

  // -----------------------------------------------------------------
  // Tax Statistics
  // -----------------------------------------------------------------
  async getTaxStatistics() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const [salesResponse, purchasesResponse] = await Promise.all([
        supabase.from('report_607_data').select('*').eq('period', currentMonth),
        supabase.from('report_606_data').select('*').eq('period', currentMonth)
      ]);

      const itbisCobrado = salesResponse.data?.reduce(
        (sum, item) => sum + (item.itbis_facturado || 0),
        0
      );
      const itbisPagado = purchasesResponse.data?.reduce(
        (sum, item) => sum + (item.itbis_facturado || 0),
        0
      );
      const retenciones = salesResponse.data?.reduce(
        (sum, item) => sum + (item.retencion_renta_terceros || 0),
        0
      );

      return {
        itbis_cobrado: itbisCobrado ?? 0,
        itbis_pagado: itbisPagado ?? 0,
        itbis_neto: (itbisCobrado ?? 0) - (itbisPagado ?? 0),
        retenciones: retenciones ?? 0
      };
    } catch (error) {
      console.error('Error getting tax statistics:', error);
      throw error;
    }
  }
};

/* ==========================================================
   Settings Service (consolidated)
========================================================== */
export const settingsService = {
  // Company Info
  async getCompanyInfo() {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();

      // When the table is empty Supabase returns error code "PGRST116"
      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    } catch (error) {
      console.error('Error getting company info:', error);
      return null;
    }
  },

  async saveCompanyInfo(companyInfo: any) {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .upsert(companyInfo)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving company info:', error);
      throw error;
    }
  },

  // Users
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  async createUser(userData: any) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async updateUserStatus(userId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  },

  // Accounting Settings
  async getAccountingSettings() {
    try {
      const { data, error } = await supabase
        .from('accounting_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    } catch (error) {
      console.error('Error getting accounting settings:', error);
      return null;
    }
  },

  async saveAccountingSettings(settings: any) {
    try {
      const { data, error } = await supabase
        .from('accounting_settings')
        .upsert(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving accounting settings:', error);
      throw error;
    }
  },

  // Tax Settings
  async getTaxSettings() {
    try {
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    } catch (error) {
      console.error('Error getting tax settings:', error);
      return null;
    }
  },

  async saveTaxSettings(settings: any) {
    try {
      const { data, error } = await supabase
        .from('tax_settings')
        .upsert(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving tax settings:', error);
      throw error;
    }
  },

  // Tax Rates
  async getTaxRates() {
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('Error getting tax rates:', error);
      return [];
    }
  },

  async createTaxRate(rateData: any) {
    try {
      const { data, error } = await supabase
        .from('tax_rates')
        .insert(rateData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tax rate:', error);
      throw error;
    }
  },

  // Inventory Settings
  async getInventorySettings() {
    try {
      const { data, error } = await supabase
        .from('inventory_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    } catch (error) {
      console.error('Error getting inventory settings:', error);
      return null;
    }
  },

  async saveInventorySettings(settings: any) {
    try {
      const normalized = {
        ...settings,
        default_warehouse: settings.default_warehouse || null
      };
      const { data, error } = await supabase
        .from('inventory_settings')
        .upsert(normalized)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving inventory settings:', error);
      throw error;
    }
  },

  // Data Backups
  async getBackups() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('data_backups')
        .select('*')
        .eq('user_id', user.id)
        .order('backup_date', { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('Error getting data backups:', error);
      return [];
    }
  },

  async createBackup(options?: { backup_type?: string; backup_name?: string; retention_days?: number }) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) throw new Error('Usuario no autenticado');

      const safeSingle = async (query: any) => {
        try {
          const { data, error } = await query;
          if (error && error.code !== 'PGRST116') throw error;
          if (Array.isArray(data)) return data[0] ?? null;
          return data ?? null;
        } catch (e) {
          console.error('Backup safeSingle error:', e);
          return null;
        }
      };

      const safeList = async (query: any) => {
        try {
          const { data, error } = await query;
          if (error && error.code !== 'PGRST116') throw error;
          return data ?? [];
        } catch (e) {
          console.error('Backup safeList error:', e);
          return [];
        }
      };

      // Settings (una sola fila cada una)
      const companyInfo = await safeSingle(
        supabase.from('company_info').select('*').limit(1)
      );
      const accountingSettings = await safeSingle(
        supabase.from('accounting_settings').select('*').limit(1)
      );
      const taxSettings = await safeSingle(
        supabase.from('tax_settings').select('*').limit(1)
      );
      const inventorySettings = await safeSingle(
        supabase.from('inventory_settings').select('*').limit(1)
      );
      const payrollSettings = await safeSingle(
        supabase.from('payroll_settings').select('*').limit(1)
      );

      // Catálogos (por usuario)
      const customers = await safeList(
        supabase.from('customers').select('*').eq('user_id', user.id)
      );
      const suppliers = await safeList(
        supabase.from('suppliers').select('*').eq('user_id', user.id)
      );
      const chartAccounts = await safeList(
        supabase.from('chart_accounts').select('*').eq('user_id', user.id)
      );
      const products = await safeList(
        supabase.from('inventory_items').select('*').eq('user_id', user.id)
      );
      const warehouses = await safeList(
        supabase.from('warehouses').select('*')
      );

      // Movimientos principales (por usuario)
      const invoices = await safeList(
        supabase.from('invoices').select('*').eq('user_id', user.id)
      );
      const supplierPayments = await safeList(
        supabase.from('supplier_payments').select('*').eq('user_id', user.id)
      );
      const journalEntries = await safeList(
        supabase.from('journal_entries').select('*').eq('user_id', user.id)
      );
      const journalEntryLines = await safeList(
        supabase.from('journal_entry_lines').select('*')
      );
      const pettyFunds = await safeList(
        supabase.from('petty_cash_funds').select('*').eq('user_id', user.id)
      );
      const pettyExpenses = await safeList(
        supabase.from('petty_cash_expenses').select('*').eq('user_id', user.id)
      );
      const pettyReimbursements = await safeList(
        supabase.from('petty_cash_reimbursements').select('*').eq('user_id', user.id)
      );
      const fixedAssets = await safeList(
        supabase.from('fixed_assets').select('*').eq('user_id', user.id)
      );
      const fixedDepreciations = await safeList(
        supabase.from('fixed_asset_depreciations').select('*').eq('user_id', user.id)
      );
      const fixedDisposals = await safeList(
        supabase.from('fixed_asset_disposals').select('*').eq('user_id', user.id)
      );

      const backupPayload = {
        version: 1,
        generated_at: new Date().toISOString(),
        user_id: user.id,
        settings: {
          company_info: companyInfo,
          accounting_settings: accountingSettings,
          tax_settings: taxSettings,
          inventory_settings: inventorySettings,
          payroll_settings: payrollSettings,
        },
        catalogs: {
          customers,
          suppliers,
          chart_accounts: chartAccounts,
          products,
          warehouses,
        },
        movements: {
          invoices,
          supplier_payments: supplierPayments,
          journal_entries: journalEntries,
          journal_entry_lines: journalEntryLines,
          petty_cash_funds: pettyFunds,
          petty_cash_expenses: pettyExpenses,
          petty_cash_reimbursements: pettyReimbursements,
          fixed_assets: fixedAssets,
          fixed_asset_depreciations: fixedDepreciations,
          fixed_asset_disposals: fixedDisposals,
        },
      };

      const serialized = JSON.stringify(backupPayload);
      const approximateSize = new Blob([serialized]).size;

      const now = new Date().toISOString();
      const payload: any = {
        user_id: user.id,
        backup_type: options?.backup_type || 'manual',
        backup_name: options?.backup_name || `Respaldo ${now}`,
        backup_data: backupPayload,
        backup_date: now,
        status: 'completed',
        retention_days: options?.retention_days ?? 30,
        file_size: approximateSize,
      };

      const { data, error } = await supabase
        .from('data_backups')
        .insert(payload)
        .select()
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating data backup:', error);
      throw error;
    }
  },

  async deleteBackup(id: string) {
    try {
      const { error } = await supabase
        .from('data_backups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting data backup:', error);
      throw error;
    }
  },

  // Warehouses
  async getWarehouses() {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('Error getting warehouses:', error);
      return [];
    }
  },

  async createWarehouse(warehouseData: any) {
    try {
      const generatedCode = (warehouseData.code || warehouseData.name || 'ALM')
        .toString()
        .trim()
        .substring(0, 8)
        .toUpperCase();
      const payload = {
        name: warehouseData.name,
        code: generatedCode,
        address: warehouseData.address ?? null,
        manager: warehouseData.manager ?? null,
        phone: warehouseData.phone ?? null,
        active: warehouseData.active !== false,
      };
      const { data, error } = await supabase
        .from('warehouses')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating warehouse:', error);
      throw error;
    }
  },

  async updateWarehouse(id: string, warehouseData: any) {
    try {
      const safeCode = (warehouseData.code || warehouseData.name || 'ALM')
        .toString()
        .trim()
        .substring(0, 8)
        .toUpperCase();
      const payload = {
        name: warehouseData.name,
        code: safeCode,
        address: warehouseData.address ?? null,
        manager: warehouseData.manager ?? null,
        phone: warehouseData.phone ?? null,
        active: warehouseData.active !== false,
      };
      const { data, error } = await supabase
        .from('warehouses')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }
  },

  // Payroll Settings
  async getPayrollSettings() {
    try {
      const { data, error } = await supabase
        .from('payroll_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    } catch (error) {
      console.error('Error getting payroll settings:', error);
      return null;
    }
  },

  async savePayrollSettings(settings: any) {
    try {
      const { data, error } = await supabase
        .from('payroll_settings')
        .upsert(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving payroll settings:', error);
      throw error;
    }
  },

  // Payroll Concepts
  async getPayrollConcepts() {
    try {
      const { data, error } = await supabase
        .from('payroll_concepts')
        .select('*')
        .order('name');

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('Error getting payroll concepts:', error);
      return [];
    }
  },

  async createPayrollConcept(conceptData: any) {
    try {
      const safeName = (conceptData.name || 'CONCEPTO')
        .toString()
        .trim()
        .substring(0, 20)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
      const generatedCode = `${safeName}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const payload = {
        ...conceptData,
        code: conceptData.code || generatedCode,
      };
      const { data, error } = await supabase
        .from('payroll_concepts')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payroll concept:', error);
      throw error;
    }
  },

  // Payroll Tax Brackets (ISR)
  async getPayrollTaxBrackets() {
    try {
      const { data, error } = await supabase
        .from('payroll_tax_brackets')
        .select('*')
        .order('min_amount');

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('Error getting payroll tax brackets:', error);
      return [];
    }
  },

  async createPayrollTaxBracket(bracketData: any) {
    try {
      const { data, error } = await supabase
        .from('payroll_tax_brackets')
        .insert(bracketData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payroll tax bracket:', error);
      throw error;
    }
  },

  async updatePayrollTaxBracket(id: string, bracketData: any) {
    try {
      const { data, error } = await supabase
        .from('payroll_tax_brackets')
        .update(bracketData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating payroll tax bracket:', error);
      throw error;
    }
  },

  async deletePayrollTaxBracket(id: string) {
    try {
      const { error } = await supabase
        .from('payroll_tax_brackets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting payroll tax bracket:', error);
      throw error;
    }
  }
};

/* ==========================================================
  Fixed Asset Types Service
  Tabla: fixed_asset_types
========================================================== */
export const assetTypesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('fixed_asset_types')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('assetTypesService.getAll error', error);
      return [];
    }
  },

  async create(userId: string, payload: any) {
    try {
      const insertPayload = {
        ...payload,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('fixed_asset_types')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('assetTypesService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: any) {
    try {
      const { data, error } = await supabase
        .from('fixed_asset_types')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('assetTypesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('fixed_asset_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('assetTypesService.delete error', error);
      throw error;
    }
  },
};

/* ==========================================================
  Fixed Assets Service
  Tabla: fixed_assets
========================================================== */
export const fixedAssetsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('fixed_assets')
        .select('*')
        .eq('user_id', userId)
        .order('code');

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('fixedAssetsService.getAll error', error);
      return [];
    }
  },

  async create(userId: string, payload: any) {
    try {
      const insertPayload = {
        ...payload,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('fixed_assets')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('fixedAssetsService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: any) {
    try {
      const { data, error } = await supabase
        .from('fixed_assets')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('fixedAssetsService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('fixed_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('fixedAssetsService.delete error', error);
      throw error;
    }
  },
};

/* ==========================================================
  Fixed Asset Disposals Service
  Tabla: fixed_asset_disposals
========================================================== */
export const assetDisposalService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('fixed_asset_disposals')
        .select('*')
        .eq('user_id', userId)
        .order('disposal_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('assetDisposalService.getAll error', error);
      return [];
    }
  },

  async create(userId: string, payload: any) {
    try {
      const insertPayload = {
        ...payload,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('fixed_asset_disposals')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('assetDisposalService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: any) {
    try {
      const { data, error } = await supabase
        .from('fixed_asset_disposals')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('assetDisposalService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('fixed_asset_disposals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('assetDisposalService.delete error', error);
      throw error;
    }
  },
};

/* ==========================================================
  Fixed Asset Depreciation Service
  Tabla: fixed_asset_depreciations
========================================================== */
export const assetDepreciationService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('fixed_asset_depreciations')
        .select('*')
        .eq('user_id', userId)
        .order('depreciation_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('assetDepreciationService.getAll error', error);
      return [];
    }
  },

  async createMany(userId: string, records: any[]) {
    try {
      if (!userId || !Array.isArray(records) || records.length === 0) return [];
      const payload = records.map((r) => ({
        ...r,
        user_id: userId,
      }));

      const { data, error } = await supabase
        .from('fixed_asset_depreciations')
        .insert(payload)
        .select('*');

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('assetDepreciationService.createMany error', error);
      throw error;
    }
  },

  async update(id: string, payload: any) {
    try {
      const { data, error } = await supabase
        .from('fixed_asset_depreciations')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('assetDepreciationService.update error', error);
      throw error;
    }
  },
};

/* ==========================================================
  Fixed Asset Revaluations Service
  Tabla: fixed_asset_revaluations
========================================================== */
export const revaluationService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('fixed_asset_revaluations')
        .select('*')
        .eq('user_id', userId)
        .order('revaluation_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    } catch (error) {
      console.error('revaluationService.getAll error', error);
      return [];
    }
  },

  async create(userId: string, payload: any) {
    try {
      const insertPayload = {
        ...payload,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('fixed_asset_revaluations')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('revaluationService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: any) {
    try {
      const { data, error } = await supabase
        .from('fixed_asset_revaluations')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('revaluationService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('fixed_asset_revaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('revaluationService.delete error', error);
      throw error;
    }
  },
};
