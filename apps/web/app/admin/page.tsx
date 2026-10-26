import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { AdminPanelClient } from './AdminPanelClient';
import { ArrowLeft, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verificar si el usuario es administrador
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Acceso Administrativo Requerido</h2>
          <p className="text-sm text-slate-400 mt-2">
            Tu cuenta actual (<strong className="text-slate-200">{user.email}</strong>) no tiene el rol de administrador asignado.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio (puedes activar modo admin allí)
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Cargar pagos de suscripción con información del plan y perfil del usuario
  const { data: payments } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      plan:subscription_plans(*),
      user:profiles(*)
    `)
    .order('created_at', { ascending: false });

  // Cargar planes
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('duration_months', { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al Portal Principal
            </Link>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Auditoría y Verificación
              </span>
              <span className="text-xs text-slate-400">Panel Administrativo</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-1">
              Verificación de Pagos y Membresías
            </h1>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
            Admin activo: <span className="text-emerald-400 font-semibold">{user.email}</span>
          </div>
        </div>

        <AdminPanelClient initialPayments={(payments as any) || []} plans={plans || []} />
      </div>
    </main>
  );
}
