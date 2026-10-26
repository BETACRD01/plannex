import { createClient } from '../lib/supabase/server';
import { Navbar } from '../components/Navbar';
import { DashboardClient } from '../components/DashboardClient';
import type { Profile, SubscriptionPlan, UserSubscription, SubscriptionPayment } from '@workspace/supabase';
import type { User } from '@supabase/supabase-js';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured = Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('tu-proyecto') &&
    !supabaseKey.includes('tu-anon-key')
  );

  let user: User | null = null;
  let profile: Profile | null = null;
  let plans: SubscriptionPlan[] = [];
  let subscription: (UserSubscription & { plan?: SubscriptionPlan | null }) | null = null;
  let userPayments: (SubscriptionPayment & { plan?: SubscriptionPlan | null })[] = [];

  if (isConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      user = currentUser;

      if (user) {
        // 1. Perfil del usuario
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        profile = profileData as Profile | null;

        // 2. Suscripción activa del usuario
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        subscription = subData as (UserSubscription & { plan?: SubscriptionPlan | null }) | null;

        // 3. Historial de pagos y comprobantes del usuario
        const { data: paymentsData } = await supabase
          .from('subscription_payments')
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        userPayments = (paymentsData as any) || [];
      }

      // 4. Planes disponibles (públicos)
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('duration_months', { ascending: true });

      plans = plansData || [];
    } catch (e) {
      console.error('Error al inicializar datos:', e);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        <Navbar user={user} profile={profile} />

        {!isConfigured && (
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Variables de entorno pendientes</p>
              <p className="text-slate-400 mt-0.5">Configura tu SUPABASE_URL y SUPABASE_ANON_KEY en .env.local.</p>
            </div>
          </div>
        )}

        <DashboardClient
          user={user}
          subscription={subscription}
          plans={plans}
          userPayments={userPayments}
        />
      </div>

      <footer className="mt-16 text-center text-xs text-slate-500 max-w-6xl mx-auto w-full pt-6 border-t border-slate-900">
        Plannex © 2026 • Sistema de Planificación, Pagos y Verificación de Membresías en Tiempo Real
      </footer>
    </main>
  );
}
