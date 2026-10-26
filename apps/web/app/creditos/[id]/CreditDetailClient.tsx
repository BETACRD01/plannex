'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterPaymentModal } from '../../../components/RegisterPaymentModal';
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
  X
} from 'lucide-react';

interface CreditDetailClientProps {
  credit: Credit;
  installments: CreditInstallment[];
  payments: CreditPayment[];
}

export function CreditDetailClient({ credit, installments, payments }: CreditDetailClientProps) {
  const router = useRouter();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<{ url: string; title: string } | null>(null);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const percentPaid = credit.total_debt > 0
    ? Math.min(100, Math.round((totalPaid / Number(credit.total_debt)) * 100))
    : 100;

  const overdueInstallments = installments.filter(
    (i) => (i.status === 'vencida' || (i.status === 'parcial' && new Date(i.due_date) < new Date()))
  );

  const handlePrint = () => {
    window.print();
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

  const CategoryIcon = getCategoryIcon(credit.item_category);

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

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition"
          >
            <Printer className="w-4 h-4" />
            Imprimir Estado de Cuenta
          </button>

          {credit.status !== 'cancelado' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
            >
              <DollarSign className="w-4 h-4" />
              Registrar Abono
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
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold text-emerald-400 print:text-emerald-700">
                  Estado de Cuenta • Financiamiento
                </span>
                <span className="text-[11px] text-slate-400 print:text-gray-500">
                  ID: #{credit.id.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white print:text-black mt-0.5">
                {credit.item_description}
              </h1>
              {credit.item_identifier && (
                <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5 font-mono">
                  Identificador: {credit.item_identifier}
                </p>
              )}
            </div>
          </div>

          <div className="text-right flex flex-col items-start sm:items-end">
            {credit.status === 'activo' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Crédito Activo (Al Día)
              </span>
            )}
            {credit.status === 'atrasado' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                En Mora ({overdueInstallments.length} cuotas vencidas)
              </span>
            )}
            {credit.status === 'cancelado' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Crédito Liquidado (Cancelado)
              </span>
            )}
            <p className="text-[11px] text-slate-400 print:text-gray-500 mt-1">
              Fecha de inicio: {credit.start_date}
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
            <p className="text-sm font-bold text-white print:text-black">{credit.customer_name}</p>
            {credit.customer_dni && (
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">C.I. / DNI: {credit.customer_dni}</p>
            )}
            {credit.customer_phone && (
              <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                {credit.customer_phone}
              </p>
            )}
            {credit.customer_address && (
              <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {credit.customer_address}
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
              <strong className="text-white print:text-black">${Number(credit.total_price).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-slate-400 print:text-gray-700">
              <span>Entrada Inicial Pagada:</span>
              <span className="text-emerald-400 font-semibold">-${Number(credit.down_payment).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 print:text-gray-700">
              <span>Capital Financiado:</span>
              <strong className="text-white print:text-black">${Number(credit.financed_amount).toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-slate-400 print:text-gray-700">
              <span>Interés ({credit.interest_rate}%):</span>
              <strong className="text-amber-400">+${(Number(credit.total_debt) - Number(credit.financed_amount)).toFixed(2)}</strong>
            </div>
            <div className="pt-1.5 border-t border-slate-800 print:border-gray-300 flex justify-between font-bold text-sm">
              <span className="text-white print:text-black">Deuda Total:</span>
              <span className="text-white print:text-black">${Number(credit.total_debt).toFixed(2)}</span>
            </div>
          </div>

          {/* Estado de Pagos Actual */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:bg-gray-50 print:border-gray-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2">
                Saldo Actual por Cobrar
              </h3>
              <p className="text-3xl font-black text-rose-400 print:text-rose-600">
                ${Number(credit.remaining_balance).toFixed(2)}
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
              <div className="w-full bg-slate-800 print:bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentPaid}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {credit.notes && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300 print:text-gray-700">
            <strong className="text-emerald-400">Observaciones del contrato:</strong> {credit.notes}
          </div>
        )}
      </div>

      {/* Tabla del Plan de Pagos / Cronograma de Cuotas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 print:border-none print:p-0 print:bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white print:text-black">
              Plan de Pagos y Control de Cuotas
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
              {credit.total_installments} cuotas fijas de ${Number(credit.installment_amount).toFixed(2)} ({credit.frequency})
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
                      Cuota #{inst.installment_number}
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

      {/* Historial Completo de Abonos Realizados (Inmutable para Auditoría) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 print:border-none print:p-0 print:bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-white print:text-black">
              Historial de Pagos y Abonos
            </h2>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
              Registro cronológico inmutable de cada transacción registrada.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-400">
            Total {payments.length} movimientos
          </span>
        </div>

        {payments.length === 0 ? (
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
                  <th className="py-3 px-3">Comprobante</th>
                  <th className="py-3 px-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition print:hover:bg-transparent">
                    <td className="py-3 px-3 font-medium text-slate-200 print:text-black">
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

                    <td className="py-3 px-3 print:hidden">
                      {p.voucher_url ? (
                        <button
                          onClick={() => setSelectedVoucher({ url: p.voucher_url!, title: `Recibo de ${p.payment_date} por $${p.amount}` })}
                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver foto
                        </button>
                      ) : (
                        <span className="text-slate-500">—</span>
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
            <p className="text-gray-600">{credit.customer_name}</p>
          </div>
          <div>
            <div className="border-b border-black w-48 mx-auto mb-2" />
            <p className="font-bold">Firma y Sello Autorizado</p>
            <p className="text-gray-600">Plannex Cobranzas & Crédito</p>
          </div>
        </div>
      </div>

      {/* Modal Registrar Abono */}
      <RegisterPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          router.refresh();
        }}
        credits={[credit]}
        defaultCreditId={credit.id}
      />

      {/* Modal Visor de Comprobante */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">{selectedVoucher.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={selectedVoucher.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir
                </a>
                <button
                  onClick={() => setSelectedVoucher(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 flex items-center justify-center min-h-[300px]">
              <img
                src={selectedVoucher.url}
                alt="Comprobante"
                className="max-h-[500px] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
