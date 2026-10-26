'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import type { SubscriptionPlan } from '@workspace/supabase';
import {
  X,
  UploadCloud,
  FileCheck,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  CreditCard,
  Building2,
  QrCode
} from 'lucide-react';

interface PaymentModalProps {
  plans: SubscriptionPlan[];
  selectedPlanId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function PaymentModal({
  plans,
  selectedPlanId,
  isOpen,
  onClose,
  userId,
}: PaymentModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [planId, setPlanId] = useState<string>(selectedPlanId || plans[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<string>('transferencia_bancaria');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [userNotes, setUserNotes] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentPlan = plans.find((p) => p.id === planId) || plans[0];

  const handleVoucherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVoucherFile(file);
      if (file.type.startsWith('image/')) {
        setVoucherPreview(URL.createObjectURL(file));
      } else {
        setVoucherPreview(null);
      }
    }
  };

  const handleEvidenceAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setEvidenceFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherFile) {
      setErrorMsg('Debes adjuntar el comprobante o captura de tu pago.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      // 1. Subir comprobante principal a Supabase Storage
      const fileExt = voucherFile.name.split('.').pop();
      const voucherFileName = `${userId}/${Date.now()}_comprobante.${fileExt}`;
      const { data: voucherUpload, error: voucherErr } = await supabase.storage
        .from('payment-vouchers')
        .upload(voucherFileName, voucherFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (voucherErr) throw voucherErr;

      const { data: { publicUrl: voucherUrl } } = supabase.storage
        .from('payment-vouchers')
        .getPublicUrl(voucherUpload.path);

      // 2. Subir evidencias adicionales si existen
      const evidenceUrls: string[] = [];
      for (const [idx, file] of evidenceFiles.entries()) {
        const ext = file.name.split('.').pop();
        const evName = `${userId}/${Date.now()}_evidencia_${idx}.${ext}`;
        const { data: evUpload, error: evErr } = await supabase.storage
          .from('payment-vouchers')
          .upload(evName, file);
        if (!evErr && evUpload) {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-vouchers')
            .getPublicUrl(evUpload.path);
          evidenceUrls.push(publicUrl);
        }
      }

      // 3. Registrar en la tabla subscription_payments en estado 'pending'
      const { error: insertErr } = await supabase
        .from('subscription_payments')
        .insert({
          user_id: userId,
          plan_id: currentPlan.id,
          amount: currentPlan.price,
          currency: currentPlan.currency,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          voucher_url: voucherUrl,
          evidence_urls: evidenceUrls,
          user_notes: userNotes || null,
          status: 'pending', // Regla estricta: siempre ingresa como PENDIENTE
        });

      if (insertErr) throw insertErr;

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al registrar el comprobante.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">¡Comprobante Enviado con Éxito!</h3>
            <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
              Tu pago ha sido registrado con estado <strong className="text-amber-400">PENDIENTE</strong>.
              El administrador verificará la transacción para activar los {currentPlan.duration_months / 12} años de vigencia.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Registrar Comprobante de Pago</h2>
              <p className="text-xs text-slate-400 mt-1">
                Adjunta tu recibo o transferencia para validar tu plan de suscripción.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Selector de Plan */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Selecciona tu Plan de Membresía
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      planId === p.id
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-sm text-white">{p.name}</span>
                      <span className="text-emerald-400 font-extrabold text-sm">
                        ${p.price} {p.currency}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">
                      {p.duration_months} meses ({p.duration_months / 12} años de vigencia)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Método de Pago y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Método de Pago Utilizado
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="transferencia_bancaria">Transferencia Bancaria</option>
                  <option value="de_una">Pago De Una</option>
                  <option value="deposito">Depósito en Ventanilla</option>
                  <option value="tarjeta">Tarjeta de Débito / Crédito</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro Método</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Fecha de la Transacción
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Subida de Comprobante Principal */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Comprobante de Pago Principal (Captura, Foto o PDF) *
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-5 text-center bg-slate-950/40 transition">
                <input
                  type="file"
                  id="voucher-upload"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleVoucherChange}
                  className="hidden"
                />
                <label
                  htmlFor="voucher-upload"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  {voucherFile ? (
                    <div className="space-y-2">
                      <FileCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-xs font-semibold text-white">{voucherFile.name}</p>
                      <span className="text-[10px] text-emerald-400 underline">Cambiar archivo</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
                      <p className="text-xs font-semibold text-slate-200">
                        Haz clic aquí para seleccionar el comprobante
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        PNG, JPG, WEBP o PDF (Máximo 10MB)
                      </p>
                    </>
                  )}
                </label>
              </div>

              {voucherPreview && (
                <div className="mt-3">
                  <p className="text-[10px] text-slate-400 mb-1">Vista previa del comprobante:</p>
                  <img
                    src={voucherPreview}
                    alt="Vista previa"
                    className="max-h-36 rounded-xl border border-slate-800 object-contain bg-slate-950"
                  />
                </div>
              )}
            </div>

            {/* Evidencias Adicionales */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-300">
                  Evidencias Adicionales (Opcional)
                </label>
                <label
                  htmlFor="evidence-upload"
                  className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer inline-flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar fotos
                </label>
                <input
                  type="file"
                  id="evidence-upload"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleEvidenceAdd}
                  className="hidden"
                />
              </div>

              {evidenceFiles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {evidenceFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300"
                    >
                      <span className="truncate max-w-[120px]">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeEvidence(i)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Puedes anexar fotos secundarias o capturas adicionales de la transferencia bancaria.
                </p>
              )}
            </div>

            {/* Comentarios del Usuario */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Comentarios y Detalles de la Transacción
              </label>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows={3}
                placeholder="Ejemplo: Transferencia realizada desde Banco Pichincha, número de confirmación #987654321..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Botón de Envío */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subiendo comprobante a Supabase...
                  </>
                ) : (
                  `Enviar Comprobante por $${currentPlan.price} ${currentPlan.currency}`
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                * Tu pago quedará registrado en espera de revisión administrativa para activar la vigencia.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
