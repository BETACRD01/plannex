'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';
import { ArrowLeft, Loader2, ShieldCheck, UserCheck, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const redirectOrigin = window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('not enabled') ||
          error.message.toLowerCase().includes('unsupported provider')
        ) {
          setErrorMsg(
            'El proveedor de Google OAuth aún no ha sido activado en la consola de Supabase. Sigue las instrucciones abajo para activarlo con tu Client ID.'
          );
          setShowConfigHelper(true);
        } else {
          setErrorMsg(error.message);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con Google OAuth');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Luz de fondo decorativa */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-bold tracking-wider uppercase">Plannex Autenticación</span>
            </div>

            <h2 className="text-2xl font-black text-white">
              Acceso con Google
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Inicia sesión con tu cuenta de Google. El sistema detectará automáticamente si eres <strong className="text-emerald-400">Administrador</strong> o <strong className="text-blue-400">Cliente</strong> para darte acceso a tu panel.
            </p>

            {errorMsg && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-200">Aviso de Autenticación</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Botón principal de Google */}
            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-bold py-3.5 px-4 rounded-2xl transition shadow-xl shadow-white/5 flex items-center justify-center gap-3 text-sm cursor-pointer border border-slate-200"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar con Google</span>
              </button>
            </div>

            {/* Diferenciación de roles explicada */}
            <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Roles del Sistema:
              </p>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-200">Administrador</p>
                  <p className="text-slate-400 text-[11px]">
                    Gestión total de cartera, creación de créditos para clientes y registro de abonos.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-xs">
                <UserCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-200">Cliente / Deudor</p>
                  <p className="text-slate-400 text-[11px]">
                    Consulta personalizada de tus compras a crédito, saldo pendiente y estado de cuenta.
                  </p>
                </div>
              </div>
            </div>

            {/* Asistente de configuración de Google OAuth si hace falta */}
            {showConfigHelper && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-800 text-xs text-amber-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Instrucciones para activar Google OAuth:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>Ve a tu consola de Google Cloud &gt; APIs &gt; Credenciales.</li>
                  <li>Crea un ID de cliente OAuth (Tipo Web).</li>
                  <li>
                    URI de redirección autorizada:{' '}
                    <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">
                      https://feefwrtilzifxwyacrle.supabase.co/auth/v1/callback
                    </code>
                  </li>
                  <li>Copia el Client ID y Client Secret en Supabase &gt; Authentication &gt; Providers &gt; Google y actívalo.</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
