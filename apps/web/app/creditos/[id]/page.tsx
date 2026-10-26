import { notFound } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { CreditDetailClient } from './CreditDetailClient';
import type { Credit, CreditInstallment, CreditPayment } from '@workspace/supabase';

export const dynamic = 'force-dynamic';

interface Props {
  params: {
    id: string;
  };
}

export default async function CreditDetailPage({ params }: Props) {
  const supabase = await createClient();

  // 1. Cargar el crédito
  const { data: credit } = await supabase
    .from('credits')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!credit) {
    notFound();
  }

  // 2. Cargar las cuotas ordenadas por número
  const { data: installments } = await supabase
    .from('credit_installments')
    .select('*')
    .eq('credit_id', params.id)
    .order('installment_number', { ascending: true });

  // 3. Cargar el historial de pagos y abonos
  const { data: payments } = await supabase
    .from('credit_payments')
    .select('*')
    .eq('credit_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 md:p-12 print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto">
        <CreditDetailClient
          credit={credit as Credit}
          installments={(installments as CreditInstallment[]) || []}
          payments={(payments as CreditPayment[]) || []}
        />
      </div>
    </main>
  );
}
