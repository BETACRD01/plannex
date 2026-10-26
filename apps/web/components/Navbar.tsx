'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import type { Profile } from '@workspace/supabase';
import { Shield, LogOut, User, Sparkles } from 'lucide-react';

interface NavbarProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}

export function Navbar({ user, profile }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleToggleAdmin = async () => {
    if (!user) return;
    const newRole = profile?.role === 'admin' ? 'user' : 'admin';
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
    router.refresh();
  };

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-slate-800">
      <div>
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white group-hover:text-emerald-400 transition">
              Plannex
            </h1>
            <p className="text-xs text-slate-400">Control de Suscripciones y Pagos</p>
          </div>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <>
            {profile?.role === 'admin' ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold px-3 py-2 rounded-xl transition"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                Panel Admin (Verificación)
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleToggleAdmin}
                className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 transition"
                title="Habilitar permisos de administrador para probar la verificación"
              >
                Activar Modo Admin (Prueba)
              </button>
            )}

            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <div className="w-7 h-7 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-200">{profile?.full_name || user.email}</p>
                <p className="text-[10px] text-emerald-400 capitalize">{profile?.role || 'usuario'}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 text-xs"
          >
            <User className="w-4 h-4" />
            Ingresar / Registrarse
          </Link>
        )}
      </div>
    </header>
  );
}
