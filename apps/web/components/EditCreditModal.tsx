'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import type { Credit } from '@workspace/supabase';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Bike,
  Smartphone,
  Tv,
  Coins,
  Info
} from 'lucide-react';

interface EditCreditModalProps {
  credit: Credit;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: Credit) => void;
}

export function EditCreditModal({
  credit,
  isOpen,
  onClose,
  onUpdated,
}: EditCreditModalProps) {
  const router = useRouter();
  const supabase = createClient();

  // Campos editables del cliente
  const [customerName, setCustomerName] = useState(credit.customer_name);
  const [customerEmail, setCustomerEmail] = useState(credit.customer_email || '');
  const [customerDni, setCustomerDni] = useState(credit.customer_dni || '');
  const [customerPhone, setCustomerPhone] = useState(credit.customer_phone || '');
  const [customerAddress, setCustomerAddress] = useState(credit.customer_address || '');

  // Estado de validación asíncrona de usuario registrado (indexado en base de datos)
  const [matchedProfile, setMatchedProfile] = useState<{ id: string; email: string | null; full_name: string | null } | null>(null);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);

  // Validación rápida con índice B-Tree (1 fila) al escribir correo
  useEffect(() => {
    const email = customerEmail.trim();
    if (!email || !email.includes('@') || email.length < 5) {
      setMatchedProfile(null);
      setIsValidatingEmail(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidatingEmail(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .ilike('email', email)
          .maybeSingle();

        setMatchedProfile(data || null);
      } catch (err) {
        console.error('Error validando correo:', err);
      } finally {
        setIsValidatingEmail(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerEmail]);

  // Campos del bien financiado
  const [itemDescription, setItemDescription] = useState(credit.item_description);
  const [itemCategory, setItemCategory] = useState(credit.item_category);
  const [itemIdentifier, setItemIdentifier] = useState(credit.item_identifier || '');

  // Estado y notas
  const [status, setStatus] = useState(credit.status);
  const [notes, setNotes] = useState(credit.notes || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !itemDescription) {
      setErrorMsg('Nombre del cliente y descripción del bien son obligatorios.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Si se ingresó un correo, buscar si tiene un user_id en profiles
      let linkedUserId = credit.customer_user_id;
      if (customerEmail.trim()) {
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', customerEmail.trim())
          .maybeSingle();

        if (matchedProfile) {
          linkedUserId = matchedProfile.id;
        }
      }

      const { data: updated, error } = await supabase
        .from('credits')
        .update({
          customer_name: customerName,
          customer_email: customerEmail.trim().toLowerCase() || null,
          customer_user_id: linkedUserId || null,
          customer_dni: customerDni || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          item_description: itemDescription,
          item_category: itemCategory,
          item_identifier: itemIdentifier || null,
          status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', credit.id)
        .select()
        .single();

      if (error) throw error;

      setSuccess(true);
      if (onUpdated && updated) {
        onUpdated(updated as Credit);
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al actualizar el crédito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Editar Financiamiento</h2>
            <p className="text-xs text-slate-400">Modifica datos del cliente, bien financiado o estado</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>¡Datos del crédito actualizados correctamente!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Datos del Cliente */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Datos del Cliente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nombres y Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Correo Electrónico (Para Google)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="cliente@gmail.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  {isValidatingEmail && (
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>

                {matchedProfile ? (
                  <div className="mt-1.5 p-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>✓ Usuario en sistema: {matchedProfile.full_name || matchedProfile.email}</span>
                  </div>
                ) : customerEmail && customerEmail.includes('@') && !isValidatingEmail ? (
                  <p className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>Sin cuenta activa aún (se vinculará al iniciar sesión)</span>
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Cédula / DNI
                </label>
                <input
                  type="text"
                  value={customerDni}
                  onChange={(e) => setCustomerDni(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Dirección Domiciliaria
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Datos del Bien Financiado */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Bien Financiado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Descripción del Producto o Bien *
                </label>
                <input
                  type="text"
                  required
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Categoría
                </label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 capitalize"
                >
                  <option value="vehiculo">Vehículo / Moto</option>
                  <option value="telefonia">Telefonía / Celular</option>
                  <option value="electrodomestico">Electrodoméstico</option>
                  <option value="prestamo">Préstamo Dinero</option>
                  <option value="general">Otro Bien</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Identificador (Placa, Chasis, IMEI, Serial)
                </label>
                <input
                  type="text"
                  value={itemIdentifier}
                  onChange={(e) => setItemIdentifier(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Estado del Crédito y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estado del Crédito
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="activo">Activo (Al Día)</option>
                <option value="atrasado">Atrasado (En Mora)</option>
                <option value="cancelado">Cancelado (Liquidado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notas y Observaciones
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Garantías, observaciones..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
