'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import type { Credit } from '@workspace/supabase';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  PlusCircle,
  ArrowRight,
  Bike,
  Smartphone,
  Tv,
  Coins,
  Package,
  Calendar,
  Phone
} from 'lucide-react';

interface CreditsDashboardClientProps {
  initialCredits: Credit[];
}

export function CreditsDashboardClient({ initialCredits }: CreditsDashboardClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'atrasado' | 'cancelado'>('todos');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<string | undefined>(undefined);

  // Métricas Financieras
  const metrics = useMemo(() => {
    const totalFinanced = initialCredits.reduce((sum, c) => sum + Number(c.total_debt), 0);
    const totalBalance = initialCredits.reduce((sum, c) => sum + Number(c.remaining_balance), 0);
    const totalCollected = Math.max(0, totalFinanced - totalBalance);

    const activeCount = initialCredits.filter((c) => c.status === 'activo').length;
    const overdueCount = initialCredits.filter((c) => c.status === 'atrasado').length;
    const paidOffCount = initialCredits.filter((c) => c.status === 'cancelado').length;

    return {
      totalFinanced,
      totalBalance,
      totalCollected,
      activeCount,
      overdueCount,
      paidOffCount,
    };
  }, [initialCredits]);

  // Filtrado de Créditos
  const filteredCredits = useMemo(() => {
    return initialCredits.filter((c) => {
      const matchesSearch =
        c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.item_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.customer_dni && c.customer_dni.includes(searchTerm)) ||
        (c.item_identifier && c.item_identifier.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [initialCredits, searchTerm, statusFilter]);

  const handleOpenPayment = (creditId?: string) => {
    setSelectedCreditForPayment(creditId);
    setIsPaymentModalOpen(true);
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

  return (
    <div className="space-y-8">
      {/* 1. Tarjetas de Resumen Financiero de la Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cartera Total Financiada */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Cartera Total Financiada</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            ${metrics.totalFinanced.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Total de productos y préstamos colocados</p>
        </div>

        {/* Total Cobrado / Recuperado */}
        <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-5 shadow-xl shadow-emerald-500/5">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span>Total Cobrado / Recuperado</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
            ${metrics.totalCollected.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Capital e intereses recaudados</p>
        </div>

        {/* Saldo Pendiente por Cobrar */}
        <div className="bg-slate-900 border border-rose-500/20 rounded-3xl p-5 shadow-xl shadow-rose-500/5">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
            <span>Saldo por Cobrar</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            ${metrics.totalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Dinero pendiente en la calle</p>
        </div>

        {/* Conteo de Créditos */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Estado de Créditos</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-2 text-center">
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-1.5">
              <span className="text-sm font-black text-emerald-400">{metrics.activeCount}</span>
              <p className="text-[9px] text-emerald-300/80 font-bold">Al Día</p>
            </div>
            <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-1.5">
              <span className="text-sm font-black text-rose-400">{metrics.overdueCount}</span>
              <p className="text-[9px] text-rose-300/80 font-bold">Mora</p>
            </div>
            <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-1.5">
              <span className="text-sm font-black text-blue-400">{metrics.paidOffCount}</span>
              <p className="text-[9px] text-blue-300/80 font-bold">Liquidado</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, cédula, moto, celular o placa..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-2xl text-xs self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              statusFilter === 'todos'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({initialCredits.length})
          </button>
          <button
            onClick={() => setStatusFilter('activo')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              statusFilter === 'activo'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Al Día ({metrics.activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('atrasado')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              statusFilter === 'atrasado'
                ? 'bg-rose-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Atrasados ({metrics.overdueCount})
          </button>
          <button
            onClick={() => setStatusFilter('cancelado')}
            className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
              statusFilter === 'cancelado'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cancelados ({metrics.paidOffCount})
          </button>
        </div>
      </div>

      {/* 3. Lista de Créditos */}
      {filteredCredits.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No se encontraron créditos</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'No hay registros que coincidan con la búsqueda.'
              : 'Empieza registrando tu primer crédito financiado.'}
          </p>
          <Link
            href="/creditos/nuevo"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Primer Crédito
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCredits.map((credit) => {
            const CategoryIcon = getCategoryIcon(credit.item_category);
            const totalDebt = Number(credit.total_debt);
            const remaining = Number(credit.remaining_balance);
            const paid = Math.max(0, totalDebt - remaining);
            const percentPaid = totalDebt > 0 ? Math.min(100, Math.round((paid / totalDebt) * 100)) : 100;

            return (
              <div
                key={credit.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 transition flex flex-col justify-between shadow-xl"
              >
                <div>
                  {/* Fila 1: Bien y Estado */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-white leading-tight">
                          {credit.item_description}
                        </h3>
                        {credit.item_identifier && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {credit.item_identifier}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {credit.status === 'activo' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Al Día
                        </span>
                      )}
                      {credit.status === 'atrasado' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          Atrasado
                        </span>
                      )}
                      {credit.status === 'cancelado' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Liquidado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Datos del Cliente */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{credit.customer_name}</p>
                      {credit.customer_dni && (
                        <span className="text-[11px] text-slate-400">C.I.: {credit.customer_dni}</span>
                      )}
                    </div>
                    {credit.customer_phone && (
                      <a
                        href={`tel:${credit.customer_phone}`}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {credit.customer_phone}
                      </a>
                    )}
                  </div>

                  {/* Fila 3: Saldo y Progreso */}
                  <div className="mt-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <div>
                        <span className="text-[11px] text-slate-400">Saldo Restante:</span>
                        <p className="text-xl font-black text-rose-400">
                          ${remaining.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400">Cuota:</span>
                        <p className="text-xs font-bold text-slate-200">
                          ${Number(credit.installment_amount).toFixed(2)} <span className="text-slate-400 text-[10px] font-normal uppercase">({credit.frequency})</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Pagado: ${paid.toFixed(2)} ({percentPaid}%)</span>
                      <span>Deuda Total: ${totalDebt.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Fila 4: Acciones */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <Link
                    href={`/creditos/${credit.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white transition group"
                  >
                    <span>Ver Cuotas y Estado de Cuenta</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </Link>

                  {credit.status !== 'cancelado' && (
                    <button
                      onClick={() => handleOpenPayment(credit.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-sm"
                    >
                      Abonar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Abono */}
      <RegisterPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        credits={initialCredits}
        defaultCreditId={selectedCreditForPayment}
      />
    </div>
  );
}
