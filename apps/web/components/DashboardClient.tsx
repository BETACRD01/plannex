'use client';

import { useState } from 'react';
import { SubscriptionCard } from './SubscriptionCard';
import { PaymentModal } from './PaymentModal';
import type { SubscriptionPlan, UserSubscription, SubscriptionPayment } from '@workspace/supabase';
import {
  Sparkles,
  Check,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Eye,
  PlusCircle,
  Calendar
} from 'lucide-react';

interface DashboardClientProps {
  user: { id: string; email?: string } | null;
  subscription: (UserSubscription & { plan?: SubscriptionPlan | null }) | null;
  plans: SubscriptionPlan[];
  userPayments: (SubscriptionPayment & { plan?: SubscriptionPlan | null })[];
}

export function DashboardClient({
  user,
  subscription,
  plans,
  userPayments,
}: DashboardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const pendingPayments = userPayments.filter((p) => p.status === 'pending');

  const handleOpenPayment = (planId?: string) => {
    setSelectedPlanId(planId || plans[0]?.id || null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-12">
      {/* 1. Tarjeta de Vigencia y Estado de la Suscripción */}
      {user && (
        <section>
          <SubscriptionCard
            subscription={subscription}
            pendingPaymentCount={pendingPayments.length}
          />
        </section>
      )}

      {/* 2. Sección de Planes de Suscripción (3 y 4 Años) */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Membresías de Larga Duración
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-1">
              Planes de Suscripción Disponibles
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Asegura tu tarifa preferencial y mantén el control total de tus pagos sin renovaciones mensuales.
            </p>
          </div>

          {user && (
            <button
              onClick={() => handleOpenPayment()}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Registrar Comprobante
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isFourYears = plan.duration_months === 48;
            const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];

            return (
              <div
                key={plan.id}
                className={`relative bg-slate-900/80 rounded-3xl p-6 sm:p-8 border transition hover:border-slate-700 flex flex-col justify-between ${
                  isFourYears
                    ? 'border-emerald-500/50 shadow-2xl shadow-emerald-500/10'
                    : 'border-slate-800'
                }`}
              >
                {isFourYears && (
                  <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider shadow">
                    Más Popular • Máximo Ahorro
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                    <span className="text-xs text-slate-400 uppercase font-semibold">
                      {plan.currency} / {plan.duration_months} meses ({plan.duration_months / 12} años)
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-emerald-400 font-medium">
                    Equivalente a solo ${(Number(plan.price) / (plan.duration_months / 12)).toFixed(2)} / año
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                    <p className="text-xs font-semibold text-slate-300">Beneficios incluidos:</p>
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800">
                  {user ? (
                    <button
                      onClick={() => handleOpenPayment(plan.id)}
                      className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
                        isFourYears
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Elegir Plan & Subir Comprobante
                    </button>
                  ) : (
                    <a
                      href="/auth/login"
                      className="block text-center w-full py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition"
                    >
                      Iniciar Sesión para Suscribirte
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Sección Historial de Pagos y Comprobantes del Usuario */}
      {user && (
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Mis Pagos y Comprobantes</h3>
              <p className="text-xs text-slate-400 mt-1">
                Registro transparente del estado de cada transacción y observaciones administrativas.
              </p>
            </div>
          </div>

          {userPayments.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800/60 p-6">
              <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">Aún no has registrado pagos</p>
              <p className="text-xs text-slate-500 mt-1">
                Cuando subas una captura o recibo de tu membresía, podrás seguir su estado de aprobación aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userPayments.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition hover:border-slate-700"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{p.plan?.name || 'Membresía'}</span>
                      <span className="text-xs font-extrabold text-emerald-400">
                        ${p.amount} {p.currency}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Fecha: {p.payment_date}</span>
                      <span>•</span>
                      <span className="capitalize">{p.payment_method.replace('_', ' ')}</span>
                      {p.user_notes && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 italic truncate max-w-xs">&quot;{p.user_notes}&quot;</span>
                        </>
                      )}
                    </div>

                    {p.admin_notes && (
                      <div className="mt-2 text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        <strong className="text-amber-400">Observación del Administrador:</strong> {p.admin_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Badge de Estado */}
                    {p.status === 'approved' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprobado
                      </span>
                    )}
                    {p.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" />
                        En Verificación
                      </span>
                    )}
                    {p.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" />
                        Rechazado
                      </span>
                    )}

                    {p.voucher_url && (
                      <a
                        href={p.voucher_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
                        title="Ver comprobante adjunto"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal de Registro de Pago */}
      {user && (
        <PaymentModal
          plans={plans}
          selectedPlanId={selectedPlanId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}
