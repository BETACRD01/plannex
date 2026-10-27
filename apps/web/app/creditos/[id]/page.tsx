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

  // 2. Determinar el rol del usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;

  if (user) {
    const isSuperAdminEmail = ['wd1501074@gmail.com', 'williancerda0@gmail.com'].includes(
      user.email?.toLowerCase() || ''
    );
    if (isSuperAdminEmail) {
      isAdmin = true;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }

    // Si no es admin, solo puede ver el crédito si le pertenece por correo o ID, o si es público
    if (!isAdmin) {
      const belongsToUser =
        credit.customer_user_id === user.id ||
        (credit.customer_email && credit.customer_email.toLowerCase() === user.email?.toLowerCase());

      if (!belongsToUser && !credit.is_public) {
        notFound();
      }
    }
  } else {
    // Si el visitante NO está autenticado (cuando sale de su cuenta):
    // SOLO se permite ver si el crédito fue marcado explícitamente como público
    if (!credit.is_public) {
      notFound();
    }
  }

  // 3. Cargar las cuotas ordenadas por número
  const { data: installments } = await supabase
    .from('credit_installments')
    .select('*')
    .eq('credit_id', params.id)
    .order('installment_number', { ascending: true });

  // 4. Cargar el historial de pagos y abonos
  const { data: payments } = await supabase
    .from('credit_payments')
    .select('*')
    .eq('credit_id', params.id)
    .order('created_at', { ascending: false });

  // Determinar si el usuario autenticado es el cliente dueño de este crédito
  const isClientOwner = Boolean(
    user && !isAdmin && (
      credit.customer_user_id === user.id ||
      (credit.customer_email && credit.customer_email.toLowerCase() === user.email?.toLowerCase())
    )
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 md:p-12 print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto">
        <CreditDetailClient
          credit={credit as Credit}
          installments={(installments as CreditInstallment[]) || []}
          payments={(payments as CreditPayment[]) || []}
          isAdmin={isAdmin}
          isClientOwner={isClientOwner}
          isLoggedIn={Boolean(user)}
        />
      </div>
    </main>
  );
}
