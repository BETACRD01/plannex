'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';
import {
  ArrowLeft,
  Bike,
  Smartphone,
  Tv,
  Coins,
  Package,
  Calculator,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  DollarSign
} from 'lucide-react';

export default function NuevoCreditoPage() {
  const router = useRouter();
  const supabase = createClient();

  // Datos del Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerDni, setCustomerDni] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Datos del Bien Financiado
  const [itemCategory, setItemCategory] = useState<'vehiculo' | 'telefonia' | 'electrodomestico' | 'prestamo' | 'general'>('vehiculo');
  const [itemDescription, setItemDescription] = useState('');
  const [itemIdentifier, setItemIdentifier] = useState('');

  // Condiciones Financieras
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('0');
  const [interestRate, setInterestRate] = useState<string>('0'); // % tasa de interés
  const [frequency, setFrequency] = useState<'semanal' | 'quincenal' | 'mensual'>('mensual');
  const [totalInstallments, setTotalInstallments] = useState<string>('12');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [firstDueDate, setFirstDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cálculos en tiempo real
  const calculations = useMemo(() => {
    const price = parseFloat(totalPrice) || 0;
    const down = parseFloat(downPayment) || 0;
    const rate = parseFloat(interestRate) || 0;
    const installmentsCount = parseInt(totalInstallments, 10) || 1;

    const financed = Math.max(0, price - down);
    const interestAmount = (financed * rate) / 100;
    const totalDebt = financed + interestAmount;
    const installmentValue = installmentsCount > 0 ? (totalDebt / installmentsCount) : 0;

    return {
      price,
      down,
      financed,
      interestAmount,
      totalDebt,
      installmentValue: parseFloat(installmentValue.toFixed(2)),
    };
  }, [totalPrice, downPayment, interestRate, totalInstallments]);

  // Generar cronograma preliminar de fechas
  const projectedInstallments = useMemo(() => {
    const count = parseInt(totalInstallments, 10) || 0;
    if (count <= 0 || !firstDueDate) return [];

    const schedule = [];
    const baseDate = new Date(firstDueDate + 'T12:00:00');

    for (let i = 1; i <= Math.min(count, 48); i++) {
      const d = new Date(baseDate);
      if (frequency === 'semanal') {
        d.setDate(baseDate.getDate() + (i - 1) * 7);
      } else if (frequency === 'quincenal') {
        d.setDate(baseDate.getDate() + (i - 1) * 15);
      } else {
        d.setMonth(baseDate.getMonth() + (i - 1));
      }

      schedule.push({
        number: i,
        date: d.toISOString().split('T')[0],
        amount: calculations.installmentValue,
      });
    }

    return schedule;
  }, [totalInstallments, firstDueDate, frequency, calculations.installmentValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !itemDescription || calculations.price <= 0) {
      setErrorMsg('Por favor completa los datos obligatorios del cliente y el bien financiado.');
      return;
    }

    if (calculations.financed <= 0) {
      setErrorMsg('La entrada no puede ser igual o mayor al precio total.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Insertar el crédito principal
      const { data: newCredit, error: creditErr } = await supabase
        .from('credits')
        .insert({
          customer_name: customerName,
          customer_dni: customerDni || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          item_description: itemDescription,
          item_category: itemCategory,
          item_identifier: itemIdentifier || null,
          total_price: calculations.price,
          down_payment: calculations.down,
          financed_amount: calculations.financed,
          interest_rate: parseFloat(interestRate) || 0,
          total_debt: calculations.totalDebt,
          remaining_balance: calculations.totalDebt,
          total_installments: parseInt(totalInstallments, 10),
          installment_amount: calculations.installmentValue,
          frequency,
          start_date: startDate,
          first_due_date: firstDueDate,
          status: 'activo',
          notes: notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (creditErr) throw creditErr;

      // 2. Generar todas las cuotas del plan de pagos
      const installmentsToInsert = projectedInstallments.map((inst) => ({
        credit_id: newCredit.id,
        installment_number: inst.number,
        due_date: inst.date,
        amount: inst.amount,
        amount_paid: 0,
        status: 'pendiente',
        days_overdue: 0,
      }));

      const { error: instErr } = await supabase
        .from('credit_installments')
        .insert(installmentsToInsert);

      if (instErr) throw instErr;

      // Redirigir al detalle del crédito recién creado
      router.push(`/creditos/${newCredit.id}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar el crédito.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 md:p-12">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Cartera de Créditos
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-6 border-b border-slate-800 mb-8">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Financiamiento de Bienes & Préstamos
            </span>
            <h1 className="text-3xl font-black text-white mt-1">Registrar Nuevo Crédito</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configura el cliente, producto vendido, entrada inicial y plan de cuotas.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Bloque 1: Datos del Cliente */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-black">
                1
              </span>
              Datos del Cliente / Deudor
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombres y Apellidos Completos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Carlos Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cédula / DNI / Identificación
                </label>
                <input
                  type="text"
                  placeholder="Ej: 0912345678"
                  value={customerDni}
                  onChange={(e) => setCustomerDni(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Teléfono / Celular (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 0991234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dirección Domiciliaria o Referencia
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calle 10 de Agosto y Rocafuerte"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Datos del Producto o Préstamo */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-black">
                2
              </span>
              Bien Financiado o Concepto del Crédito
            </h2>

            {/* Categoría Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
              {[
                { id: 'vehiculo', label: 'Moto / Vehículo', icon: Bike },
                { id: 'telefonia', label: 'Celular / Tablet', icon: Smartphone },
                { id: 'electrodomestico', label: 'Electrodoméstico', icon: Tv },
                { id: 'prestamo', label: 'Préstamo Dinero', icon: Coins },
                { id: 'general', label: 'Otro Artículo', icon: Package },
              ].map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setItemCategory(cat.id as any)}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                      itemCategory === cat.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-bold">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Descripción del Producto o Préstamo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Moto Honda CB125F Roja / iPhone 15 Pro 128GB"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Identificador Único (Placa / Chasis / IMEI / Serial)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Placa ABC-1234 o IMEI 356789123456789"
                  value={itemIdentifier}
                  onChange={(e) => setItemIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Condiciones Financieras & Amortización */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-black">
                3
              </span>
              Condiciones Financieras y Plan de Pagos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Precio Total de Venta ($ USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="2200.00"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Entrada Inicial Pagada ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="400.00"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Interés del Financiamiento (% total)
                </label>
                <div className="relative">
                  <span className="absolute right-3.5 top-2.5 text-slate-500 text-xs font-bold">%</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="10"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full pl-4 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Frecuencia de Cuotas *
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 capitalize"
                >
                  <option value="mensual">Mensual (1 cuota al mes)</option>
                  <option value="quincenal">Quincenal (Cada 15 días)</option>
                  <option value="semanal">Semanal (Cada 7 días)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Total de Cuotas a Pagar *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  placeholder="12"
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fecha de la Primera Cuota *
                </label>
                <input
                  type="date"
                  required
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Resumen Calculado */}
            <div className="mt-6 p-5 rounded-2xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-slate-400">Capital Financiado:</p>
                <p className="text-base font-extrabold text-white">${calculations.financed.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">Interés (+):</p>
                <p className="text-base font-extrabold text-amber-400">+${calculations.interestAmount.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">Deuda Total:</p>
                <p className="text-base font-extrabold text-emerald-400">${calculations.totalDebt.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-[11px] text-slate-400">Valor por Cuota:</p>
                <p className="text-xl font-black text-white">
                  ${calculations.installmentValue.toFixed(2)} <span className="text-[10px] text-slate-400 uppercase font-normal">/{frequency}</span>
                </p>
              </div>
            </div>

            {/* Vista Previa de Cuotas Proyectadas */}
            {projectedInstallments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Cronograma proyectado de cuotas ({projectedInstallments.length} cuotas):
                </p>
                <div className="max-h-48 overflow-y-auto border border-slate-800/80 rounded-xl divide-y divide-slate-800/50 bg-slate-950/50 text-xs">
                  {projectedInstallments.map((inst) => (
                    <div key={inst.number} className="p-2.5 px-4 flex justify-between items-center text-slate-300">
                      <span>Cuota #{inst.number}</span>
                      <span className="text-slate-400">{inst.date}</span>
                      <strong className="text-white">${inst.amount.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Observaciones Generales */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Observaciones, Garantías o Notas del Negocio
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ejemplo: Se entregó con 1 casco de regalo, garantía por 1 año en taller autorizado..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/"
              className="px-5 py-3 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Crédito y Generar Plan de Pagos
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
