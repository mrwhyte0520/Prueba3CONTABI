
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
   Bank Charges Service
   Tabla: bank_charges
========================================================== */
export const bankChargesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_charges')
        .select('*')
        .eq('user_id', userId)
        .order('charge_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, charge: {
    bank_id: string;
    currency: string;
    amount: number;
    charge_date: string;
    ncf: string;
    description: string;
    expense_account_code: string;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...charge,
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_charges')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      // Asiento contable automático: Debe gasto financiero / Haber banco
      try {
        const amount = Number(charge.amount) || 0;
        if (amount > 0) {
          // Buscar cuenta de gasto por código
          const { data: expenseAccount, error: expenseError } = await supabase
            .from('chart_accounts')
            .select('id')
            .eq('user_id', userId)
            .eq('code', charge.expense_account_code)
            .maybeSingle();

          // Buscar banco y su cuenta contable
          const { data: bank, error: bankError } = await supabase
            .from('bank_accounts')
            .select('chart_account_id, bank_name')
            .eq('id', charge.bank_id)
            .maybeSingle();

          if (!expenseError && !bankError && expenseAccount?.id && bank?.chart_account_id) {
            const entryPayload = {
              entry_number: `BCG-${new Date(charge.charge_date).toISOString().slice(0, 10)}-${(data.id || '').toString().slice(0, 6)}`,
              entry_date: String(charge.charge_date),
              description: charge.description || `Cargo bancario ${bank.bank_name || ''}`.trim(),
              reference: data.id ? String(data.id) : null,
              status: 'posted' as const,
            };

            const lines = [
              {
                account_id: expenseAccount.id as string,
                description: charge.description || 'Cargo bancario - Gastos financieros',
                debit_amount: amount,
                credit_amount: 0,
              },
              {
                account_id: bank.chart_account_id as string,
                description: `Cargo bancario - Banco ${bank.bank_name || ''}`.trim(),
                debit_amount: 0,
                credit_amount: amount,
              },
            ];

            await journalEntriesService.createWithLines(userId, entryPayload, lines);
          }
        }
      } catch (jeError) {
        // No interrumpir si falla la parte contable
        console.error('bankChargesService.create journal entry error', jeError);
      }

      return data;
    } catch (error) {
      console.error('bankChargesService.create error', error);
      throw error;
    }
  },
};

