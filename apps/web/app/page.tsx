import Link from 'next/link';
import { createClient } from '../lib/supabase/server';
import type { Profile } from '@workspace/supabase';
import type { User } from '@supabase/supabase-js';
import { Database, Smartphone, Globe, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

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

  if (isConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      user = currentUser;

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        profile = data as Profile | null;
      }
    } catch {
      // Ignorar errores de conexión al inicializar
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12">
      <div className="max-w-5xl mx-auto w-full">
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Plannex App
              </span>
              <span className="text-xs text-slate-400">Paga de una • Planifica • Registra</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-white">
              Plannex
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-200">{profile?.full_name || user.email}</p>
                  <p className="text-xs text-emerald-400">Autenticado</p>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 text-sm"
              >
                Iniciar Sesión / Registro
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </header>

        {/* Estado de Supabase */}
        <section className="mt-8">
          <div className={`p-5 rounded-2xl border ${isConfigured ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-amber-950/20 border-amber-800/40 text-amber-300'}`}>
            <div className="flex items-start gap-3">
              {isConfigured ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="font-semibold text-base text-white">
                  {isConfigured
                    ? 'Conexión a Supabase configurada correctamente'
                    : 'Configuración de Supabase pendiente en .env.local'}
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  {isConfigured
                    ? `Conectado a: ${supabaseUrl}`
                    : 'Copia el archivo .env.local.example a .env.local y coloca tu SUPABASE_URL y SUPABASE_ANON_KEY de tu proyecto Supabase.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tarjetas de arquitectura vinculada */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Card Web */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Globe className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Web App (Next.js 15)</h2>
            <p className="text-sm text-slate-400 mt-2">
              Ubicada en <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">apps/web</code>.
              Incluye SSR, Server Actions, Tailwind CSS y componentes de autenticación.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              Puerto predeterminado: <span className="text-blue-300 font-mono">http://localhost:3000</span>
            </div>
          </div>

          {/* Card Móvil */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Mobile App (Expo)</h2>
            <p className="text-sm text-slate-400 mt-2">
              Ubicada en <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-violet-300">apps/mobile</code>.
              React Native con Expo Go, autenticación persistente con AsyncStorage y types compartidos.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              Ejecutar con: <span className="text-violet-300 font-mono">npm run dev:mobile</span>
            </div>
          </div>

          {/* Card Backend */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Backend Supabase</h2>
            <p className="text-sm text-slate-400 mt-2">
              Estructura compartida en <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">packages/supabase</code> y migraciones SQL en <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">supabase/</code>.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              Gestión centralizada de perfiles y seguridad RLS.
            </div>
          </div>
        </section>

        {/* Guía rápida de inicio */}
        <section className="mt-8 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Cómo empezar el desarrollo
          </h3>
          <ol className="mt-4 space-y-3 text-sm text-slate-300 list-decimal list-inside">
            <li>
              Crea tu proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">supabase.com</a> si aún no tienes uno.
            </li>
            <li>
              Copia el contenido del archivo SQL en <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-200">supabase/migrations/20261026000000_initial_schema.sql</code> en el editor SQL de Supabase para crear la tabla de perfiles y las políticas de seguridad.
            </li>
            <li>
              Copia tus credenciales (Project URL y Anon Key) en los archivos <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-200">.env.local</code> en <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-200">apps/web</code> y <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-200">apps/mobile</code>.
            </li>
            <li>
              ¡Todo listo! Los mismos usuarios y datos se sincronizan automáticamente entre tu web y tu app móvil.
            </li>
          </ol>
        </section>
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500 max-w-5xl mx-auto w-full pt-6 border-t border-slate-900">
        Plannex © 2026 • Pagos rápidos, planificación y control financiero en Web & Móvil
      </footer>
    </main>
  );
}
