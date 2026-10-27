import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import type { Credit, CreditInstallment, CreditPayment } from '../../types/credit.types';
import { fetchCreditWithDetails } from '../../services/credit.service';
import { StatusBadge } from '../../components/common/StatusBadge';
import { NextInstallmentBanner } from '../../components/credits/NextInstallmentBanner';
import { InstallmentRow } from '../../components/credits/InstallmentRow';
import { PaymentHistoryItem } from '../../components/credits/PaymentHistoryItem';
import { RegisterPaymentModal } from '../../components/modals/RegisterPaymentModal';
import { FullscreenVoucherModal } from '../../components/modals/FullscreenVoucherModal';
import { formatCurrency, calculateProgress } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/theme';

const { width } = Dimensions.get('window');

interface CreditDetailScreenProps {
  credit: Credit;
  onBack: () => void;
  onCreditUpdated?: (updatedCredit: Credit) => void;
}

export function CreditDetailScreen({
  credit: initialCredit,
  onBack,
  onCreditUpdated,
}: CreditDetailScreenProps) {
  const { user, isAdmin } = useAuth();
  const [credit, setCredit] = useState<Credit>(initialCredit);
  const [installments, setInstallments] = useState<CreditInstallment[]>([]);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'cuotas' | 'historial'>('cuotas');

  // Modales
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [suggestedPaymentAmount, setSuggestedPaymentAmount] = useState<number | undefined>(undefined);
  const [viewingVoucherUrl, setViewingVoucherUrl] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchCreditWithDetails(credit.id);
      setCredit(data.credit);
      setInstallments(data.installments);
      setPayments(data.payments);
      if (onCreditUpdated) {
        onCreditUpdated(data.credit);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudieron cargar los detalles del crédito.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [credit.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const nextPendingInstallment = useMemo(() => {
    return installments.find(
      (i) => i.status === 'pendiente' || i.status === 'parcial' || i.status === 'vencida'
    );
  }, [installments]);

  const totalDebt = Number(credit.total_debt);
  const balance = Number(credit.remaining_balance);
  const { paid, percentage } = calculateProgress(totalDebt, balance);
  const isMediasCuotas = Boolean(credit.notes?.includes('MEDIAS CUOTAS'));

  const handleOpenPayment = (suggestedAmount?: number) => {
    setSuggestedPaymentAmount(suggestedAmount);
    setPaymentModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {credit.item_description}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Main Card */}
        <View style={styles.detailCard}>
          <View style={styles.topRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>ID: #{credit.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <StatusBadge status={credit.status} />
          </View>

          <Text style={styles.detailTitle}>{credit.item_description}</Text>
          <Text style={styles.detailSubtitle}>Cliente: {credit.customer_name}</Text>

          {/* Metrics */}
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Saldo Restante</Text>
              <Text style={styles.metricValueRose}>{formatCurrency(balance)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Cuota {credit.frequency}</Text>
              <Text style={styles.metricValueEmerald}>{formatCurrency(credit.installment_amount)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Pagado</Text>
              <Text style={styles.metricValueWhite}>{formatCurrency(paid)}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{percentage}% amortizado</Text>
            <Text style={styles.progressText}>Deuda: {formatCurrency(totalDebt)}</Text>
          </View>

          {/* Report Payment Button */}
          {credit.status !== 'cancelado' && (
            <TouchableOpacity
              style={styles.mainReportPayBtn}
              onPress={() => handleOpenPayment()}
              activeOpacity={0.8}
            >
              <Text style={styles.mainReportPayBtnText}>+ Reportar Pago / Subir Comprobante</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Next Cuota Banner */}
        {nextPendingInstallment && credit.status !== 'cancelado' && (
          <NextInstallmentBanner
            installment={nextPendingInstallment}
            onPayNow={(amt) => handleOpenPayment(amt)}
          />
        )}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, tab === 'cuotas' && styles.tabItemActive]}
            onPress={() => setTab('cuotas')}
          >
            <Text style={[styles.tabText, tab === 'cuotas' && styles.tabTextActive]}>
              Cronograma ({installments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, tab === 'historial' && styles.tabItemActive]}
            onPress={() => setTab('historial')}
          >
            <Text style={[styles.tabText, tab === 'historial' && styles.tabTextActive]}>
              Historial de Pagos ({payments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : tab === 'cuotas' ? (
          <View style={styles.list}>
            {installments.map((inst) => (
              <InstallmentRow
                key={inst.id}
                installment={inst}
                isMediasCuotas={isMediasCuotas}
              />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {payments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No hay pagos registrados todavía.</Text>
              </View>
            ) : (
              payments.map((p) => (
                <PaymentHistoryItem
                  key={p.id}
                  payment={p}
                  onViewVoucher={(url) => setViewingVoucherUrl(url)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: Subir Pago */}
      <RegisterPaymentModal
        visible={paymentModalVisible}
        credit={credit}
        initialAmount={suggestedPaymentAmount}
        isAdmin={isAdmin}
        userId={user?.id}
        onClose={() => setPaymentModalVisible(false)}
        onPaymentSuccess={() => {
          loadData();
        }}
      />

      {/* Modal: Ver Recibo */}
      <FullscreenVoucherModal
        voucherUrl={viewingVoucherUrl}
        onClose={() => setViewingVoucherUrl(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  navTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: width - 140,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 10,
  },
  detailSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 10, color: colors.textSubtle },
  metricValueRose: { fontSize: 16, fontWeight: '900', color: colors.danger, marginTop: 2 },
  metricValueEmerald: { fontSize: 16, fontWeight: '900', color: colors.primary, marginTop: 2 },
  metricValueWhite: { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 2 },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 10,
    color: colors.textSubtle,
  },
  mainReportPayBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  mainReportPayBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
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
    backgroundColor: colors.cardBorder,
  },
  tabText: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.text,
  },
  list: {
    gap: 8,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: 12,
  },
});
