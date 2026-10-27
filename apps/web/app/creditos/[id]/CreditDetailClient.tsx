'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterPaymentModal } from '../../../components/RegisterPaymentModal';
import { EditCreditModal } from '../../../components/EditCreditModal';
import { createClient } from '../../../lib/supabase/client';
import type { Credit, CreditInstallment, CreditPayment } from '@workspace/supabase';
import {
  ArrowLeft,
  Printer,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  FileText,
  Calendar,
  Bike,
  Smartphone,
  Tv,
  Coins,
  Package,
  Phone,
  User,
  MapPin,
  ExternalLink,
  X,
  Edit3,
  UploadCloud,
  Loader2,
  Download,
  AlertTriangle,
  RotateCcw,
  Globe,
  Lock
} from 'lucide-react';

interface CreditDetailClientProps {
  credit: Credit;
  installments: CreditInstallment[];
  payments: CreditPayment[];
  isAdmin?: boolean;
  isClientOwner?: boolean;
  isLoggedIn?: boolean;
}

export function CreditDetailClient({
  credit,
  installments,
  payments,
  isAdmin = false,
  isClientOwner = false,
  isLoggedIn = false
}: CreditDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentCredit, setCurrentCredit] = useState<Credit>(credit);
  const [currentPayments, setCurrentPayments] = useState<CreditPayment[]>(payments);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<{ url: string; title: string } | null>(null);
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null);

  const totalPaid = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDebt = Number(currentCredit.total_debt);
  const remainingBalance = Number(currentCredit.remaining_balance);
  const percentPaid = totalDebt > 0
    ? Math.min(100, Math.round((totalPaid / totalDebt) * 100))
    : 100;

  const overdueInstallments = installments.filter(
    (i) => (i.status === 'vencida' || (i.status === 'parcial' && new Date(i.due_date) < new Date()))
  );

  const nextPendingInstallment = installments.find(
    (i) => i.status === 'pendiente' || i.status === 'parcial' || i.status === 'vencida'
  );

  const isMediasCuotas = Boolean(currentCredit.notes?.includes('MEDIAS CUOTAS'));
  const hasOverdueInPromo = isMediasCuotas && installments
    .filter((i) => i.installment_number <= 23)
    .some((i) => i.days_overdue > 0 || (i.status === 'vencida' && new Date(i.due_date) < new Date()));

  const promoPaidCount = isMediasCuotas
    ? installments.filter((i) => i.installment_number <= 23 && i.status === 'pagada' && i.days_overdue === 0).length
    : 0;

  const [isRevertingPromo, setIsRevertingPromo] = useState(false);

  const handleRevertPromo = async () => {
    if (!confirm('¿Deseas anular la promoción y revertir las cuotas 24 a 46 a la tarifa completa de $152.21 por incumplimiento de la cláusula de cero atrasos?')) {
      return;
    }
    setIsRevertingPromo(true);
    try {
      const fullCuota = 152.21;
      const { error: instErr } = await supabase
        .from('credit_installments')
        .update({ amount: fullCuota })
        .eq('credit_id', currentCredit.id)
        .gte('installment_number', 24);

      if (instErr) throw instErr;

      const newTotalDebt = Number((46 * fullCuota).toFixed(2));
      const newRemaining = Number((newTotalDebt - totalPaid).toFixed(2));

      const { error: credErr } = await supabase
        .from('credits')
        .update({
          total_debt: newTotalDebt,
          remaining_balance: newRemaining,
          notes: currentCredit.notes?.replace('PROMOCIÓN MEDIAS CUOTAS GRATIS', 'PROMOCIÓN MEDIAS CUOTAS (ANULADA POR MORA)')
        })
        .eq('id', currentCredit.id);

      if (credErr) throw credErr;

      alert('Se anularon las medias cuotas y se restableció el cronograma a $152.21/mes.');
      router.refresh();
    } catch (err: any) {
      alert('Error al revertir promoción: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsRevertingPromo(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUploadVoucherForPayment = async (paymentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingPaymentId(paymentId);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `creditos/${currentCredit.id}/${paymentId}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('payment-vouchers')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-vouchers')
        .getPublicUrl(uploadData.path);

      const { error: updateErr } = await supabase
        .from('credit_payments')
        .update({ voucher_url: publicUrl })
        .eq('id', paymentId);

      if (updateErr) throw updateErr;

      setCurrentPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, voucher_url: publicUrl } : p))
      );
    } catch (err: any) {
      console.error('Error al subir comprobante:', err);
      alert('Error al subir el comprobante: ' + (err.message || 'Error de conexión'));
    } finally {
      setUploadingPaymentId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'vehiculo': return Bike;
      case 'telefonia': return Smartphone;
      case 'electrodomestico': return Tv;
      case 'prestamo': return Coins;
      default: return Package;
    }
  };

  const CategoryIcon = getCategoryIcon(currentCredit.item_category);

  return (
    <div className="space-y-8">
      {/* Botones de Navegación y Acciones (Ocultos al imprimir) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Cartera de Créditos
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir Estado de Cuenta
          </button>

          {/* Botón Editar Crédito (Exclusivo para Admin) */}
          {isAdmin && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-xs transition"
            >
              <Edit3 className="w-4 h-4" />
              Editar Financiamiento
            </button>
          )}

          {/* Botón Registrar Abono (Admin) */}
          {isAdmin && currentCredit.status !== 'cancelado' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
            >
              <DollarSign className="w-4 h-4" />
              Registrar Abono
            </button>
          )}

          {/* Botón Reportar Pago / Subir Comprobante (Cliente) */}
          {isClientOwner && currentCredit.status !== 'cancelado' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/20"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Reportar Pago / Subir Comprobante</span>
            </button>
          )}
        </div>
      </div>

      {/* Cabecera Formal del Estado de Cuenta */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden print:border-none print:p-0 print:bg-white print:text-black">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800 print:border-black">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 print:hidden">
              <CategoryIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-extrabold text-emerald-400 print:text-emerald-700">
                  Estado de Cuenta • Financiamiento
                </span>
                <span className="text-[11px] font-mono text-slate-400 print:text-gray-500 bg-slate-800/60 px-2 py-0.5 rounded-md">
                  ID: #{currentCredit.id.slice(0, 8).toUpperCase()}
                </span>
                {currentCredit.is_public ? (
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Público (Solo Lectura)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Privado
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white print:text-black mt-0.5">
                {currentCredit.item_description}
              </h1>
              {currentCredit.item_identifier && (
                <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5 font-mono">
                  Identificador: {currentCredit.item_identifier}
                </p>
              )}
            </div>
          </div>

          <div className="text-right flex flex-col items-start sm:items-end">
            {currentCredit.status === 'activo' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Crédito Activo (Al Día)
              </span>
            )}
            {currentCredit.status === 'atrasado' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                En Mora ({overdueInstallments.length} cuotas vencidas)
              </span>
            )}
            {currentCredit.status === 'cancelado' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Crédito Liquidado (Cancelado)
              </span>
            )}
            <p className="text-[11px] text-slate-400 print:text-gray-500 mt-1">
              Fecha de inicio: {currentCredit.start_date}
            </p>
          </div>
        </div>

        {/* Datos del Cliente & Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Ficha Cliente */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-gray-50 print:border-gray-200">
            <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Datos del Deudor
            </h3>
            <p className="text-sm font-bold text-white print:text-black">{currentCredit.customer_name}</p>
            {currentCredit.customer_email && (
              <p className="text-xs text-blue-400 print:text-gray-600 mt-1 truncate">
                {currentCredit.customer_email}
              </p>
            )}
            {currentCredit.customer_dni && (
              <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">C.I. / DNI: {currentCredit.customer_dni}</p>
            )}
            {currentCredit.customer_phone && (
              <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                {currentCredit.customer_phone}
              </p>
            )}
            {currentCredit.customer_address && (
              <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {currentCredit.customer_address}
              </p>
            )}
          </div>

          {/* Desglose Financiero */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-gray-50 print:border-gray-200 space-y-1.5 text-xs">
            <h3 className="font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Estructura Financiera
            </h3>
            <div className="flex justify-between text-slate-400 print:text-gray-700">
              <span>Precio de Venta:</span>
              <strong className="text-white print:text-black">${Number(currentCredit.total_price).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-slate-400 print:text-gray-700">
              <span>Entrada Inicial Pagada:</span>
              <span className="text-emerald-400 font-semibold">-${Number(currentCredit.down_payment).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 print:text-gray-700">
              <span>Capital Financiado:</span>
              <strong className="text-white print:text-black">${Number(currentCredit.financed_amount).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-slate-400 print:text-gray-700">
              <span>Interés ({currentCredit.interest_rate}%):</span>
              <strong className="text-amber-400">+${(Number(currentCredit.total_debt) - Number(currentCredit.financed_amount)).toFixed(2)}</strong>
            </div>
            <div className="pt-1.5 border-t border-slate-800 print:border-gray-300 flex justify-between font-bold text-sm">
              <span className="text-white print:text-black">Deuda Total:</span>
              <span className="text-white print:text-black">${Number(currentCredit.total_debt).toFixed(2)}</span>
            </div>
          </div>

          {/* Estado de Pagos Actual y Progreso */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-gray-50 print:border-gray-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2">
                Saldo Actual por Cobrar
              </h3>
              <p className="text-3xl font-black text-rose-400 print:text-rose-600">
                ${remainingBalance.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                Abonado a la fecha: <strong className="text-emerald-400 print:text-emerald-700">${totalPaid.toFixed(2)}</strong>
              </p>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Avance de amortización</span>
                <span className="font-bold text-white print:text-black">{percentPaid}%</span>
              </div>
              <div className="w-full bg-slate-800 print:bg-gray-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentPaid}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {currentCredit.notes && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 print:text-gray-700">
            <div className="font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Observaciones y Documentos Adjuntos:</span>
            </div>
            <div className="leading-relaxed break-words text-slate-300">
              {currentCredit.notes.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                if (part.match(/^https?:\/\//)) {
                  const isPdf = part.toLowerCase().includes('.pdf');
                  return (
                    <a
                      key={i}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 my-0.5 mx-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isPdf ? 'Ver PDF Original' : 'Ver Imagen / Contrato'}</span>
                    </a>
                  );
                }
                return part;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Banner de Control Estricto de Promoción Medias Cuotas (Artefacta) */}
      {isMediasCuotas && (
        <div className={`mb-6 p-4 rounded-2xl border ${
          hasOverdueInPromo
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              hasOverdueInPromo ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {hasOverdueInPromo ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>⚡ Promoción Medias Cuotas Gratis (Plazo 46 Meses)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    hasOverdueInPromo
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  }`}>
                    {hasOverdueInPromo ? 'Beneficio en Riesgo / Pérdida por Mora' : `Activa (${promoPaidCount}/23 Cuotas Cumplidas a Tiempo)`}
                  </span>
                </h3>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Ahorro en juego: $1,750.30
                </span>
              </div>
              <p className="text-xs mt-1.5 leading-relaxed text-slate-300">
                <strong className="text-amber-400">⚠️ Cláusula Estricta de Cero Atrasos:</strong> Para mantener el <strong>50% de descuento ($76.11/mes)</strong> en las cuotas 24 a la 46, debes pagar con <strong>CERO días de atraso</strong> todas las cuotas de la 1 a la 23. Si te atrasas aunque sea 1 día en cualquiera de las primeras 23 cuotas, <strong>se pierde automáticamente el descuento</strong> y las cuotas 24 a 46 regresan a la cuota completa de $152.21.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cuota 1: Pagada puntual (25/10/2026)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Calendar className="w-4 h-4" />
                    <span>Próximo vencimiento estricto: 25/11/2026 ($152.21)</span>
                  </div>
                </div>
                {isAdmin && hasOverdueInPromo && (
                  <button
                    type="button"
                    onClick={handleRevertPromo}
                    disabled={isRevertingPromo}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRevertingPromo ? 'Revertiendo...' : 'Anular Descuento y Cobrar $152.21'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Próxima Cuota a Pagar y Subida Rápida de Comprobante */}
      {nextPendingInstallment && currentCredit.status !== 'cancelado' && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black text-blue-400 tracking-wider">
                  Próxima Cuota a Cancelar
                </span>
                <span className="text-[11px] font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded-md font-mono">
                  Cuota #{nextPendingInstallment.installment_number}
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-0.5">
                Monto a Pagar: <span className="text-emerald-400 font-black">${(Number(nextPendingInstallment.amount) - Number(nextPendingInstallment.amount_paid)).toFixed(2)}</span>
                <span className="text-slate-400 text-xs font-normal ml-2">
                  (Fecha límite: <strong className="text-slate-200">{nextPendingInstallment.due_date}</strong>)
                </span>
              </p>
            </div>
          </div>

          {(isAdmin || isClientOwner) && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/20 shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isClientOwner ? 'Subir Comprobante de Esta Cuota' : 'Registrar Pago de Cuota'}</span>
            </button>
          )}
        </div>
      )}

      {/* Tabla del Plan de Pagos / Cronograma de Cuotas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 print:border-none print:p-0 print:bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white print:text-black">
              Plan de Pagos y Control de Cuotas
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
              {currentCredit.total_installments} cuotas fijas de ${Number(currentCredit.installment_amount).toFixed(2)} ({currentCredit.frequency})
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 print:bg-gray-100 text-slate-400 print:text-black uppercase tracking-wider text-[11px] border-b border-slate-800 print:border-black">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Fecha Vencimiento</th>
                <th className="py-3 px-3">Valor Cuota</th>
                <th className="py-3 px-3">Abonado</th>
                <th className="py-3 px-3">Saldo Cuota</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-right">Días Atraso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
              {installments.map((inst) => {
                const installmentDue = Math.max(0, Number(inst.amount) - Number(inst.amount_paid));

                return (
                  <tr key={inst.id} className="hover:bg-slate-800/30 transition print:hover:bg-transparent">
                    <td className="py-3 px-3 font-bold text-slate-300 print:text-black">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>Cuota #{inst.installment_number}</span>
                        {isMediasCuotas && inst.installment_number <= 23 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Fase Estricta
                          </span>
                        )}
                        {isMediasCuotas && inst.installment_number >= 24 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            50% Descuento
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-200 print:text-black">
                      {inst.due_date}
                    </td>

                    <td className="py-3 px-3 font-semibold text-white print:text-black">
                      ${Number(inst.amount).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-emerald-400 font-semibold print:text-emerald-700">
                      ${Number(inst.amount_paid).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-slate-300 print:text-black font-semibold">
                      ${installmentDue.toFixed(2)}
                    </td>

                    <td className="py-3 px-3">
                      {inst.status === 'pagada' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Pagada
                        </span>
                      )}
                      {inst.status === 'parcial' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          Parcial
                        </span>
                      )}
                      {inst.status === 'vencida' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          Vencida
                        </span>
                      )}
                      {inst.status === 'pendiente' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          Pendiente
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {inst.days_overdue > 0 && inst.status !== 'pagada' ? (
                        <span className="text-rose-400 font-bold print:text-rose-600">
                          {inst.days_overdue} días
                        </span>
                      ) : (
                        <span className="text-slate-500 print:text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial Completo de Abonos Realizados y Comprobantes */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 print:border-none print:p-0 print:bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-white print:text-black">
              Historial de Pagos y Comprobantes
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
              Registro de transacciones con visualización directa de comprobantes y fotos subidas.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-400">
            Total {currentPayments.length} abonos
          </span>
        </div>

        {currentPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl">
            Aún no se han registrado abonos para este crédito.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 print:bg-gray-100 text-slate-400 print:text-black uppercase tracking-wider text-[11px] border-b border-slate-800 print:border-black">
                <tr>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Monto Abonado</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Saldo Anterior</th>
                  <th className="py-3 px-3">Nuevo Saldo</th>
                  <th className="py-3 px-3">Comprobante / Foto</th>
                  <th className="py-3 px-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {currentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition print:hover:bg-transparent">
                    <td className="py-3 px-3 font-medium text-slate-200 print:text-black whitespace-nowrap">
                      {p.payment_date}
                    </td>

                    <td className="py-3 px-3 font-bold text-emerald-400 print:text-emerald-700">
                      ${Number(p.amount).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 capitalize text-slate-300 print:text-black">
                      {p.payment_method.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-3 text-slate-400 print:text-gray-600">
                      ${Number(p.previous_balance).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 font-semibold text-white print:text-black">
                      ${Number(p.new_balance).toFixed(2)}
                    </td>

                    {/* Columna Comprobante / Foto */}
                    <td className="py-3 px-3 print:hidden">
                      {p.voucher_url ? (
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedVoucher({ url: p.voucher_url!, title: `Comprobante de Abono: $${Number(p.amount).toFixed(2)} (${p.payment_date})` })}
                            className="relative group block w-11 h-11 rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-500 transition shrink-0 bg-slate-950 shadow"
                            title="Clic para ampliar foto"
                          >
                            <img
                              src={p.voucher_url}
                              alt="Comprobante"
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </button>
                          <button
                            onClick={() => setSelectedVoucher({ url: p.voucher_url!, title: `Comprobante de Abono: $${Number(p.amount).toFixed(2)} (${p.payment_date})` })}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold text-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver imagen</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs italic">Sin foto</span>
                          {(isAdmin || isClientOwner) && (
                            <label className="cursor-pointer text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/30 transition flex items-center gap-1">
                              {uploadingPaymentId === p.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                              ) : (
                                <UploadCloud className="w-3 h-3" />
                              )}
                              <span>Subir</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={uploadingPaymentId === p.id}
                                onChange={(e) => handleUploadVoucherForPayment(p.id, e)}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-300 print:text-black max-w-xs truncate">
                      {p.user_notes || p.admin_notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Firmas para impresión legal */}
        <div className="hidden print:grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-300 text-center text-xs text-black">
          <div>
            <div className="border-b border-black w-48 mx-auto mb-2" />
            <p className="font-bold">Firma del Cliente</p>
            <p className="text-gray-600">{currentCredit.customer_name}</p>
          </div>
          <div>
            <div className="border-b border-black w-48 mx-auto mb-2" />
            <p className="font-bold">Firma y Sello Autorizado</p>
            <p className="text-gray-600">Plannex Cobranzas & Crédito</p>
          </div>
        </div>
      </div>

      {/* Modal Registrar Abono / Reportar Pago */}
      <RegisterPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          router.refresh();
        }}
        credits={[currentCredit]}
        defaultCreditId={currentCredit.id}
        isClientMode={!isAdmin && isClientOwner}
      />

      {/* Modal Editar Crédito (Exclusivo Admin) */}
      <EditCreditModal
        credit={currentCredit}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={(up) => setCurrentCredit(up)}
      />

      {/* Modal Visor de Comprobante / Imagen con Zoom y Descarga */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{selectedVoucher.title}</span>
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={selectedVoucher.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-semibold px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir en pestaña
                </a>
                <a
                  href={selectedVoucher.url}
                  download="comprobante"
                  className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-semibold px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </a>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-2 border border-slate-800 flex items-center justify-center min-h-[350px] max-h-[70vh] overflow-hidden">
              <img
                src={selectedVoucher.url}
                alt="Comprobante"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
