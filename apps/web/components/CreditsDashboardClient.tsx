'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import { createClient } from '../lib/supabase/client';
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
  Phone,
  ShieldCheck,
  UserCheck,
  Info,
  HelpCircle,
  Globe,
  Lock,
  LogIn
} from 'lucide-react';

interface CreditsDashboardClientProps {
  initialCredits: Credit[];
  isAdmin: boolean;
  isLoggedIn: boolean;
  userEmail?: string;
  userName?: string;
}

export function CreditsDashboardClient({
  initialCredits,
  isAdmin,
  isLoggedIn,
  userEmail,
  userName,
}: CreditsDashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [credits, setCredits] = useState<Credit[]>(initialCredits);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string | null>(null);

  useEffect(() => {
    setCredits(initialCredits);
  }, [initialCredits]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'atrasado' | 'cancelado'>('todos');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<string | undefined>(undefined);

  const handleTogglePublic = async (creditId: string, currentIsPublic: boolean) => {
    const nextPublic = !currentIsPublic;
    const confirmMessage = nextPublic
      ? '⚠️ ADVERTENCIA DE VISIBILIDAD PÚBLICA:\n\n¿Estás seguro de poner en PÚBLICO este crédito?\n\n• Cualquier persona que visite la página sin iniciar sesión podrá ver este crédito.\n• Los visitantes NO podrán editarlo ni registrar pagos (es estrictamente MODO LECTURA).\n\n¿Deseas continuar?'
      : '🔒 ¿Hacer PRIVADO este crédito?\n\nAl volverlo privado, solo tú (administrador) y el cliente asignado podrán verlo al iniciar sesión en su cuenta.';

    if (!confirm(confirmMessage)) return;

    setUpdatingVisibilityId(creditId);
    try {
      const { error } = await supabase
        .from('credits')
        .update({ is_public: nextPublic })
        .eq('id', creditId);

      if (error) throw error;

      setCredits((prev) =>
        prev.map((c) => (c.id === creditId ? { ...c, is_public: nextPublic } : c))
      );
      router.refresh();
    } catch (err: any) {
      alert('Error al cambiar visibilidad: ' + (err.message || 'Error de conexión'));
    } finally {
      setUpdatingVisibilityId(null);
    }
  };

  // Métricas Financieras
  const metrics = useMemo(() => {
    const totalFinanced = credits.reduce((sum, c) => sum + Number(c.total_debt), 0);
    const totalBalance = credits.reduce((sum, c) => sum + Number(c.remaining_balance), 0);
    const totalCollected = Math.max(0, totalFinanced - totalBalance);

    const activeCount = credits.filter((c) => c.status === 'activo').length;
    const overdueCount = credits.filter((c) => c.status === 'atrasado').length;
    const paidOffCount = credits.filter((c) => c.status === 'cancelado').length;

    return {
      totalFinanced,
      totalBalance,
      totalCollected,
      activeCount,
      overdueCount,
      paidOffCount,
    };
  }, [credits]);

  // Filtrado de Créditos
  const filteredCredits = useMemo(() => {
    return credits.filter((c) => {
      const matchesSearch =
        c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.item_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.customer_dni && c.customer_dni.includes(searchTerm)) ||
        (c.customer_email && c.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.item_identifier && c.item_identifier.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [credits, searchTerm, statusFilter]);

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
      {/* 1. Header con Identificación de Rol y Contexto */}
      {!isLoggedIn ? (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="space-y-2 max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Sistema de Créditos & Cobranzas Plannex
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Plataforma de control financiero para registrar bienes financiados (motos, celulares, préstamos), calcular cronogramas de amortización y registrar abonos en tiempo real.
            </p>
          </div>
        </div>
      ) : isAdmin ? (
        /* Panel del Administrador */
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                PANEL ADMINISTRADOR
              </span>
              <span className="text-xs text-slate-400">({userEmail})</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Cartera General de Créditos</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Control de colocaciones, mora y recaudación en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenPayment()}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-lg shadow-blue-500/20"
            >
              <DollarSign className="w-4 h-4" />
              <span>Registrar Abono</span>
            </button>
          </div>
        </div>
      ) : (
        /* Portal del Cliente */
        <div className="bg-slate-900/60 border border-blue-500/30 p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <UserCheck className="w-3.5 h-3.5" />
              PORTAL DEL CLIENTE
            </span>
            <span className="text-xs text-slate-400">({userEmail})</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            Bienvenido, {userName || userEmail}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            Aquí puedes consultar el estado de tus compras a crédito, las cuotas canceladas, tu saldo pendiente y descargar tu estado de cuenta oficial.
          </p>
        </div>
      )}

      {/* 2. Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cartera Total Financiada / Total Comprado */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{isAdmin ? 'Cartera Total Financiada' : 'Total Financiado'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            ${metrics.totalFinanced.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {isAdmin ? 'Total de productos y préstamos colocados' : 'Valor total de tus artículos adquiridos'}
          </p>
        </div>

        {/* Total Cobrado / Total Abonado */}
        <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-5 shadow-xl shadow-emerald-500/5">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span>{isAdmin ? 'Total Cobrado / Recuperado' : 'Total Abonado por Ti'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
            ${metrics.totalCollected.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {isAdmin ? 'Capital e intereses recaudados' : 'Dinero pagado hasta la fecha'}
          </p>
        </div>

        {/* Saldo Pendiente por Cobrar / Mi Deuda Pendiente */}
        <div className="bg-slate-900 border border-rose-500/20 rounded-3xl p-5 shadow-xl shadow-rose-500/5">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
            <span>{isAdmin ? 'Saldo por Cobrar en Cartera' : 'Mi Deuda Restante'}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            ${metrics.totalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {isAdmin ? 'Dinero pendiente de cobro' : 'Saldo total pendiente de cancelar'}
          </p>
        </div>

        {/* Conteo de Créditos */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{isAdmin ? 'Estado de Créditos' : 'Mis Financiamientos'}</span>
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

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAdmin ? 'Buscar cliente, cédula, moto, celular o placa...' : 'Buscar entre mis productos financiados...'}
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

      {/* 4. Lista de Créditos o Estado Privado */}
      {!isLoggedIn && credits.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Cartera de Financiamientos Privada y Protegida
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
            Los estados de cuenta, cronogramas y comprobantes están cifrados y son estrictamente confidenciales. Inicia sesión con tu cuenta de cliente para consultar tus saldos o como administrador para gestionar la cartera.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Ingresar a Mi Cuenta</span>
            </Link>
          </div>
        </div>
      ) : filteredCredits.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No se encontraron financiamientos</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchTerm
              ? 'No hay registros que coincidan con la búsqueda.'
              : !isLoggedIn
              ? 'No hay financiamientos públicos disponibles en este momento. Inicia sesión para ver tu estado de cuenta privado.'
              : isAdmin
              ? 'No hay créditos registrados en la cartera. Empieza registrando el primer financiamiento.'
              : `No encontramos créditos vinculados a tu cuenta (${userEmail || 'Google'}). Si compraste un bien a crédito, solicita al administrador que ingrese este correo en tu ficha para sincronizarlo.`}
          </p>
          {!isLoggedIn ? (
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              <LogIn className="w-4 h-4" />
              Ingresar a Mi Cuenta
            </Link>
          ) : isAdmin ? (
            <Link
              href="/creditos/nuevo"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4" />
              Registrar Primer Crédito
            </Link>
          ) : null}
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

                    <div className="flex flex-col sm:flex-row items-end gap-1.5">
                      {credit.is_public ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30" title="Visible para cualquier persona en modo solo lectura">
                          <Globe className="w-3 h-3" />
                          Público
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60" title="Privado: Solo visible al iniciar sesión">
                          <Lock className="w-3 h-3" />
                          Privado
                        </span>
                      )}

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

                  {/* Fila 2: Datos del Cliente (o deudor) */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-wrap justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{credit.customer_name}</p>
                      {credit.customer_dni && (
                        <span className="text-[11px] text-slate-400">C.I.: {credit.customer_dni}</span>
                      )}
                      {credit.customer_email && (
                        <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                          {credit.customer_email}
                        </span>
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
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/creditos/${credit.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white transition group"
                  >
                    <span>Ver Cuotas</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </Link>

                  <div className="flex items-center gap-2">
                    {/* Botón cambiar visibilidad solo para Administradores */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleTogglePublic(credit.id, Boolean(credit.is_public))}
                        disabled={updatingVisibilityId === credit.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          credit.is_public
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title={credit.is_public ? 'Clic para hacer Privado' : 'Clic para hacer Público (con advertencia)'}
                      >
                        {credit.is_public ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Globe className="w-3.5 h-3.5 text-blue-400" />}
                        <span>{updatingVisibilityId === credit.id ? 'Guardando...' : credit.is_public ? 'Hacer Privado' : 'Hacer Público'}</span>
                      </button>
                    )}

                    {/* Botón abonar solo para Administradores */}
                    {isAdmin && credit.status !== 'cancelado' && (
                      <button
                        onClick={() => handleOpenPayment(credit.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-sm"
                      >
                        Abonar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Abono (Solo para Administrador) */}
      {isAdmin && (
        <RegisterPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          credits={initialCredits}
          defaultCreditId={selectedCreditForPayment}
        />
      )}
    </div>
  );
}
