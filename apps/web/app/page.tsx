import { createClient } from '../lib/supabase/server';
import { Navbar } from '../components/Navbar';
import { CreditsDashboardClient } from '../components/CreditsDashboardClient';
import type { Profile, Credit } from '@workspace/supabase';
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
  let credits: Credit[] = [];
  let isAdmin = false;

  if (isConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      user = currentUser;

      if (user) {
        const isSuperAdminEmail = ['wd1501074@gmail.com', 'williancerda0@gmail.com'].includes(
          user.email?.toLowerCase() || ''
        );

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        profile = profileData as Profile | null;

        if (profile?.role === 'admin' || isSuperAdminEmail) {
          isAdmin = true;
          if (profile && profile.role !== 'admin') {
            profile.role = 'admin';
          }
        }
      }

      // Cargar cartera de créditos según el rol
      let query = supabase.from('credits').select('*');

      if (!user) {
        // Visitante público NO autenticado: SOLO ver créditos explícitamente marcados como públicos
        query = query.eq('is_public', true);
      } else if (!isAdmin) {
        // Usuario normal (Cliente autenticado): filtrar únicamente sus créditos personales
        query = query.or(`customer_user_id.eq.${user.id},customer_email.ilike.${user.email}`);
      } // Si es admin: ve todos los créditos (públicos y privados) para gestión y auditoría

      const { data: creditsData } = await query.order('created_at', { ascending: false });
      credits = (creditsData as Credit[]) || [];
    } catch (e) {
      console.error('Error al inicializar datos:', e);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 md:p-12">
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

        <CreditsDashboardClient
          initialCredits={credits}
          isAdmin={isAdmin}
          isLoggedIn={Boolean(user)}
          userEmail={user?.email}
          userName={profile?.full_name || undefined}
        />
      </div>

      <footer className="mt-16 text-center text-xs text-slate-500 max-w-6xl mx-auto w-full pt-6 border-t border-slate-900 print:hidden">
        Plannex © 2026 • Sistema de Control de Créditos, Bienes Financiados y Cobranzas
      </footer>
    </main>
  );
}
