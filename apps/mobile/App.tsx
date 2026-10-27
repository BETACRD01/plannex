import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './lib/supabase';
import type { Credit, CreditInstallment, CreditPayment, Profile } from '@workspace/supabase';
import { Session } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Formulario de autenticación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Datos financieros
  const [credits, setCredits] = useState<Credit[]>([]);
  const [activeTab, setActiveTab] = useState<'financiamientos' | 'consolidado' | 'perfil'>('financiamientos');

  // Detalle de crédito seleccionado
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [installments, setInstallments] = useState<CreditInstallment[]>([]);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [detailTab, setDetailTab] = useState<'cuotas' | 'historial'>('cuotas');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal de Reportar Pago / Subir Comprobante
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [creditForPayment, setCreditForPayment] = useState<Credit | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'deposito' | 'de_una' | 'efectivo'>('transferencia');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Modal de Visor de Comprobante
  const [viewingVoucherUrl, setViewingVoucherUrl] = useState<string | null>(null);

  // 1. Inicialización y escuchador de sesión
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        initUserData(session.user.id, session.user.email || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        initUserData(session.user.id, session.user.email || '');
      } else {
        setProfile(null);
        setCredits([]);
        setSelectedCredit(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function initUserData(userId: string, userEmail: string) {
    try {
      setLoading(true);
      const isSuperAdmin = ['wd1501074@gmail.com', 'williancerda0@gmail.com'].includes(userEmail.toLowerCase());

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (prof) {
        setProfile(prof);
        const adminRole = prof.role === 'admin' || isSuperAdmin;
        setIsAdmin(adminRole);
        await loadCredits(userId, userEmail, adminRole);
      } else {
        setIsAdmin(isSuperAdmin);
        await loadCredits(userId, userEmail, isSuperAdmin);
      }
    } catch (e: any) {
      console.error('Error al inicializar usuario:', e);
    } finally {
      setLoading(false);
    }
  }

  // 2. Carga de créditos desde Supabase
  const loadCredits = useCallback(async (userId: string, userEmail: string, adminRole: boolean) => {
    try {
      let query = supabase.from('credits').select('*');

      if (!adminRole) {
        // Cliente autenticado: filtrar únicamente sus créditos personales
        query = query.or(`customer_user_id.eq.${userId},customer_email.ilike.${userEmail}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setCredits(data || []);
    } catch (err: any) {
      console.error('Error al cargar créditos:', err);
    }
  }, []);

  const handleRefresh = async () => {
    if (!session?.user) return;
    setRefreshing(true);
    await loadCredits(session.user.id, session.user.email || '', isAdmin);
    if (selectedCredit) {
      await loadCreditDetails(selectedCredit.id);
    }
    setRefreshing(false);
  };

  // 3. Cargar detalle de un crédito (cuotas y pagos)
  async function loadCreditDetails(creditId: string) {
    try {
      setLoadingDetail(true);
      const [instRes, payRes, credRes] = await Promise.all([
        supabase
          .from('credit_installments')
          .select('*')
          .eq('credit_id', creditId)
          .order('installment_number', { ascending: true }),
        supabase
          .from('credit_payments')
          .select('*')
          .eq('credit_id', creditId)
          .order('payment_date', { ascending: false }),
        supabase
          .from('credits')
          .select('*')
          .eq('id', creditId)
          .single(),
      ]);

      if (instRes.data) setInstallments(instRes.data);
      if (payRes.data) setPayments(payRes.data);
      if (credRes.data) {
        setSelectedCredit(credRes.data);
        // Actualizar en la lista general también
        setCredits((prev) => prev.map((c) => (c.id === creditId ? credRes.data : c)));
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudieron cargar los detalles del crédito.');
    } finally {
      setLoadingDetail(false);
    }
  }

  // 4. Autenticación
  async function handleAuth() {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName.trim() || undefined },
          },
        });
        if (error) Alert.alert('Error', error.message);
        else if (data.session) Alert.alert('¡Bienvenido!', 'Cuenta creada exitosamente.');
        else Alert.alert('Revisa tu correo', 'Te hemos enviado un enlace de confirmación.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) Alert.alert('Error de acceso', error.message);
      }
    } catch (e: any) {
      Alert.alert('Error inesperado', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setCredits([]);
          setSelectedCredit(null);
        },
      },
    ]);
  }

  // 5. Métricas Consolidadas
  const consolidatedMetrics = useMemo(() => {
    const totalFinanced = credits.reduce((sum, c) => sum + Number(c.total_debt), 0);
    const totalRemaining = credits.reduce((sum, c) => sum + Number(c.remaining_balance), 0);
    const totalPaid = Math.max(0, totalFinanced - totalRemaining);
    const monthlyTotal = credits
      .filter((c) => c.status !== 'cancelado')
      .reduce((sum, c) => sum + Number(c.installment_amount), 0);
    const hasOverdue = credits.some((c) => c.status === 'atrasado');

    return {
      totalFinanced,
      totalRemaining,
      totalPaid,
      monthlyTotal,
      hasOverdue,
      creditsCount: credits.length,
    };
  }, [credits]);

  // Siguiente cuota pendiente para el crédito seleccionado
  const nextPendingInstallment = useMemo(() => {
    return installments.find(
      (i) => i.status === 'pendiente' || i.status === 'parcial' || i.status === 'vencida'
    );
  }, [installments]);

  // 6. Selección de foto con ImagePicker
  async function pickImage(source: 'camera' | 'gallery') {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para fotografiar el comprobante.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para subir el comprobante.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setPickedImage(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen: ' + err.message);
    }
  }

  // 7. Enviar Pago y Comprobante a Supabase
  async function handleSubmitPayment() {
    if (!creditForPayment) return;
    const amountNum = parseFloat(paymentAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Monto Inválido', 'Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    if (!pickedImage && !isAdmin) {
      Alert.alert('Comprobante Obligatorio', 'Debes adjuntar la foto o captura del comprobante bancario.');
      return;
    }

    setSubmittingPayment(true);
    try {
      let voucherUrl: string | null = null;

      // Subir archivo a Storage si existe
      if (pickedImage && pickedImage.base64) {
        const fileExt = pickedImage.fileName?.split('.').pop() || 'jpg';
        const fileName = `creditos/${creditForPayment.id}/${Date.now()}_movil.${fileExt}`;
        const fileBytes = base64ToUint8Array(pickedImage.base64);

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('payment-vouchers')
          .upload(fileName, fileBytes, {
            contentType: pickedImage.mimeType || 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) {
          throw new Error('Error al subir comprobante a la nube: ' + uploadErr.message);
        }

        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('payment-vouchers')
            .getPublicUrl(uploadData.path);
          voucherUrl = publicUrl;
        }
      }

      const previousBalance = Number(creditForPayment.remaining_balance);
      const newBalance = Math.max(0, previousBalance - amountNum);

      // Insertar pago en credit_payments (el trigger de Postgres amortiza cuotas automáticamente)
      const { error: payErr } = await supabase.from('credit_payments').insert({
        credit_id: creditForPayment.id,
        amount: amountNum,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        previous_balance: previousBalance,
        new_balance: newBalance,
        voucher_url: voucherUrl,
        user_notes: paymentNotes || 'Pago reportado desde Plannex Móvil',
        admin_notes: isAdmin
          ? `Abono de $${amountNum.toFixed(2)} registrado desde App Admin`
          : `Pago reportado por cliente desde App Móvil ($${amountNum.toFixed(2)})`,
        created_by: session?.user?.id || null,
      });

      if (payErr) throw payErr;

      Alert.alert('¡Pago Registrado!', 'El abono ha sido procesado y el saldo se actualizó en tiempo real.');
      setPaymentModalVisible(false);
      setPickedImage(null);
      setPaymentNotes('');

      // Recargar datos
      if (session?.user) {
        await loadCredits(session.user.id, session.user.email || '', isAdmin);
      }
      if (selectedCredit) {
        await loadCreditDetails(selectedCredit.id);
      }
    } catch (err: any) {
      Alert.alert('Error al registrar abono', err.message || 'Error de conexión');
    } finally {
      setSubmittingPayment(false);
    }
  }

  function openPaymentModal(credit: Credit, suggestedAmount?: number) {
    setCreditForPayment(credit);
    setPaymentAmount(suggestedAmount ? String(suggestedAmount) : String(credit.installment_amount));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPickedImage(null);
    setPaymentNotes('');
    setPaymentModalVisible(true);
  }

  // RENDER: Pantalla de Login si no hay sesión
  if (!session || !session.user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PLANNEX MÓVIL • COBRANZAS & CRÉDITO</Text>
            </View>
            <Text style={styles.appTitle}>Plannex</Text>
            <Text style={styles.appSubtitle}>
              Control inteligente de financiamientos, estados de cuenta y comprobantes bancarios.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </Text>
            <Text style={styles.cardDesc}>
              {isSignUp
                ? 'Ingresa tus datos para registrarte como cliente o administrador.'
                : 'Ingresa con tu correo registrado para ver tus créditos y saldos.'}
            </Text>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre y Apellido</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: William David Cerda"
                  placeholderTextColor="#64748b"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="usuario@gmail.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#090d16" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isSignUp ? 'Registrarme' : 'Entrar a Mi Cuenta'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.toggleBtnText}>
                {isSignUp
                  ? '¿Ya tienes cuenta? Inicia sesión aquí'
                  : '¿No tienes cuenta? Regístrate aquí'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // RENDER: Pantalla de Detalle de Crédito
  if (selectedCredit) {
    const totalDebt = Number(selectedCredit.total_debt);
    const balance = Number(selectedCredit.remaining_balance);
    const paid = Math.max(0, totalDebt - balance);
    const percent = totalDebt > 0 ? Math.min(100, Math.round((paid / totalDebt) * 100)) : 100;
    const isMediasCuotas = selectedCredit.notes?.includes('MEDIAS CUOTAS');

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#090d16" />
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedCredit(null)}
          >
            <Text style={styles.backBtnText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {selectedCredit.item_description}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.detailScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
        >
          {/* Tarjeta Principal del Crédito */}
          <View style={styles.detailCard}>
            <View style={styles.rowBetween}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>ID: #{selectedCredit.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, selectedCredit.status === 'activo' ? styles.statusActive : styles.statusOverdue]}>
                <Text style={styles.statusBadgeText}>
                  {selectedCredit.status === 'activo' ? 'Al Día' : selectedCredit.status === 'atrasado' ? 'En Mora' : 'Liquidado'}
                </Text>
              </View>
            </View>

            <Text style={styles.detailTitle}>{selectedCredit.item_description}</Text>
            <Text style={styles.detailSubtitle}>Cliente: {selectedCredit.customer_name}</Text>

            {/* Saldo y Amortización */}
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Saldo Restante</Text>
                <Text style={styles.metricValueRose}>${balance.toFixed(2)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Cuota Mensual</Text>
                <Text style={styles.metricValueEmerald}>${Number(selectedCredit.installment_amount).toFixed(2)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Pagado</Text>
                <Text style={styles.metricValueWhite}>${paid.toFixed(2)}</Text>
              </View>
            </View>

            {/* Barra de progreso */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.progressText}>{percent}% amortizado</Text>
              <Text style={styles.progressText}>Deuda original: ${totalDebt.toFixed(2)}</Text>
            </View>
          </View>

          {/* Banner de Próxima Cuota */}
          {nextPendingInstallment && selectedCredit.status !== 'cancelado' && (
            <View style={styles.nextInstallmentBox}>
              <View>
                <Text style={styles.nextInstallmentBadge}>PRÓXIMA CUOTA A CANCELAR</Text>
                <Text style={styles.nextInstallmentNumber}>
                  Cuota #{nextPendingInstallment.installment_number}
                </Text>
                <Text style={styles.nextInstallmentDate}>
                  Vence: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{nextPendingInstallment.due_date}</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles.payNextBtn}
                onPress={() => openPaymentModal(selectedCredit, Number(nextPendingInstallment.amount) - Number(nextPendingInstallment.amount_paid))}
              >
                <Text style={styles.payNextBtnText}>
                  Pagar ${(Number(nextPendingInstallment.amount) - Number(nextPendingInstallment.amount_paid)).toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Selector de Pestañas: Cuotas vs Historial */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, detailTab === 'cuotas' && styles.tabItemActive]}
              onPress={() => setDetailTab('cuotas')}
            >
              <Text style={[styles.tabText, detailTab === 'cuotas' && styles.tabTextActive]}>
                Cronograma de Cuotas ({installments.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, detailTab === 'historial' && styles.tabItemActive]}
              onPress={() => setDetailTab('historial')}
            >
              <Text style={[styles.tabText, detailTab === 'historial' && styles.tabTextActive]}>
                Historial de Pagos ({payments.length})
              </Text>
            </TouchableOpacity>
          </View>

          {loadingDetail ? (
            <ActivityIndicator color="#10b981" style={{ marginTop: 24 }} />
          ) : detailTab === 'cuotas' ? (
            // Lista de Cuotas
            <View style={styles.installmentList}>
              {installments.map((inst) => {
                const isPaid = inst.status === 'pagada';
                const isOverdue = inst.status === 'vencida';
                const isPromo50 = isMediasCuotas && inst.installment_number >= 24;

                return (
                  <View key={inst.id} style={styles.installmentRow}>
                    <View style={styles.flex1}>
                      <View style={styles.row}>
                        <Text style={styles.instNumber}>Cuota #{inst.installment_number}</Text>
                        {isPromo50 && (
                          <View style={styles.promoBadge}>
                            <Text style={styles.promoBadgeText}>50% DESC</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.instDate}>Vence: {inst.due_date}</Text>
                    </View>

                    <View style={styles.instRight}>
                      <Text style={styles.instAmount}>${Number(inst.amount).toFixed(2)}</Text>
                      <View style={[styles.instBadge, isPaid ? styles.instBadgePaid : isOverdue ? styles.instBadgeOverdue : styles.instBadgePending]}>
                        <Text style={[styles.instBadgeText, isPaid ? styles.textEmerald : isOverdue ? styles.textRose : styles.textSlate]}>
                          {isPaid ? '✓ Pagada' : isOverdue ? '⚠ Vencida' : 'Pendiente'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            // Lista de Pagos Realizados
            <View style={styles.paymentsList}>
              {payments.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No hay pagos registrados todavía.</Text>
                </View>
              ) : (
                payments.map((pay) => (
                  <View key={pay.id} style={styles.paymentCard}>
                    <View style={styles.rowBetween}>
                      <View>
                        <Text style={styles.payAmount}>${Number(pay.amount).toFixed(2)}</Text>
                        <Text style={styles.payDate}>Fecha: {pay.payment_date}</Text>
                        <Text style={styles.payMethod}>Método: {pay.payment_method.toUpperCase()}</Text>
                      </View>

                      {pay.voucher_url && (
                        <TouchableOpacity
                          style={styles.viewVoucherBtn}
                          onPress={() => setViewingVoucherUrl(pay.voucher_url)}
                        >
                          <Text style={styles.viewVoucherText}>Ver Recibo 🖼</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {pay.user_notes && (
                      <Text style={styles.payNotes}>"{pay.user_notes}"</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // RENDER: Dashboard Principal (Lista de Créditos o Consolidado)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />
      
      {/* Header Superior */}
      <View style={styles.topHeader}>
        <View>
          <View style={styles.row}>
            <Text style={styles.headerBrand}>Plannex</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.headerUser}>
            {profile?.full_name || session.user.email} • {isAdmin ? 'ADMIN' : 'CLIENTE'}
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutHeaderBtn} onPress={handleSignOut}>
          <Text style={styles.signOutHeaderText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Principales: Mis Créditos vs Deuda Consolidada */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'financiamientos' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('financiamientos')}
        >
          <Text style={[styles.mainTabBtnText, activeTab === 'financiamientos' && styles.mainTabBtnTextActive]}>
            Mis Créditos ({credits.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'consolidado' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('consolidado')}
        >
          <Text style={[styles.mainTabBtnText, activeTab === 'consolidado' && styles.mainTabBtnTextActive]}>
            Deuda Consolidada
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.mainScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
      >
        {activeTab === 'financiamientos' ? (
          <>
            {/* Chips de Resumen Rápido */}
            <View style={styles.summaryChipsRow}>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>Deuda Total</Text>
                <Text style={styles.summaryChipValueRose}>${consolidatedMetrics.totalRemaining.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>Cuota Mensual</Text>
                <Text style={styles.summaryChipValueEmerald}>${consolidatedMetrics.monthlyTotal.toFixed(2)}/m</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipLabel}>Abonado</Text>
                <Text style={styles.summaryChipValueWhite}>${consolidatedMetrics.totalPaid.toFixed(2)}</Text>
              </View>
            </View>

            {/* Lista de Tarjetas de Crédito */}
            {loading ? (
              <ActivityIndicator color="#10b981" style={{ marginTop: 40 }} />
            ) : credits.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No tienes créditos activos</Text>
                <Text style={styles.emptyDesc}>
                  Tus financiamientos registrados aparecerán aquí automáticamente al sincronizarse.
                </Text>
              </View>
            ) : (
              credits.map((cr) => {
                const totalDebt = Number(cr.total_debt);
                const balance = Number(cr.remaining_balance);
                const paid = Math.max(0, totalDebt - balance);
                const percent = totalDebt > 0 ? Math.min(100, Math.round((paid / totalDebt) * 100)) : 100;

                return (
                  <TouchableOpacity
                    key={cr.id}
                    style={styles.creditCard}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedCredit(cr);
                      loadCreditDetails(cr.id);
                    }}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={styles.creditId}>ID: #{cr.id.slice(0, 8).toUpperCase()}</Text>
                      <View style={[styles.badgePill, cr.status === 'activo' ? styles.pillActive : styles.pillOverdue]}>
                        <Text style={[styles.pillText, cr.status === 'activo' ? styles.textEmerald : styles.textRose]}>
                          {cr.status === 'activo' ? 'Al Día' : 'En Mora'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.creditTitle}>{cr.item_description}</Text>

                    <View style={styles.rowBetween}>
                      <View>
                        <Text style={styles.creditSubLabel}>Saldo Restante</Text>
                        <Text style={styles.creditBalance}>${balance.toFixed(2)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.creditSubLabel}>Cuota {cr.frequency}</Text>
                        <Text style={styles.creditInstallment}>${Number(cr.installment_amount).toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Barra de progreso de amortización */}
                    <View style={styles.cardProgressBg}>
                      <View style={[styles.cardProgressFill, { width: `${percent}%` }]} />
                    </View>

                    {/* Botones de acción rápida */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtnDetail}
                        onPress={() => {
                          setSelectedCredit(cr);
                          loadCreditDetails(cr.id);
                        }}
                      >
                        <Text style={styles.actionBtnDetailText}>Ver Cuotas →</Text>
                      </TouchableOpacity>

                      {cr.status !== 'cancelado' && (
                        <TouchableOpacity
                          style={styles.actionBtnPay}
                          onPress={() => openPaymentModal(cr)}
                        >
                          <Text style={styles.actionBtnPayText}>+ Subir Comprobante</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          /* Pestaña: Deuda Consolidada */
          <View style={styles.consolidatedContainer}>
            <View style={styles.consolidatedHeaderCard}>
              <Text style={styles.consolidatedBadge}>ESTADO DE CUENTA CONSOLIDADO</Text>
              <Text style={styles.consolidatedName}>{profile?.full_name || session.user.email}</Text>
              <Text style={styles.consolidatedEmail}>{session.user.email}</Text>

              <View style={styles.consolidatedMetricsGrid}>
                <View style={styles.cMetricBox}>
                  <Text style={styles.cMetricLabel}>DEUDA TOTAL RESTANTE</Text>
                  <Text style={styles.cMetricValueRose}>
                    ${consolidatedMetrics.totalRemaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.cMetricBox}>
                  <Text style={styles.cMetricLabel}>COMPROMISO MENSUAL</Text>
                  <Text style={styles.cMetricValueEmerald}>
                    ${consolidatedMetrics.monthlyTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}/mes
                  </Text>
                </View>

                <View style={styles.cMetricBox}>
                  <Text style={styles.cMetricLabel}>TOTAL ABONADO</Text>
                  <Text style={styles.cMetricValueBlue}>
                    ${consolidatedMetrics.totalPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Financiamientos Activos ({credits.length}):</Text>

            {credits.map((cr) => (
              <View key={cr.id} style={styles.consolidatedItemRow}>
                <View style={styles.flex1}>
                  <Text style={styles.cItemTitle}>{cr.item_description}</Text>
                  <Text style={styles.cItemSub}>
                    Cuota: ${Number(cr.installment_amount).toFixed(2)} ({cr.frequency})
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cItemBalance}>${Number(cr.remaining_balance).toFixed(2)}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCredit(cr);
                      loadCreditDetails(cr.id);
                    }}
                  >
                    <Text style={styles.cItemLink}>Ver Detalle →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal: Reportar Pago / Subir Comprobante */}
      <Modal
        visible={paymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Reportar Pago</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>{creditForPayment?.item_description}</Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Monto */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Monto Pagado ($ USD) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* Fecha */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fecha del Pago (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="2026-10-26"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* Método */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Método de Pago</Text>
                <View style={styles.methodRow}>
                  {(['transferencia', 'deposito', 'de_una', 'efectivo'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                      onPress={() => setPaymentMethod(m)}
                    >
                      <Text style={[styles.methodBtnText, paymentMethod === m && styles.methodBtnTextActive]}>
                        {m === 'transferencia' ? 'Transf.' : m === 'deposito' ? 'Depósito' : m === 'de_una' ? 'De Una' : 'Efectivo'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Adjuntar Comprobante */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Foto del Comprobante Bancario *</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.pickImageBtn}
                    onPress={() => pickImage('camera')}
                  >
                    <Text style={styles.pickImageBtnText}>📷 Tomar Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickImageBtn, { marginLeft: 8 }]}
                    onPress={() => pickImage('gallery')}
                  >
                    <Text style={styles.pickImageBtnText}>🖼 Galería</Text>
                  </TouchableOpacity>
                </View>

                {pickedImage && (
                  <View style={styles.imagePreviewBox}>
                    <Image source={{ uri: pickedImage.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setPickedImage(null)}
                    >
                      <Text style={styles.removeImageText}>Quitar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Notas */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notas / Referencia</Text>
                <TextInput
                  style={styles.input}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="Ej: Ref #001245 Banco Pichincha"
                  placeholderTextColor="#64748b"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.submitPayBtn}
              onPress={handleSubmitPayment}
              disabled={submittingPayment}
            >
              {submittingPayment ? (
                <ActivityIndicator color="#090d16" />
              ) : (
                <Text style={styles.submitPayBtnText}>
                  Subir y Registrar Pago de ${parseFloat(paymentAmount || '0').toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Visor de Recibo a Pantalla Completa */}
      <Modal
        visible={Boolean(viewingVoucherUrl)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewingVoucherUrl(null)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.closeViewerBtn}
            onPress={() => setViewingVoucherUrl(null)}
          >
            <Text style={styles.closeViewerText}>✕ Cerrar</Text>
          </TouchableOpacity>
          {viewingVoucherUrl && (
            <Image
              source={{ uri: viewingVoucherUrl }}
              style={styles.fullViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  authScroll: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  authHeader: {
    marginBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 14,
  },
  toggleBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleBtnText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  // Top Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0c1322',
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginLeft: 6,
  },
  headerUser: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  signOutHeaderBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  signOutHeaderText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '700',
  },
  // Main Tabs
  mainTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0c1322',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  mainTabBtnActive: {
    backgroundColor: '#1e293b',
  },
  mainTabBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  mainTabBtnTextActive: {
    color: '#10b981',
  },
  mainScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  // Summary Chips
  summaryChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  summaryChipLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  summaryChipValueRose: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f43f5e',
    marginTop: 2,
  },
  summaryChipValueEmerald: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 2,
  },
  summaryChipValueWhite: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  // Credit Cards
  creditCard: {
    backgroundColor: '#131b2e',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  creditId: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#64748b',
    backgroundColor: '#090d16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pillOverdue: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 12,
  },
  creditSubLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  creditBalance: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f43f5e',
    marginTop: 1,
  },
  creditInstallment: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 1,
  },
  cardProgressBg: {
    height: 4,
    backgroundColor: '#090d16',
    borderRadius: 2,
    marginVertical: 12,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  actionBtnDetail: {
    paddingVertical: 6,
  },
  actionBtnDetailText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnPay: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnPayText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  // Detail Screen
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0c1322',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },
  navTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: width - 140,
  },
  detailScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: '#131b2e',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  tag: {
    backgroundColor: '#090d16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusOverdue: { backgroundColor: 'rgba(244, 63, 94, 0.2)' },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 10,
  },
  detailSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 10, color: '#64748b' },
  metricValueRose: { fontSize: 16, fontWeight: '900', color: '#f43f5e', marginTop: 2 },
  metricValueEmerald: { fontSize: 16, fontWeight: '900', color: '#10b981', marginTop: 2 },
  metricValueWhite: { fontSize: 16, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  progressBarBg: {
    height: 6,
    backgroundColor: '#090d16',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressText: {
    fontSize: 10,
    color: '#64748b',
  },
  nextInstallmentBox: {
    backgroundColor: '#0d1d36',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextInstallmentBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 0.5,
  },
  nextInstallmentNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  nextInstallmentDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  payNextBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  payNextBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  installmentList: {
    gap: 8,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  instNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  instDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  promoBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  promoBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
  },
  instRight: {
    alignItems: 'flex-end',
  },
  instAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  instBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  instBadgePaid: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  instBadgeOverdue: { backgroundColor: 'rgba(244, 63, 94, 0.15)' },
  instBadgePending: { backgroundColor: '#1e293b' },
  instBadgeText: { fontSize: 10, fontWeight: '800' },
  textEmerald: { color: '#10b981' },
  textRose: { color: '#f43f5e' },
  textSlate: { color: '#94a3b8' },
  // Payments list
  paymentsList: { gap: 10 },
  paymentCard: {
    backgroundColor: '#131b2e',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  payAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
  },
  payDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  payMethod: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  payNotes: {
    fontSize: 11,
    color: '#cbd5e1',
    fontStyle: 'italic',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
  },
  viewVoucherBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewVoucherText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
  },
  // Consolidated Tab
  consolidatedContainer: {
    gap: 12,
  },
  consolidatedHeaderCard: {
    backgroundColor: '#131b2e',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  consolidatedBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  consolidatedName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
  },
  consolidatedEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
    marginBottom: 16,
  },
  consolidatedMetricsGrid: {
    gap: 8,
  },
  cMetricBox: {
    backgroundColor: '#090d16',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  cMetricValueRose: { fontSize: 18, fontWeight: '900', color: '#f43f5e', marginTop: 2 },
  cMetricValueEmerald: { fontSize: 18, fontWeight: '900', color: '#10b981', marginTop: 2 },
  cMetricValueBlue: { fontSize: 18, fontWeight: '900', color: '#3b82f6', marginTop: 2 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  consolidatedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cItemTitle: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  cItemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cItemBalance: { fontSize: 14, fontWeight: '900', color: '#f43f5e' },
  cItemLink: { fontSize: 11, fontWeight: '700', color: '#10b981', marginTop: 2 },
  // Modal Payment
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748b',
    padding: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  methodBtn: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  methodBtnActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  methodBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  methodBtnTextActive: {
    color: '#10b981',
  },
  pickImageBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickImageBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  imagePreviewBox: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageBtn: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderRadius: 8,
  },
  removeImageText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '700',
  },
  submitPayBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  submitPayBtnText: {
    color: '#090d16',
    fontWeight: '900',
    fontSize: 14,
  },
  // Fullscreen Viewer
  viewerOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  closeViewerText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  fullViewerImage: {
    width: '100%',
    height: '80%',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#131b2e',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyDesc: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});