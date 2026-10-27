import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import type { Credit } from '../../types/credit.types';
import { calculateConsolidatedMetrics } from '../../services/credit.service';
import { AppHeader } from '../../components/common/AppHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { CreditCard } from '../../components/credits/CreditCard';
import { ConsolidatedDebtView } from '../../components/credits/ConsolidatedDebtView';
import { RegisterPaymentModal } from '../../components/modals/RegisterPaymentModal';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/theme';

interface DashboardScreenProps {
  credits: Credit[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectCredit: (credit: Credit) => void;
  onPaymentRegistered: () => void;
}

export function DashboardScreen({
  credits,
  loading,
  refreshing,
  onRefresh,
  onSelectCredit,
  onPaymentRegistered,
}: DashboardScreenProps) {
  const { user, profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'financiamientos' | 'consolidado'>('financiamientos');
  const [creditForPayment, setCreditForPayment] = useState<Credit | null>(null);

  const metrics = useMemo(() => {
    return calculateConsolidatedMetrics(credits);
  }, [credits]);

  const customerName = profile?.full_name || user?.email || 'Cliente';
  const customerEmail = user?.email || '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader />

      {/* Main Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'financiamientos' && styles.tabBtnActive]}
          onPress={() => setActiveTab('financiamientos')}
        >
          <Text style={[styles.tabText, activeTab === 'financiamientos' && styles.tabTextActive]}>
            Mis Créditos ({credits.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'consolidado' && styles.tabBtnActive]}
          onPress={() => setActiveTab('consolidado')}
        >
          <Text style={[styles.tabText, activeTab === 'consolidado' && styles.tabTextActive]}>
            Deuda Consolidada
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'financiamientos' ? (
          <>
            {/* Quick Summary Chips */}
            <View style={styles.metricsRow}>
              <MetricCard
                label="Deuda Total"
                value={formatCurrency(metrics.totalRemaining)}
                variant="danger"
              />
              <MetricCard
                label="Cuota Mensual"
                value={formatCurrency(metrics.monthlyTotal)}
                variant="primary"
                suffix="/m"
              />
              <MetricCard
                label="Abonado"
                value={formatCurrency(metrics.totalPaid)}
                variant="neutral"
              />
            </View>

            {/* List */}
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : credits.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No tienes créditos activos</Text>
                <Text style={styles.emptyDesc}>
                  Tus financiamientos registrados aparecerán aquí automáticamente al sincronizarse.
                </Text>
              </View>
            ) : (
              credits.map((cr) => (
                <CreditCard
                  key={cr.id}
                  credit={cr}
                  onPress={() => onSelectCredit(cr)}
                  onReportPayment={() => setCreditForPayment(cr)}
                />
              ))
            )}
          </>
        ) : (
          <ConsolidatedDebtView
            customerName={customerName}
            customerEmail={customerEmail}
            metrics={metrics}
            credits={credits}
            onSelectCredit={onSelectCredit}
          />
        )}
      </ScrollView>

      {/* Modal: Reportar Pago */}
      <RegisterPaymentModal
        visible={Boolean(creditForPayment)}
        credit={creditForPayment}
        isAdmin={isAdmin}
        userId={user?.id}
        onClose={() => setCreditForPayment(null)}
        onPaymentSuccess={() => {
          onPaymentRegistered();
        }}
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: colors.cardBorder,
  },
  tabText: {
    fontSize: 12,
    color: colors.textSubtle,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  emptyDesc: {
    color: colors.textSubtle,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
