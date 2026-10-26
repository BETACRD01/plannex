'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import type { SubscriptionPlan, SubscriptionPayment, Profile } from '@workspace/supabase';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  AlertTriangle,
  Loader2,
  ExternalLink,
  MessageSquare,
  X,
  Filter,
  DollarSign
} from 'lucide-react';

interface PaymentWithRelations extends SubscriptionPayment {
  plan?: SubscriptionPlan | null;
  user?: Profile | null;
}

interface AdminPanelClientProps {
  initialPayments: PaymentWithRelations[];
  plans: SubscriptionPlan[];
}

export function AdminPanelClient({ initialPayments, plans }: AdminPanelClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [payments, setPayments] = useState<PaymentWithRelations[]>(initialPayments);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedVoucher, setSelectedVoucher] = useState<{ url: string; title: string; evidences: string[] } | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<PaymentWithRelations | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const approvedCount = payments.filter((p) => p.status === 'approved').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;
  const totalApprovedAmount = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const filteredPayments = payments.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const handleApprove = async (payment: PaymentWithRelations) => {
    if (!confirm(`¿Confirmas la aprobación del pago de $${payment.amount} para ${payment.user?.email || 'el usuario'}? Esto activará la vigencia por ${payment.plan?.duration_months || 36} meses.`)) {
      return;
    }

    setProcessingId(payment.id);
    setActionMessage(null);

    try {
      const { error } = await supabase
        .from('subscription_payments')
        .update({
          status: 'approved',
          admin_notes: 'Comprobante verificado y aprobado por administración.',
        })
        .eq('id', payment.id);

      if (error) throw error;

      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? { ...p, status: 'approved', admin_notes: 'Comprobante verificado y aprobado.' }
            : p
        )
      );

      setActionMessage({
        text: `Pago aprobado con éxito. Se calculó y activó la vigencia del usuario en Supabase.`,
        type: 'success',
      });
      router.refresh();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error al aprobar el pago.', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPayment) return;

    setProcessingId(rejectingPayment.id);
    setActionMessage(null);

    try {
      const { error } = await supabase
        .from('subscription_payments')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || 'Comprobante no válido o pago no identificado en cuenta bancaria.',
        })
        .eq('id', rejectingPayment.id);

      if (error) throw error;

      setPayments((prev) =>
        prev.map((p) =>
          p.id === rejectingPayment.id
            ? { ...p, status: 'rejected', admin_notes: adminNotes }
            : p
        )
      );

      setActionMessage({
        text: `El pago ha sido marcado como rechazado con la observación guardada.`,
        type: 'success',
      });
      setRejectingPayment(null);
      setAdminNotes('');
      router.refresh();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Error al rechazar el pago.', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">Por Verificar</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{pendingCount}</p>
          <p className="text-xs text-slate-400 mt-1">Comprobantes pendientes de revisión</p>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Aprobados</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{approvedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Membresías con vigencia activa</p>
        </div>

        <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400">Rechazados</span>
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{rejectedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Observaciones notificadas al usuario</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Total Validado</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">${totalApprovedAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">Recaudación en planes confirmados</p>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs underline ml-4">
            Cerrar
          </button>
        </div>
      )}

      {/* Filtros de Estado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'approved'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Aprobados ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'rejected'
                ? 'bg-rose-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rechazados ({rejectedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({payments.length})
          </button>
        </div>
      </div>

      {/* Lista / Tabla de Pagos */}
      {filteredPayments.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No hay pagos en esta categoría</h3>
          <p className="text-xs text-slate-400 mt-1">
            Los comprobantes enviados por los usuarios aparecerán aquí para tu verificación.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4">Usuario</th>
                  <th className="py-4 px-4">Plan & Monto</th>
                  <th className="py-4 px-4">Método & Fecha</th>
                  <th className="py-4 px-4">Comprobante / Evidencias</th>
                  <th className="py-4 px-4">Notas Usuario</th>
                  <th className="py-4 px-4">Estado</th>
                  <th className="py-4 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((p) => {
                  const evidences = Array.isArray(p.evidence_urls) ? (p.evidence_urls as string[]) : [];

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      {/* Usuario */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{p.user?.full_name || 'Sin nombre'}</div>
                        <div className="text-slate-400 text-[11px]">{p.user?.email}</div>
                      </td>

                      {/* Plan & Monto */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-emerald-400">${p.amount} {p.currency}</div>
                        <div className="text-slate-300">{p.plan?.name || 'Membresía'}</div>
                        <div className="text-[10px] text-slate-500">{p.plan?.duration_months} meses</div>
                      </td>

                      {/* Método & Fecha */}
                      <td className="py-4 px-4">
                        <div className="capitalize font-medium text-slate-200">
                          {p.payment_method.replace('_', ' ')}
                        </div>
                        <div className="text-slate-400 text-[11px]">{p.payment_date}</div>
                      </td>

                      {/* Comprobante */}
                      <td className="py-4 px-4">
                        {p.voucher_url ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setSelectedVoucher({
                                  url: p.voucher_url!,
                                  title: `Comprobante de ${p.user?.email || 'Usuario'}`,
                                  evidences,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-semibold transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Recibo
                            </button>
                            {evidences.length > 0 && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                +{evidences.length} fotos
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">Sin archivo</span>
                        )}
                      </td>

                      {/* Notas Usuario */}
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-300 line-clamp-2 text-xs">
                          {p.user_notes || <span className="text-slate-500 italic">Sin notas</span>}
                        </p>
                        {p.admin_notes && (
                          <p className="text-[10px] text-amber-300/80 mt-1 line-clamp-1">
                            Obs: {p.admin_notes}
                          </p>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4">
                        {p.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprobado
                          </span>
                        )}
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </span>
                        )}
                        {p.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Rechazado
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(p)}
                              disabled={processingId === p.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center gap-1"
                            >
                              {processingId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Aprobar
                            </button>
                            <button
                              onClick={() => {
                                setRejectingPayment(p);
                                setAdminNotes('');
                              }}
                              disabled={processingId === p.id}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Verificado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Visor de Comprobante / Evidencias */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">{selectedVoucher.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={selectedVoucher.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir original
                </a>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-2 border border-slate-800 flex items-center justify-center min-h-[300px]">
              {selectedVoucher.url.endsWith('.pdf') ? (
                <iframe
                  src={selectedVoucher.url}
                  className="w-full h-[500px] rounded-xl"
                  title="Comprobante PDF"
                />
              ) : (
                <img
                  src={selectedVoucher.url}
                  alt="Comprobante"
                  className="max-h-[500px] object-contain rounded-xl"
                />
              )}
            </div>

            {selectedVoucher.evidences.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-300 mb-2">Evidencias adicionales adjuntas:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVoucher.evidences.map((ev, i) => (
                    <a
                      key={i}
                      href={ev}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-xl border border-slate-700 inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Evidencia #{i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Rechazar con Observación */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Rechazar Comprobante</h3>
            <p className="text-xs text-slate-400 mb-4">
              Indica al usuario el motivo por el cual no se pudo verificar su pago para que pueda adjuntar el comprobante correcto.
            </p>

            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observación o Motivo del Rechazo *
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ejemplo: Comprobante ilegible / El número de referencia no aparece en el extracto bancario..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingPayment(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingPayment.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  {processingId === rejectingPayment.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
