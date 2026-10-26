import { Calendar, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import type { SubscriptionPlan, UserSubscription } from '@workspace/supabase';

interface SubscriptionCardProps {
  subscription: (UserSubscription & { plan?: SubscriptionPlan | null }) | null;
  pendingPaymentCount?: number;
}

export function SubscriptionCard({ subscription, pendingPaymentCount = 0 }: SubscriptionCardProps) {
  if (!subscription || subscription.status !== 'active' || !subscription.expires_at) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingPaymentCount > 0 ? 'Pago en Verificación' : 'Sin Membresía Activa'}
            </div>
            <h3 className="text-xl font-bold text-white">
              {pendingPaymentCount > 0 ? 'Comprobante en Revisión' : 'Activa tu Membresía Plannex'}
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              {pendingPaymentCount > 0
                ? 'Hemos recibido tu comprobante de pago. Un administrador está verificando los datos para activar tus 3 o 4 años de vigencia.'
                : 'Elige un plan de 3 o 4 años, sube tu comprobante y obtén acceso total con control de vigencia transparente.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startsAt = subscription.starts_at ? new Date(subscription.starts_at) : now;
  const expiresAt = new Date(subscription.expires_at);

  const totalDurationMs = Math.max(1, expiresAt.getTime() - startsAt.getTime());
  const elapsedMs = Math.max(0, now.getTime() - startsAt.getTime());
  const remainingMs = expiresAt.getTime() - now.getTime();

  const isExpired = remainingMs <= 0;
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const remainingMonths = Math.floor(remainingDays / 30);
  const percentRemaining = Math.max(0, Math.min(100, Math.round(((totalDurationMs - elapsedMs) / totalDurationMs) * 100)));

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {isExpired ? 'Membresía Vencida' : 'Membresía Activa'}
            </span>
            <span className="text-xs text-slate-400">
              {subscription.plan?.name || 'Plan Plannex'}
            </span>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">Tiempo restante:</p>
            <p className="text-base font-extrabold text-white">
              {isExpired
                ? '0 días (Expirado)'
                : remainingMonths > 0
                ? `${remainingMonths} meses y ${remainingDays % 30} días`
                : `${remainingDays} días`}
            </p>
          </div>
        </div>

        {/* Fechas de vigencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Fecha de Inicio</p>
              <p className="text-sm font-semibold text-slate-200">{formatDate(startsAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Fecha de Vencimiento</p>
              <p className="text-sm font-semibold text-emerald-300">{formatDate(expiresAt)}</p>
            </div>
          </div>
        </div>

        {/* Barra de progreso de vigencia */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Progreso del periodo contratado</span>
            <span className="font-semibold text-emerald-400">{percentRemaining}% disponible</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentRemaining < 15
                  ? 'bg-rose-500'
                  : percentRemaining < 30
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
