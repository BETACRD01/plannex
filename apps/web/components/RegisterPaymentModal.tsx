'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import type { Credit } from '@workspace/supabase';
import {
  X,
  UploadCloud,
  FileCheck,
  Loader2,
  AlertCircle,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2
} from 'lucide-react';

interface RegisterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: Credit[];
  defaultCreditId?: string;
  isClientMode?: boolean;
}

export function RegisterPaymentModal({
  isOpen,
  onClose,
  credits,
  defaultCreditId,
  isClientMode = false,
}: RegisterPaymentModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const activeCredits = credits.filter((c) => c.status !== 'cancelado');
  const [selectedCreditId, setSelectedCreditId] = useState<string>(
    defaultCreditId || activeCredits[0]?.id || ''
  );

  const selectedCredit = credits.find((c) => c.id === selectedCreditId);

  const [amount, setAmount] = useState<string>(
    selectedCredit ? String(selectedCredit.installment_amount) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [userNotes, setUserNotes] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

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

  const handleCreditChange = (creditId: string) => {
    setSelectedCreditId(creditId);
    const cr = credits.find((c) => c.id === creditId);
    if (cr) {
      setAmount(String(cr.installment_amount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredit) {
      setErrorMsg('Debes seleccionar un crédito.');
      return;
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (isClientMode && !voucherFile) {
      setErrorMsg('Por favor adjunta la foto o captura del comprobante bancario (transferencia o depósito).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let voucherUrl: string | null = null;

      // 1. Subir comprobante si existe
      if (voucherFile) {
        const fileExt = voucherFile.name.split('.').pop() || 'jpg';
        const fileName = `creditos/${selectedCredit.id}/${Date.now()}_recibo.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('payment-vouchers')
          .upload(fileName, voucherFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadErr) {
          console.error('Error subiendo comprobante a Storage:', uploadErr);
          throw new Error('Error al subir la imagen del comprobante: ' + uploadErr.message);
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-vouchers')
            .getPublicUrl(uploadData.path);
          voucherUrl = publicUrl;
        }
      }

      // 2. Obtener usuario actual para auditoría
      const { data: { user } } = await supabase.auth.getUser();

      const previousBalance = Number(selectedCredit.remaining_balance);
      const newBalance = Math.max(0, previousBalance - payAmount);

      // 3. Registrar el abono en credit_payments (el trigger de Postgres amortiza cuotas y actualiza saldos)
      const { error: paymentErr } = await supabase
        .from('credit_payments')
        .insert({
          credit_id: selectedCredit.id,
          amount: payAmount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          previous_balance: previousBalance,
          new_balance: newBalance,
          voucher_url: voucherUrl,
          user_notes: userNotes || (isClientMode ? 'Comprobante reportado por el cliente' : null),
          admin_notes: isClientMode
            ? `Comprobante reportado por el cliente desde su portal ($${payAmount.toFixed(2)})`
            : `Abono de $${payAmount.toFixed(2)} registrado`,
          created_by: user?.id || null,
        });

      if (paymentErr) throw paymentErr;

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el abono.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${
              isClientMode 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {isClientMode ? '¡Comprobante Enviado y Pago Registrado!' : '¡Abono Registrado Exitosamente!'}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {isClientMode
                ? 'Tu comprobante bancario se guardó en la bóveda y tu cuota se ha actualizado en tiempo real.'
                : 'Se ha amortizado el plan de cuotas y actualizado el saldo del crédito en tiempo real.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              {isClientMode ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                  <UploadCloud className="w-3.5 h-3.5" />
                  Portal del Cliente • Reportar Pago
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                  <DollarSign className="w-3.5 h-3.5" />
                  Caja & Cobranzas
                </div>
              )}
              <h2 className="text-xl font-black text-white">
                {isClientMode ? 'Reportar Pago / Subir Comprobante' : 'Registrar Abono / Pago de Cuota'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isClientMode
                  ? 'Adjunta la captura o foto del comprobante de transferencia bancaria para abonar a tu cuenta.'
                  : 'Ingresa el valor recaudado para amortizar el saldo del bien financiado.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Selector de Crédito */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isClientMode ? 'Selecciona tu Financiamiento *' : 'Selecciona el Crédito / Cliente *'}
              </label>
              <select
                value={selectedCreditId}
                onChange={(e) => handleCreditChange(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {activeCredits.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.item_description} (Saldo: ${c.remaining_balance})
                  </option>
                ))}
              </select>

              {selectedCredit && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400">Cuota regular:</span>
                    <strong className="text-emerald-400 ml-1.5">${selectedCredit.installment_amount} ({selectedCredit.frequency})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Saldo actual:</span>
                    <strong className="text-white ml-1.5">${selectedCredit.remaining_balance}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Monto y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Monto Pagado ($ USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fecha de la Transferencia / Pago *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Método de Pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="transferencia">Transferencia Bancaria (Pichincha / Guayaquil / etc.)</option>
                <option value="deposito">Depósito Bancario / Banco del Barrio / Mi Vecino</option>
                <option value="de_una">Pago De Una</option>
                <option value="efectivo">Efectivo en Oficina</option>
                <option value="tarjeta">Tarjeta de Débito / Crédito</option>
              </select>
            </div>

            {/* Subida de Comprobante / Recibo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isClientMode ? 'Foto o Captura del Comprobante Bancario (Obligatorio) *' : 'Foto / Captura del Comprobante (Opcional pero recomendado)'}
              </label>
              <div className={`border border-dashed rounded-xl p-3.5 text-center bg-slate-950/40 transition ${
                isClientMode ? 'border-blue-500/50 hover:border-blue-400' : 'border-slate-700 hover:border-emerald-500/60'
              }`}>
                <input
                  type="file"
                  id="abono-voucher"
                  accept="image/*,application/pdf"
                  onChange={handleVoucherChange}
                  className="hidden"
                />
                <label
                  htmlFor="abono-voucher"
                  className="cursor-pointer flex items-center justify-center gap-2"
                >
                  {voucherFile ? (
                    <>
                      <FileCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs text-white font-medium truncate max-w-[200px]">
                        {voucherFile.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className={`w-5 h-5 ${isClientMode ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="text-xs text-slate-300 font-semibold">
                        {isClientMode ? 'Seleccionar foto de galería o cámara' : 'Adjuntar foto del recibo o transferencia'}
                      </span>
                    </>
                  )}
                </label>
              </div>

              {voucherPreview && (
                <div className="mt-2 text-center">
                  <img
                    src={voucherPreview}
                    alt="Preview"
                    className="max-h-28 mx-auto rounded-lg border border-slate-800 object-contain shadow-md"
                  />
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isClientMode ? 'Detalle o Nro. de Referencia / Comprobante' : 'Detalles / Comentarios del Abono'}
              </label>
              <input
                type="text"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder={isClientMode ? 'Ej: Transferencia desde mi cuenta Banco Pichincha, ref #004512' : 'Ejemplo: Recibo de caja #00451 o Transferencia Pichincha...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg disabled:opacity-50 ${
                isClientMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isClientMode ? 'Subiendo comprobante y registrando...' : 'Procesando abono...'}
                </>
              ) : (
                isClientMode
                  ? `Enviar Comprobante y Registrar Pago de $${parseFloat(amount || '0').toFixed(2)}`
                  : `Aplicar Abono de $${parseFloat(amount || '0').toFixed(2)}`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
