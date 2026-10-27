import { supabase } from '../../lib/supabase';
import type { Credit, CreditInstallment, CreditPayment, ConsolidatedMetrics } from '../types/credit.types';

export async function fetchCreditsForUser(
  userId: string,
  userEmail: string,
  isAdmin: boolean
): Promise<Credit[]> {
  let query = supabase.from('credits').select('*');

  if (!isAdmin) {
    // Client: only see their own linked credits
    query = query.or(`customer_user_id.eq.${userId},customer_email.ilike.${userEmail}`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    throw new Error('Error al cargar créditos: ' + error.message);
  }
  return data || [];
}

export async function fetchCreditWithDetails(creditId: string): Promise<{
  credit: Credit;
  installments: CreditInstallment[];
  payments: CreditPayment[];
}> {
  const [instRes, payRes, credRes] = await Promise.all([
    supabase
      .from('credit_installments')
      .select('*')
      .eq('credit_id', creditId)
      .order('installment_number', { ascending: true }),
    supabase
      .from('credit_payments')
      .select('*')
      .eq('credit_id', creditId)
      .order('payment_date', { ascending: false }),
    supabase
      .from('credits')
      .select('*')
      .eq('id', creditId)
      .single(),
  ]);

  if (credRes.error) {
    throw new Error('Error al cargar el crédito: ' + credRes.error.message);
  }

  return {
    credit: credRes.data,
    installments: instRes.data || [],
    payments: payRes.data || [],
  };
}

export function calculateConsolidatedMetrics(credits: Credit[]): ConsolidatedMetrics {
  const totalFinanced = credits.reduce((sum, c) => sum + Number(c.total_debt), 0);
  const totalRemaining = credits.reduce((sum, c) => sum + Number(c.remaining_balance), 0);
  const totalPaid = Math.max(0, totalFinanced - totalRemaining);
  const monthlyTotal = credits
    .filter((c) => c.status !== 'cancelado')
    .reduce((sum, c) => sum + Number(c.installment_amount), 0);
  const hasOverdue = credits.some((c) => c.status === 'atrasado');

  return {
    totalFinanced,
    totalRemaining,
    totalPaid,
    monthlyTotal,
    hasOverdue,
    creditsCount: credits.length,
  };
}