export const bankReconciliationsListService = {
  async getAllByUser(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .select('*')
        .eq('user_id', userId)
        .order('reconciliation_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },
};

/* ==========================================================
   Journal Entries Service
   Tablas: journal_entries, journal_entry_lines
========================================================== */
export const journalEntriesService = {
  async createWithLines(userId: string, entry: {
    entry_number: string;
    entry_date: string;
    description: string;
    reference?: string | null;
    status?: 'draft' | 'posted' | 'reversed';
  }, lines: Array<{
    account_id: string;
    description?: string;
    debit_amount?: number;
    credit_amount?: number;
    line_number?: number;
  }>) {
    if (!userId) throw new Error('userId required');
    if (!lines || lines.length === 0) throw new Error('journal entry lines required');

    const normalizedLines = lines.map((l, idx) => ({
      account_id: l.account_id,
      description: l.description ?? entry.description,
      debit_amount: Number(l.debit_amount || 0),
      credit_amount: Number(l.credit_amount || 0),
      line_number: l.line_number ?? idx + 1,
    }));

    const totalDebit = normalizedLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
    const totalCredit = normalizedLines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);

    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      throw new Error('El asiento contable no está balanceado entre débitos y créditos');
    }

    const now = new Date().toISOString();

    const entryPayload = {
      user_id: userId,
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      description: entry.description,
      reference: entry.reference ?? null,
      status: entry.status ?? 'posted',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_at: now,
      updated_at: now,
    };

    const { data: createdEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert(entryPayload)
      .select('*')
      .single();

    if (entryError) {
      console.error('journalEntriesService.createWithLines entry error', entryError);
      throw entryError;
    }

    const linesPayload = normalizedLines.map((l) => ({
      ...l,
      journal_entry_id: createdEntry.id,
      created_at: now,
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(linesPayload);

    if (linesError) {
      console.error('journalEntriesService.createWithLines lines error', linesError);
      throw linesError;
    }

    return createdEntry;
  },

  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },
};

/* ==========================================================
   Bank Credits Service
   Tabla: bank_credits
========================================================== */
export const bankCreditsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_credits')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, credit: {
    bank_id: string;
    bank_account_code: string;
    credit_number: string;
    currency: string;
    amount: number;
    start_date: string;
    interest_rate?: number | null;
    description: string;
    loan_account_code?: string;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...credit,
        status: 'active',
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_credits')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      // Asiento contable automático: Debe banco / Haber pasivo del préstamo
      try {
        const amount = Number(credit.amount) || 0;
        if (amount > 0 && credit.loan_account_code) {
          // Cuenta de pasivo (préstamo) por código
          const { data: loanAccount, error: loanError } = await supabase
            .from('chart_accounts')
            .select('id')
            .eq('user_id', userId)
            .eq('code', credit.loan_account_code)
            .maybeSingle();

          // Cuenta del banco (activo)
          const { data: bank, error: bankError } = await supabase
            .from('bank_accounts')
            .select('chart_account_id, bank_name')
            .eq('id', credit.bank_id)
            .maybeSingle();

          if (!loanError && !bankError && loanAccount?.id && bank?.chart_account_id) {
            const entryPayload = {
              entry_number: `CRD-${new Date(credit.start_date).toISOString().slice(0, 10)}-${(data.id || '').toString().slice(0, 6)}`,
              entry_date: String(credit.start_date),
              description: credit.description || `Crédito bancario ${credit.credit_number || ''}`.trim(),
              reference: data.id ? String(data.id) : null,
              status: 'posted' as const,
            };

            const lines = [
              {
                account_id: bank.chart_account_id as string,
                description: `Crédito recibido - Banco ${bank.bank_name || ''}`.trim(),
                debit_amount: amount,
                credit_amount: 0,
              },
              {
                account_id: loanAccount.id as string,
                description: credit.description || 'Pasivo por préstamo bancario',
                debit_amount: 0,
                credit_amount: amount,
              },
            ];

            await journalEntriesService.createWithLines(userId, entryPayload, lines);
          }
        }
      } catch (jeError) {
        console.error('bankCreditsService.create journal entry error', jeError);
      }

      return data;
    } catch (error) {
      console.error('bankCreditsService.create error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Bank Transfers Service
   Tabla: bank_transfers
========================================================== */
export const bankTransfersService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_transfers')
        .select('*')
        .eq('user_id', userId)
        .order('transfer_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, transfer: {
    from_bank_id: string;
    from_bank_account_code: string;
    to_bank_id?: string | null;
    to_bank_account_code?: string | null;
    currency: string;
    amount: number;
    transfer_date: string;
    reference: string;
    description: string;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...transfer,
        status: 'issued',
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_transfers')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      // Asiento contable automático para transferencias internas: Debe banco destino / Haber banco origen
      try {
        const amount = Number(transfer.amount) || 0;
        if (amount > 0 && transfer.to_bank_id) {
          const { data: originBank, error: originError } = await supabase
            .from('bank_accounts')
            .select('chart_account_id, bank_name')
            .eq('id', transfer.from_bank_id)
            .maybeSingle();

          const { data: destBank, error: destError } = await supabase
            .from('bank_accounts')
            .select('chart_account_id, bank_name')
            .eq('id', transfer.to_bank_id)
            .maybeSingle();

          if (!originError && !destError && originBank?.chart_account_id && destBank?.chart_account_id) {
            const entryPayload = {
              entry_number: `TRF-${new Date(transfer.transfer_date).toISOString().slice(0, 10)}-${(data.id || '').toString().slice(0, 6)}`,
              entry_date: String(transfer.transfer_date),
              description: transfer.description || 'Transferencia bancaria interna',
              reference: data.id ? String(data.id) : null,
              status: 'posted' as const,
            };

            const lines = [
              {
                account_id: destBank.chart_account_id as string,
                description: `Transferencia recibida - Banco ${destBank.bank_name || ''}`.trim(),
                debit_amount: amount,
                credit_amount: 0,
              },
              {
                account_id: originBank.chart_account_id as string,
                description: `Transferencia enviada - Banco ${originBank.bank_name || ''}`.trim(),
                debit_amount: 0,
                credit_amount: amount,
              },
            ];

            await journalEntriesService.createWithLines(userId, entryPayload, lines);
          }
        }
      } catch (jeError) {
        console.error('bankTransfersService.create journal entry error', jeError);
      }

      return data;
    } catch (error) {
      console.error('bankTransfersService.create error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Bank Checks Service
   Tabla: bank_checks
========================================================== */
export const bankChecksService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_checks')
        .select('*')
        .eq('user_id', userId)
        .order('check_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, check: {
    bank_id: string;
    bank_account_code: string;
    check_number: string;
    payee_name: string;
    currency: string;
    amount: number;
    check_date: string;
    description: string;
    expense_account_code?: string;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...check,
        status: 'issued',
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_checks')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      // Asiento contable automático: Debe gasto/proveedor / Haber banco
      try {
        const amount = Number(check.amount) || 0;
        if (amount > 0 && check.expense_account_code) {
          // Buscar cuenta de gasto/proveedor por código
          const { data: expenseAccount, error: expenseError } = await supabase
            .from('chart_accounts')
            .select('id')
            .eq('user_id', userId)
            .eq('code', check.expense_account_code)
            .maybeSingle();

          // Buscar banco y su cuenta contable
          const { data: bank, error: bankError } = await supabase
            .from('bank_accounts')
            .select('chart_account_id, bank_name')
            .eq('id', check.bank_id)
            .maybeSingle();

          if (!expenseError && !bankError && expenseAccount?.id && bank?.chart_account_id) {
            const entryPayload = {
              entry_number: `CHK-${new Date(check.check_date).toISOString().slice(0, 10)}-${(data.id || '').toString().slice(0, 6)}`,
              entry_date: String(check.check_date),
              description: check.description || `Cheque a ${check.payee_name}`.trim(),
              reference: data.id ? String(data.id) : null,
              status: 'posted' as const,
            };

            const lines = [
              {
                account_id: expenseAccount.id as string,
                description: check.description || 'Pago mediante cheque',
                debit_amount: amount,
                credit_amount: 0,
              },
              {
                account_id: bank.chart_account_id as string,
                description: `Cheque bancario - Banco ${bank.bank_name || ''}`.trim(),
                debit_amount: 0,
                credit_amount: amount,
              },
            ];

            await journalEntriesService.createWithLines(userId, entryPayload, lines);
          }
        }
      } catch (jeError) {
        console.error('bankChecksService.create journal entry error', jeError);
      }

      return data;
    } catch (error) {
      console.error('bankChecksService.create error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Bank Payment Requests Service
   Tabla: bank_payment_requests
========================================================== */
export const paymentRequestsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_payment_requests')
        .select('*')
        .eq('user_id', userId)
        .order('request_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, request: {
    bank_id: string;
    bank_account_code: string;
    payee_name: string;
    currency: string;
    amount: number;
    request_date: string;
    description: string;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...request,
        status: 'pending',
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_payment_requests')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('paymentRequestsService.create error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Bank Deposits Service
   Tabla: bank_deposits
========================================================== */
export const bankDepositsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_deposits')
        .select('*')
        .eq('user_id', userId)
        .order('deposit_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, deposit: {
    bank_id: string;
    bank_account_code: string;
    currency: string;
    amount: number;
    deposit_date: string;
    reference: string;
    description: string;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...deposit,
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_deposits')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('bankDepositsService.create error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Bank Currencies Service
   Tabla: bank_currencies
========================================================== */
export const bankCurrenciesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_currencies')
        .select('*')
        .eq('user_id', userId)
        .order('is_base', { ascending: false })
        .order('code');

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, currency: {
    code: string;
    name: string;
    symbol: string;
    is_base?: boolean;
    is_active?: boolean;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...currency,
        is_base: currency.is_base ?? false,
        is_active: currency.is_active ?? true,
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_currencies')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('bankCurrenciesService.create error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Bank Exchange Rates Service
   Tabla: bank_exchange_rates
========================================================== */
export const bankExchangeRatesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bank_exchange_rates')
        .select('*')
        .eq('user_id', userId)
        .order('valid_from', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, rate: {
    base_currency_code: string;
    target_currency_code: string;
    rate: number;
    valid_from: string;
    valid_to?: string | null;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...rate,
        valid_to: rate.valid_to || null,
        user_id: userId,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('bank_exchange_rates')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('bankExchangeRatesService.create error', error);
      throw error;
    }
  },
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
        arAccountId: c.ar_account_id || null,
        advanceAccountId: c.advance_account_id || null,
        documentType: c.document_type || null,
        contactName: c.contact_name || '',
        contactPhone: c.contact_phone || '',
        contactEmail: c.contact_email || '',
        customerType: c.customer_type || '',
        paymentTerms: c.payment_terms || '',
        invoiceType: c.invoice_type || '',
        ncfType: c.ncf_type || '',
        salesperson: c.salesperson || '',
        salesRepId: c.sales_rep_id || null,
        paymentTermId: c.payment_term_id || null,
      }));
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, customer: { 
    name: string; 
    document: string; 
    phone: string; 
    email: string; 
    address: string; 
    creditLimit: number; 
    status: 'active' | 'inactive' | 'blocked'; 
    arAccountId?: string; 
    advanceAccountId?: string; 
    documentType?: string; 
    contactName?: string; 
    contactPhone?: string; 
    contactEmail?: string; 
    customerType?: string; 
    paymentTerms?: string; 
    invoiceType?: string; 
    ncfType?: string; 
    salesperson?: string; 
    salesRepId?: string | null;
    paymentTermId?: string | null 
  }) {
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
        ar_account_id: customer.arAccountId || null,
        advance_account_id: customer.advanceAccountId || null,
        document_type: customer.documentType || null,
        contact_name: customer.contactName || null,
        contact_phone: customer.contactPhone || null,
        contact_email: customer.contactEmail || null,
        customer_type: customer.customerType || null,
        payment_terms: customer.paymentTerms || null,
        invoice_type: customer.invoiceType || null,
        ncf_type: customer.ncfType || null,
        salesperson: customer.salesperson || null,
        sales_rep_id: customer.salesRepId || null,
        payment_term_id: customer.paymentTermId || null,
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

  async update(id: string, customer: { 
    name: string; 
    document: string; 
    phone: string; 
    email: string; 
    address: string; 
    creditLimit: number; 
    status: 'active' | 'inactive' | 'blocked'; 
    arAccountId?: string; 
    advanceAccountId?: string; 
    documentType?: string; 
    contactName?: string; 
    contactPhone?: string; 
    contactEmail?: string; 
    customerType?: string; 
    paymentTerms?: string; 
    invoiceType?: string; 
    ncfType?: string; 
    salesperson?: string; 
    paymentTermId?: string | null 
  }) {
    try {
      const payload = {
        name: customer.name,
        document: customer.document,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        credit_limit: customer.creditLimit,
        status: customer.status,
        ar_account_id: customer.arAccountId || null,
        advance_account_id: customer.advanceAccountId || null,
        document_type: customer.documentType || null,
        contact_name: customer.contactName || null,
        contact_phone: customer.contactPhone || null,
        contact_email: customer.contactEmail || null,
        customer_type: customer.customerType || null,
        payment_terms: customer.paymentTerms || null,
        invoice_type: customer.invoiceType || null,
        ncf_type: customer.ncfType || null,
        salesperson: customer.salesperson || null,
        payment_term_id: customer.paymentTermId || null,
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
   Customer Types Service
========================================================== */
export const customerTypesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('customer_types')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return (data || []).map((t: any) => ({
        id: t.id as string,
        name: t.name || '',
        description: t.description || '',
        fixedDiscount: Number(t.fixed_discount) || 0,
        creditLimit: Number(t.credit_limit) || 0,
        allowedDelayDays: Number(t.allowed_delay_days) || 0,
        noTax: Boolean(t.no_tax),
        arAccountId: t.ar_account_id || null,
        arAccountCode: t.ar_account_code || null,
      }));
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: { name: string; description?: string; fixedDiscount?: number; creditLimit?: number; allowedDelayDays?: number; noTax?: boolean; arAccountId?: string }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();

      // Intentamos obtener el código de cuenta si se pasa arAccountId
      let arAccountCode: string | null = null;
      if (payload.arAccountId) {
        const { data: acc, error: accErr } = await supabase
          .from('chart_accounts')
          .select('code')
          .eq('id', payload.arAccountId)
          .maybeSingle();
        if (!accErr && acc?.code) {
          arAccountCode = String(acc.code);
        }
      }

      const body = {
        user_id: userId,
        name: payload.name,
        description: payload.description || null,
        fixed_discount: typeof payload.fixedDiscount === 'number' ? payload.fixedDiscount : 0,
        credit_limit: typeof payload.creditLimit === 'number' ? payload.creditLimit : 0,
        allowed_delay_days: typeof payload.allowedDelayDays === 'number' ? payload.allowedDelayDays : 0,
        no_tax: Boolean(payload.noTax),
        ar_account_id: payload.arAccountId || null,
        ar_account_code: arAccountCode,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('customer_types')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('customerTypesService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: { name: string; description?: string; fixedDiscount?: number; creditLimit?: number; allowedDelayDays?: number; noTax?: boolean; arAccountId?: string }) {
    try {
      const patch: any = {
        name: payload.name,
        description: payload.description || null,
        fixed_discount: typeof payload.fixedDiscount === 'number' ? payload.fixedDiscount : 0,
        credit_limit: typeof payload.creditLimit === 'number' ? payload.creditLimit : 0,
        allowed_delay_days: typeof payload.allowedDelayDays === 'number' ? payload.allowedDelayDays : 0,
        no_tax: Boolean(payload.noTax),
        ar_account_id: payload.arAccountId || null,
        updated_at: new Date().toISOString(),
      };

      // Actualizar código de cuenta si cambia arAccountId
      if (payload.arAccountId) {
        const { data: acc, error: accErr } = await supabase
          .from('chart_accounts')
          .select('code')
          .eq('id', payload.arAccountId)
          .maybeSingle();
        if (!accErr && acc?.code) {
          patch.ar_account_code = String(acc.code);
        }
      } else {
        patch.ar_account_code = null;
      }

      const { data, error } = await supabase
        .from('customer_types')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('customerTypesService.update error', error);
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

  async checkRelations(id: string): Promise<{ hasAccountingSettings: boolean; hasJournalEntries: boolean }> {
    try {
      const [settingsRes, linesRes] = await Promise.all([
        supabase
          .from('accounting_settings')
          .select('id')
          .or(`ap_account_id.eq.${id},ar_account_id.eq.${id},sales_account_id.eq.${id},sales_tax_account_id.eq.${id},ap_bank_account_id.eq.${id}`)
          .limit(1),
        supabase
          .from('journal_entry_lines')
          .select('id')
          .eq('account_id', id)
          .limit(1),
      ]);

      const hasAccountingSettings = Array.isArray(settingsRes.data) && settingsRes.data.length > 0;
      const hasJournalEntries = Array.isArray(linesRes.data) && linesRes.data.length > 0;

      return { hasAccountingSettings, hasJournalEntries };
    } catch (error) {
      console.error('Error checking account relations:', error);
      return { hasAccountingSettings: false, hasJournalEntries: false };
    }
  },

  async delete(id: string) {
    try {
      const relations = await chartAccountsService.checkRelations(id);
      if (relations.hasAccountingSettings || relations.hasJournalEntries) {
        throw new Error('Cannot delete account with existing relations');
      }

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

  async seedFromTemplate(userId: string) {
    try {
      const { data: templateRows, error } = await supabase
        .from('chart_accounts_template')
        .select('*');

      if (error) throw error;
      if (!templateRows || templateRows.length === 0) {
        return { created: 0 };
      }

      // Obtener códigos ya existentes para este usuario
      const { data: existing, error: existingError } = await supabase
        .from('chart_accounts')
        .select('code')
        .eq('user_id', userId);

      if (existingError) throw existingError;
      const existingCodes = new Set((existing || []).map((r: any) => String(r.code || '').trim()));

      const rowsToInsert = templateRows
        .filter((row: any) => {
          const code = String(row.code || '').trim();
          return !!code && !existingCodes.has(code);
        })
        .map((row: any) => ({
          user_id: userId,
          code: row.code,
          name: row.name,
          type: row.type || 'asset',
          level: row.level || 1,
          balance: row.balance || 0,
          is_active: row.is_active !== false,
          description: row.description || null,
          normal_balance: row.normal_balance || 'debit',
          allow_posting: row.allow_posting !== false,
          parent_id: row.parent_id || null,
        }));

      if (rowsToInsert.length === 0) {
        return { created: 0 };
      }

      const { error: insertError } = await supabase
        .from('chart_accounts')
        .insert(rowsToInsert);

      if (insertError) throw insertError;
      return { created: rowsToInsert.length };
    } catch (error) {
      console.error('Error seeding chart of accounts from template:', error);
      throw error;
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
   Payment Terms Service
========================================================== */
export const paymentTermsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('payment_terms')
        .select('*')
        .eq('user_id', userId)
        .order('days');
      if (error) return handleDatabaseError(error, []);
      return (data || []).map((t: any) => ({
        id: t.id as string,
        name: t.name || '',
        description: t.description || '',
        days: Number(t.days) || 0,
      }));
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: { name: string; days: number; description?: string }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const body = {
        user_id: userId,
        name: payload.name,
        days: Number(payload.days) || 0,
        description: payload.description || null,
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await supabase
        .from('payment_terms')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('paymentTermsService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: { name?: string; days?: number; description?: string | null }) {
    try {
      const body: any = {
        updated_at: new Date().toISOString(),
      };
      if (typeof payload.name === 'string') body.name = payload.name;
      if (typeof payload.days === 'number') body.days = Number(payload.days) || 0;
      if (payload.description !== undefined) body.description = payload.description;

      const { data, error } = await supabase
        .from('payment_terms')
        .update(body)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('paymentTermsService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('payment_terms')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('supplierTypesService.delete error', error);
      throw error;
    }
  },
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

      // Best-effort: crear solicitud de autorización
      try {
        await supabase.from('approval_requests').insert({
          user_id: userId,
          entity_type: 'petty_cash_reimbursement',
          entity_id: data.id,
          status: 'pending',
          notes: reimbursement.description || null,
        });
      } catch (approvalError) {
        console.error('Error creating approval request for petty cash reimbursement:', approvalError);
      }

      const fundId = reimbursement.fund_id;
      const amount = Number(reimbursement.amount) || 0;

      // Actualizar saldo del fondo (sumar el reembolso al current_balance)
      try {
        const { data: fundData, error: fundError } = await supabase
          .from('petty_cash_funds')
          .select('id, petty_cash_account_id, current_balance')
          .eq('id', fundId)
          .single();

        if (fundError || !fundData) {
          console.error('Error obteniendo fondo de caja chica para reposición:', fundError);
        } else {
          const newBalance = Number(fundData.current_balance || 0) + amount;
          const { error: updateError } = await supabase
            .from('petty_cash_funds')
            .update({ current_balance: newBalance })
            .eq('id', fundId);

          if (updateError) {
            console.error('Error actualizando saldo del fondo de caja chica:', updateError);
          }

          // Generar asiento contable automático: Debe Caja Chica / Haber Banco
          try {
            if (amount > 0 && fundData.petty_cash_account_id && reimbursement.bank_account_id) {
              const { data: bankData, error: bankError } = await supabase
                .from('bank_accounts')
                .select('chart_account_id, bank_name')
                .eq('id', reimbursement.bank_account_id)
                .maybeSingle();

              if (!bankError && bankData?.chart_account_id) {
                const entryDate = reimbursement.reimbursement_date || new Date().toISOString().split('T')[0];
                const entryPayload = {
                  entry_number: `PCT-${String(entryDate).slice(0, 10)}-${(data.id || '').toString().slice(0, 6)}`,
                  entry_date: String(entryDate),
                  description:
                    reimbursement.description ||
                    `Reposición de caja chica fondo ${fundData.id}`,
                  reference: data.id ? String(data.id) : null,
                  status: 'posted' as const,
                };

                const lines = [
                  {
                    account_id: fundData.petty_cash_account_id as string,
                    description: 'Reposición de Caja Chica',
                    debit_amount: amount,
                    credit_amount: 0,
                  },
                  {
                    account_id: bankData.chart_account_id as string,
                    description: `Banco ${bankData.bank_name || ''}`.trim(),
                    debit_amount: 0,
                    credit_amount: amount,
                  },
                ];

                await journalEntriesService.createWithLines(userId, entryPayload, lines);
              }
            }
          } catch (jeError) {
            console.error('Error creando asiento de reposición de caja chica:', jeError);
          }
        }
      } catch (fundUpdateError) {
        console.error('Error en actualización de fondo de caja chica:', fundUpdateError);
      }

      return data;
    } catch (error) {
      console.error('pettyCashService.createReimbursement error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Petty Cash Categories Service
========================================================== */
export const pettyCashCategoriesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('petty_cash_categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, category: any) {
    try {
      if (!userId) throw new Error('userId required');
      const payload = {
        ...category,
        user_id: userId,
      };
      const { data, error } = await supabase
        .from('petty_cash_categories')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashCategoriesService.create error', error);
      throw error;
    }
  },
 
  async update(id: string, patch: any) {
    try {
      const payload = {
        ...patch,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('petty_cash_categories')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashCategoriesService.update error', error);
      throw error;
    }
  },

  async toggleActive(id: string, isActive: boolean) {
    try {
      const { data, error } = await supabase
        .from('petty_cash_categories')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('pettyCashCategoriesService.toggleActive error', error);
      throw error;
    }
  },
};

/* ==========================================================
   Financial Reports Service
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
          chart_accounts (id, user_id, code, name, type, normal_balance, level, allow_posting, parent_id)
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
        // Multi-tenant fuerte: ignorar líneas cuya cuenta no pertenezca al mismo user_id
        if (!account || account.user_id !== userId) return;

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
            level: account.level,
            allow_posting: account.allow_posting,
            parent_id: account.parent_id,
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
  },
};

/* ==========================================================
   Bank Reconciliation Service
========================================================== */
export const bankReconciliationService = {
  async getOrCreateReconciliation(
    userId: string,
    bankAccountId: string,
    reconciliationDate: string,
    bankStatementBalance: number,
    bookBalance: number,
  ) {
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
        bank_statement_balance: bankStatementBalance,
        book_balance: bookBalance,
        adjusted_balance: null,
        status: 'pending',
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

  async upsertItemsFromBankMovements(
    reconciliationId: string,
    userId: string,
    movements: Array<{
      id: string;
      date: string;
      type: string;
      amount: number;
      reference?: string | null;
      description?: string | null;
    }>,
    reconciledIds: Set<string>,
  ) {
    try {
      if (!reconciliationId || !userId || !movements?.length) return;

      // Eliminar items anteriores de esta conciliación para evitar duplicados
      const { error: deleteError } = await supabase
        .from('bank_reconciliation_items')
        .delete()
        .eq('reconciliation_id', reconciliationId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error(
          'bankReconciliationService.upsertItemsFromBankMovements delete error',
          deleteError,
        );
        throw deleteError;
      }

      const itemsPayload = movements.map((m) => {
        const positiveTypes = ['deposit', 'credit'];
        const sign = positiveTypes.includes(m.type) ? 1 : -1;
        const signedAmount = sign * (Number(m.amount) || 0);

        const descBase = m.description || '';
        const refPart = m.reference ? ` Ref: ${m.reference}` : '';
        const description = descBase || refPart ? `${descBase}${refPart}`.trim() : 'Movimiento bancario';

        return {
          reconciliation_id: reconciliationId,
          user_id: userId,
          transaction_type: 'book',
          description,
          amount: signedAmount,
          transaction_date: m.date,
          is_reconciled: reconciledIds.has(m.id),
          journal_entry_id: null,
          // Optional: store movement id in notes/description if needed in future
        };
      });

      const { error } = await supabase
        .from('bank_reconciliation_items')
        .insert(itemsPayload);

      if (error) {
        console.error('bankReconciliationService.upsertItemsFromBankMovements insert error', error);
        throw error;
      }
    } catch (error) {
      console.error('bankReconciliationService.upsertItemsFromBankMovements unexpected error', error);
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
      const query = supabase
        .from('accounting_settings')
        .select('*');

      if (userId) {
        query.eq('user_id', userId).limit(1);
      } else {
        query.limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data ?? null;
    } catch (error) {
      console.error('accountingSettingsService.get error', error);
      return null;
    }
  },

  // Verificar si el catálogo de cuentas ya fue sembrado para este usuario
  async hasChartAccountsSeeded(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('accounting_settings')
        .select('chart_accounts_seeded')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking chart_accounts_seeded:', error);
        return false;
      }

      return data?.chart_accounts_seeded === true;
    } catch (error) {
      console.error('accountingSettingsService.hasChartAccountsSeeded error', error);
      return false;
    }
  },

  // Marcar que el catálogo de cuentas ya fue sembrado para este usuario
  async markChartAccountsSeeded(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('accounting_settings')
        .upsert(
          { 
            user_id: userId, 
            chart_accounts_seeded: true,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error marking chart_accounts_seeded:', error);
      }
    } catch (error) {
      console.error('accountingSettingsService.markChartAccountsSeeded error', error);
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
            entry_number: String(invoiceData.invoice_number || ''),
            entry_date: String(invoiceData.invoice_date),
            description: `Factura ${invoiceData.invoice_number || ''}`.trim(),
            reference: invoiceData.id ? String(invoiceData.id) : null,
            status: 'posted' as const,
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
                  entry_number: `${String(invoiceData.invoice_number || '')}-COGS`,
                  entry_date: String(invoiceData.invoice_date),
                  description: `Costo de ventas factura ${invoiceData.invoice_number || ''}`.trim(),
                  reference: invoiceData.id,
                  status: 'posted' as const,
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
}

/**
 * Supplier Types Service
 * Tabla: supplier_types
========================================================== */
export const supplierTypesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('supplier_types')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: {
    name: string;
    description?: string;
    affects_itbis?: boolean;
    affects_isr?: boolean;
    is_rst?: boolean;
    is_ong?: boolean;
    is_non_taxpayer?: boolean;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const body = {
        user_id: userId,
        name: payload.name,
        description: payload.description || null,
        affects_itbis: payload.affects_itbis !== false,
        affects_isr: payload.affects_isr !== false,
        is_rst: !!payload.is_rst,
        is_ong: !!payload.is_ong,
        is_non_taxpayer: !!payload.is_non_taxpayer,
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await supabase
        .from('supplier_types')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('supplierTypesService.create error', error);
      throw error;
    }
  },

  async update(id: string, payload: {
    name?: string;
    description?: string;
    affects_itbis?: boolean;
    affects_isr?: boolean;
    is_rst?: boolean;
    is_ong?: boolean;
    is_non_taxpayer?: boolean;
  }) {
    try {
      const body: any = {
        updated_at: new Date().toISOString(),
      };
      if (typeof payload.name === 'string') body.name = payload.name;
      if (payload.description !== undefined) body.description = payload.description;
      if (typeof payload.affects_itbis === 'boolean') body.affects_itbis = payload.affects_itbis;
      if (typeof payload.affects_isr === 'boolean') body.affects_isr = payload.affects_isr;
      if (typeof payload.is_rst === 'boolean') body.is_rst = payload.is_rst;
      if (typeof payload.is_ong === 'boolean') body.is_ong = payload.is_ong;
      if (typeof payload.is_non_taxpayer === 'boolean') body.is_non_taxpayer = payload.is_non_taxpayer;

      const { data, error } = await supabase
        .from('supplier_types')
        .update(body)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('supplierTypesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('supplier_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('supplierTypesService.delete error', error);
      throw error;
    }
  },
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
  }
};

/* ==========================================================
   Supplier Advances Service (Accounts Payable)
   Tabla: ap_supplier_advances
========================================================== */
export const apSupplierAdvancesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('ap_supplier_advances')
        .select(`
          *,
          suppliers (name)
        `)
        .eq('user_id', userId)
        .order('advance_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: {
    supplier_id: string;
    advance_number: string;
    advance_date: string;
    amount: number;
    reference?: string | null;
    description?: string | null;
    status?: string;
    applied_amount?: number;
    balance_amount?: number;
  }) {
    try {
      if (!userId) throw new Error('userId required');
      const body = {
        user_id: userId,
        supplier_id: payload.supplier_id,
        advance_number: payload.advance_number,
        advance_date: payload.advance_date,
        currency: 'DOP',
        amount: payload.amount,
        reference: payload.reference ?? null,
        description: payload.description ?? null,
        applied_amount: typeof payload.applied_amount === 'number' ? payload.applied_amount : 0,
        balance_amount: typeof payload.balance_amount === 'number' ? payload.balance_amount : payload.amount,
        status: payload.status ?? 'pending',
      };
      const { data, error } = await supabase
        .from('ap_supplier_advances')
        .insert(body)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('apSupplierAdvancesService.create error', error);
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
        .from('ap_supplier_advances')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('apSupplierAdvancesService.updateStatus error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('ap_supplier_advances')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('apSupplierAdvancesService.delete error', error);
      throw error;
    }
  },
};

/* ==========================================================
   AP Invoices Service (Facturas de Suplidor - CxP)
========================================================== */
export const apInvoicesService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('ap_invoices')
        .select(`
          *,
          suppliers (name)
        `)
        .eq('user_id', userId)
        .order('invoice_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, invoice: any) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        ...invoice,
        user_id: userId,
        created_at: invoice.created_at || now,
        updated_at: invoice.updated_at || now,
      };
      const { data, error } = await supabase
        .from('ap_invoices')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('apInvoicesService.create error', error);
      throw error;
    }
  },

  async update(id: string, patch: any) {
    try {
      const payload = {
        ...patch,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('ap_invoices')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('apInvoicesService.update error', error);
      throw error;
    }
  },

  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('ap_invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('apInvoicesService.delete error', error);
      throw error;
    }
  },
};

/* ==========================================================
   AP Invoice Lines Service (Detalle de Facturas de Suplidor)
========================================================== */
export const apInvoiceLinesService = {
  async getByInvoice(apInvoiceId: string) {
    try {
      if (!apInvoiceId) return [];
      const { data, error } = await supabase
        .from('ap_invoice_lines')
        .select('*')
        .eq('ap_invoice_id', apInvoiceId)
        .order('created_at', { ascending: true });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async createMany(apInvoiceId: string, lines: any[]) {
    try {
      if (!apInvoiceId || !Array.isArray(lines) || lines.length === 0) return [];
      const now = new Date().toISOString();
      const payload = lines.map((l) => ({
        ...l,
        ap_invoice_id: apInvoiceId,
        created_at: l.created_at || now,
        updated_at: l.updated_at || now,
      }));
      const { data, error } = await supabase
        .from('ap_invoice_lines')
        .insert(payload)
        .select('*');
      if (error) throw error;
      const insertedLines = data ?? [];

      // Best-effort: registrar asiento contable para la factura de suplidor usando las cuentas de gasto
      try {
        // Obtener factura para conocer usuario, fechas y totales
        const { data: invoice, error: invError } = await supabase
          .from('ap_invoices')
          .select('*')
          .eq('id', apInvoiceId)
          .maybeSingle();

        if (!invError && invoice && invoice.user_id) {
          const userId = invoice.user_id as string;

          // Configuración contable: cuenta de CxP
          const settings = await accountingSettingsService.get(userId);
          const apAccountId = settings?.ap_account_id as string | undefined;

          if (apAccountId) {
            // Cargar líneas desde BD (asegurando tener expense_account_id y montos finales)
            const { data: dbLines, error: dbLinesError } = await supabase
              .from('ap_invoice_lines')
              .select('expense_account_id,line_total,itbis_amount')
              .eq('ap_invoice_id', apInvoiceId);

            if (!dbLinesError && dbLines && dbLines.length > 0) {
              const accountTotals: Record<string, number> = {};

              dbLines.forEach((l: any) => {
                const accountId = l.expense_account_id ? String(l.expense_account_id) : '';
                if (!accountId) return;
                const lineBase = Number(l.line_total) || 0;
                const lineItbis = Number(l.itbis_amount) || 0;
                const amount = lineBase + lineItbis; // Por ahora llevamos ITBIS al gasto/costo
                if (amount <= 0) return;
                accountTotals[accountId] = (accountTotals[accountId] || 0) + amount;
              });

              const expenseLines = Object.entries(accountTotals)
                .filter(([_, amount]) => amount > 0)
                .map(([accountId, amount]) => ({
                  account_id: accountId,
                  description: 'Gastos por compras a suplidor',
                  debit_amount: amount,
                  credit_amount: 0,
                }));

              if (expenseLines.length > 0) {
                const totalDebit = expenseLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
                if (totalDebit > 0) {
                  const linesForEntry = [
                    ...expenseLines,
                    {
                      account_id: apAccountId,
                      description: 'Cuentas por Pagar a Proveedores',
                      debit_amount: 0,
                      credit_amount: totalDebit,
                    },
                  ];

                  const entryPayload = {
                    entry_number: String(invoice.invoice_number || ''),
                    entry_date: String(invoice.invoice_date || new Date().toISOString().slice(0, 10)),
                    description: `Factura suplidor ${invoice.invoice_number || ''}`.trim() || 'Factura suplidor',
                    reference: invoice.id ? String(invoice.id) : null,
                    status: 'posted' as const,
                  };

                  await journalEntriesService.createWithLines(userId, entryPayload, linesForEntry);
                }
              }
            }
          }
        }
      } catch (jeError) {
        // eslint-disable-next-line no-console
        console.error('Error posting AP invoice to ledger:', jeError);
      }

      return insertedLines;
    } catch (error) {
      console.error('apInvoiceLinesService.createMany error', error);
      throw error;
    }
  },

  async deleteByInvoice(apInvoiceId: string) {
    try {
      if (!apInvoiceId) return;
      const { error } = await supabase
        .from('ap_invoice_lines')
        .delete()
        .eq('ap_invoice_id', apInvoiceId);
      if (error) throw error;
    } catch (error) {
      console.error('apInvoiceLinesService.deleteByInvoice error', error);
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
      // Best-effort: crear solicitud de autorización para pago a proveedor
      try {
        await supabase.from('approval_requests').insert({
          user_id: userId,
          entity_type: 'supplier_payment',
          entity_id: data.id,
          status: 'pending',
          notes: payload.description ?? null,
        });
      } catch (approvalError) {
        console.error('Error creating approval request for supplier payment:', approvalError);
      }

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
              entry_number: String(data.invoice_number || ''),
              entry_date: String(data.payment_date),
              description: `Pago a proveedor ${data.invoice_number || ''}`.trim(),
              reference: data.id ? String(data.id) : null,
              status: 'posted' as const,
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
      // Best-effort: crear solicitud de autorización para pago de cliente
      try {
        await supabase.from('approval_requests').insert({
          user_id: userId,
          entity_type: 'customer_payment',
          entity_id: data.id,
          status: 'pending',
          notes: body.reference || null,
        });
      } catch (approvalError) {
        console.error('Error creating approval request for customer payment:', approvalError);
      }

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
   Sales Reps Service (Vendedores)
   Tabla: sales_reps
========================================================== */
export const salesRepsService = {
  async getAll(userId: string) {
    try {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('sales_reps')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, rep: { name: string; code?: string; email?: string; phone?: string; commission_rate?: number | null }) {
    try {
      if (!userId) throw new Error('userId required');
      const now = new Date().toISOString();
      const payload = {
        user_id: userId,
        name: rep.name,
        code: rep.code || null,
        email: rep.email || null,
        phone: rep.phone || null,
        commission_rate: typeof rep.commission_rate === 'number' ? rep.commission_rate : null,
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('sales_reps')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('salesRepsService.create error', error);
      throw error;
    }
  },

  async update(id: string, patch: Partial<{ name: string; code: string; email: string; phone: string; commission_rate: number | null; is_active: boolean }>) {
    try {
      const body = {
        ...patch,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('sales_reps')
        .update(body)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('salesRepsService.update error', error);
      throw error;
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
        .eq('is_deleted', false)
        .order('bank_name', { ascending: true });
      if (error) return handleDatabaseError(error, []);
      return data ?? [];
    } catch (error) {
      return handleDatabaseError(error, []);
    }
  },

  async create(userId: string, payload: any) {
    try {
      const body = { ...payload, user_id: userId, is_deleted: false };
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
        .update({ is_deleted: true, is_active: false, chart_account_id: null })
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
  async getNcfSeries(userId?: string) {
    try {
      let query = supabase
        .from('ncf_series')
        .select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

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
          user_id: user.id,
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
        .eq('period', period)
        .eq('user_id', user.id);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      await this.buildReport606(period);
      const { data, error } = await supabase
        .from('report_606_data')
        .select('*')
        .eq('period', period)
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        return { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 };
      }

      const { data, error } = await supabase
        .from('report_606_data')
        .select('monto_facturado, itbis_facturado, itbis_retenido, monto_retencion_renta')
        .eq('period', period)
        .eq('user_id', user.id);

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
          user_id: user.id,
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

      // Limpiar datos anteriores del período para este usuario y guardar nuevos
      const { error: delErr } = await supabase
        .from('report_607_data')
        .delete()
        .eq('period', period)
        .eq('user_id', user.id);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      await this.buildReport607(period);
      const { data, error } = await supabase
        .from('report_607_data')
        .select('*')
        .eq('period', period)
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        return { totalMonto: 0, totalItbis: 0, totalRetenido: 0, totalISR: 0 };
      }

      const { data, error } = await supabase
        .from('report_607_data')
        .select('monto_facturado, itbis_facturado, itbis_retenido, retencion_renta_terceros, itbis_cobrado')
        .eq('period', period)
        .eq('user_id', user.id);

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
        user_id: user.id,
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
        .eq('period', period)
        .eq('user_id', user.id);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      await this.buildReport608(period);
      const { data, error } = await supabase
        .from('report_608_data')
        .select('*')
        .eq('period', period)
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        return { totalAmount: 0, totalTax: 0 };
      }

      const { data, error } = await supabase
        .from('report_608_data')
        .select('amount, tax_amount')
        .eq('period', period)
        .eq('user_id', user.id);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      await this.buildReportIR17(period);
      const { data, error } = await supabase
        .from('report_ir17_data')
        .select('*')
        .eq('period', period)
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        return { totalGross: 0, totalWithheld: 0, totalNet: 0, count: 0 };
      }

      const { data, error } = await supabase
        .from('report_ir17_data')
        .select('gross_amount, withheld_amount, net_amount')
        .eq('period', period)
        .eq('user_id', user.id);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;

      // Verificar si ya existe una declaración para este período
      const { data: existing, error: existingError } = await supabase
        .from('report_it1_data')
        .select('*')
        .eq('period', period)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingError && existing) {
        return existing;
      }

      // Obtener datos de ventas y compras para el período del usuario actual
      const [salesResponse, purchasesResponse] = await Promise.all([
        supabase
          .from('report_607_data')
          .select('*')
          .eq('period', period)
          .eq('user_id', user.id),
        supabase
          .from('report_606_data')
          .select('*')
          .eq('period', period)
          .eq('user_id', user.id),
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
        user_id: user.id,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        return {
          totalDeclaraciones: 0,
          totalVentasGravadas: 0,
          totalITBISCobrado: 0,
          totalComprasGravadas: 0,
          totalITBISPagado: 0,
          saldoNeto: 0,
          ultimaDeclaracion: null,
        };
      }

      const { data, error } = await supabase
        .from('report_it1_data')
        .select('*')
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      let query = supabase
        .from('report_it1_data')
        .select('*')
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('report_it1_data')
        .select('*')
        .eq('period', period)
        .eq('user_id', user.id)
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
  async getTaxStatistics(userId?: string) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      let sales607Query = supabase.from('report_607_data').select('*').eq('period', currentMonth);
      let purchases606Query = supabase.from('report_606_data').select('*').eq('period', currentMonth);
      
      if (userId) {
        sales607Query = sales607Query.eq('user_id', userId);
        purchases606Query = purchases606Query.eq('user_id', userId);
      }

      const [salesResponse, purchasesResponse] = await Promise.all([
        sales607Query,
        purchases606Query
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
  },

  // -----------------------------------------------------------------
  // Fiscal Deadlines / Vencimientos Fiscales
  // -----------------------------------------------------------------
  async getFiscalDeadlines(userId: string) {
    try {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('fiscal_deadlines')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting fiscal deadlines:', error);
      return [];
    }
  },

  async createFiscalDeadline(userId: string, deadline: any) {
    try {
      const { data, error } = await supabase
        .from('fiscal_deadlines')
        .insert({ ...deadline, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating fiscal deadline:', error);
      throw error;
    }
  },

  async updateFiscalDeadline(id: string, deadline: any) {
    try {
      const { data, error } = await supabase
        .from('fiscal_deadlines')
        .update(deadline)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating fiscal deadline:', error);
      throw error;
    }
  },

  async deleteFiscalDeadline(id: string) {
    try {
      const { error } = await supabase
        .from('fiscal_deadlines')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting fiscal deadline:', error);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

      const payload: any = {
        ...companyInfo,
        user_id: user.id,
      };

      // No enviar id en el upsert para evitar conflicto con la PK (company_info_pkey)
      delete payload.id;

      const { data, error } = await supabase
        .from('company_info')
        .upsert(payload, { onConflict: 'user_id' })
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
  async getAccountingSettings(userId?: string) {
    try {
      const query = supabase
        .from('accounting_settings')
        .select('*');

      if (userId) {
        query.eq('user_id', userId).limit(1);
      } else {
        query.limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    } catch (error) {
      console.error('Error getting accounting settings:', error);
      return null;
    }
  },

  async saveAccountingSettings(settings: any, userId?: string) {
    try {
      const payload = {
        ...settings,
        user_id: userId ?? settings.user_id ?? null,
      };

      // Nunca enviar el id en el upsert para evitar conflictos con la PK
      // y permitir que cada usuario tenga su propio registro según user_id
      delete (payload as any).id;

      const { data, error } = await supabase
        .from('accounting_settings')
        .upsert(payload, { onConflict: 'user_id' })
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

      const payload: any = {
        ...settings,
        user_id: user.id,
      };

      // Evitar conflicto con la PK de tax_settings
      delete payload.id;

      const { data, error } = await supabase
        .from('tax_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving tax settings:', error);
      throw error;
    }
  },

  // User helpers
  async getUserCompanyName(userId: string): Promise<string | null> {
    try {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('company')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return (data as any)?.company || null;
    } catch (error) {
      console.error('Error getting user company name:', error);
      return null;
    }
  },

  // Tax Rates
  async getTaxRates() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

      const payload: any = {
        ...rateData,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('tax_rates')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tax rate:', error);
      throw error;
    }
  },

  async updateTaxRate(id: string, rateData: any) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('tax_rates')
        .update(rateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tax rate:', error);
      throw error;
    }
  },

  async deleteTaxRate(id: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting tax rate:', error);
      throw error;
    }
  }, // <--- Added comma here

  // Inventory Settings
  async getInventorySettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('inventory_settings')
        .select('*')
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

      const normalized: any = {
        ...settings,
        user_id: user.id,
        default_warehouse: settings.default_warehouse || null,
      };

      const { data, error } = await supabase
        .from('inventory_settings')
        .upsert(normalized, { onConflict: 'user_id' })
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('payroll_settings')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data ?? null;
    } catch (error) {
      console.error('Error getting payroll settings:', error);
      return null;
    }
  },

  async savePayrollSettings(settings: any) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

      const payload: any = {
        ...settings,
        user_id: user.id,
      };

      // Evitar conflicto con la PK de payroll_settings
      delete payload.id;

      const { data, error } = await supabase
        .from('payroll_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving payroll settings:', error);
      throw error;
    }
  },

  async getPayrollConcepts() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('payroll_concepts')
        .select('*')
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Usuario no autenticado');

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
        user_id: user.id,
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
