'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';
import { ArrowLeft, Loader2, Lock, Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage({ text: error.message, type: 'error' });
        } else if (data.session) {
          setMessage({ text: '¡Cuenta creada y sesión iniciada con éxito!', type: 'success' });
          router.push('/');
          router.refresh();
        } else {
          setMessage({
            text: 'Registro exitoso. Revisa tu correo electrónico para confirmar tu cuenta.',
            type: 'success',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage({ text: error.message, type: 'error' });
        } else {
          setMessage({ text: 'Iniciando sesión...', type: 'success' });
          router.push('/');
          router.refresh();
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Ocurrió un error inesperado', type: 'error' });
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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">Autenticación Supabase</span>
          </div>

          <h2 className="text-2xl font-bold text-white">
            {isSignUp ? 'Crear una cuenta' : 'Bienvenido de nuevo'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isSignUp
              ? 'Regístrate para probar la base de datos vinculada con tu app'
              : 'Ingresa con tu correo y contraseña'}
          </p>

          {message && (
            <div
              className={`mt-4 p-3 rounded-xl text-sm ${
                message.type === 'error'
                  ? 'bg-rose-950/40 border border-rose-800 text-rose-300'
                  : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-950 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-sm text-slate-400 hover:text-emerald-400 transition"
            >
              {isSignUp
                ? '¿Ya tienes una cuenta? Inicia sesión aquí'
                : '¿No tienes cuenta aún? Regístrate aquí'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
