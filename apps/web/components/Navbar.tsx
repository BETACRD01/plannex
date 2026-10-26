'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import type { Profile } from '@workspace/supabase';
import { PlusCircle, LogOut, ShieldCheck, UserCheck, DollarSign, Wallet, LogIn } from 'lucide-react';

interface NavbarProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  onOpenPaymentModal?: () => void;
}

export function Navbar({ user, profile, onOpenPaymentModal }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const isAdmin = profile?.role === 'admin';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition shadow-lg shadow-emerald-500/10">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white group-hover:text-emerald-400 transition">
              Plannex
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Gestión de Créditos & Cobranzas</p>
          </div>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 font-semibold transition"
            >
              {isAdmin ? 'Cartera de Créditos' : 'Mis Financiamientos'}
            </Link>
            {isAdmin && (
              <Link
                href="/creditos/nuevo"
                className="px-3 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 font-semibold transition"
              >
                + Nuevo Crédito
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {isAdmin && (
          <>
            <Link
              href="/creditos/nuevo"
              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Financiar Bien</span>
            </Link>

            {onOpenPaymentModal && (
              <button
                onClick={onOpenPaymentModal}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-xl transition text-xs shadow-lg shadow-blue-500/20"
              >
                <DollarSign className="w-4 h-4" />
                <span>Registrar Abono</span>
              </button>
            )}
          </>
        )}

        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  isAdmin
                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                }`}
              >
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-200 text-xs max-w-[130px] truncate leading-tight">
                  {profile?.full_name || user.email}
                </span>
                <span
                  className={`text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                    isAdmin ? 'text-emerald-400' : 'text-blue-400'
                  }`}
                >
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="w-2.5 h-2.5" />
                      ADMIN
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-2.5 h-2.5" />
                      CLIENTE
                    </>
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-950 font-bold px-3.5 py-2 rounded-xl transition text-xs shadow-lg shadow-white/5"
          >
            <LogIn className="w-3.5 h-3.5" />
            Ingresar con Google
          </Link>
        )}
      </div>
    </header>
  );
}
