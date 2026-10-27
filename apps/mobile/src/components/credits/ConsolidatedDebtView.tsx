import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import type { Credit, ConsolidatedMetrics } from '../../types/credit.types';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../theme/theme';

interface ConsolidatedDebtViewProps {
  customerName: string;
  customerEmail: string;
  metrics: ConsolidatedMetrics;
  credits: Credit[];
  onSelectCredit: (credit: Credit) => void;
}

export function ConsolidatedDebtView({
  customerName,
  customerEmail,
  metrics,
  credits,
  onSelectCredit,
}: ConsolidatedDebtViewProps) {
  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.badge}>ESTADO DE CUENTA CONSOLIDADO</Text>
        <Text style={styles.name}>{customerName}</Text>
        <Text style={styles.email}>{customerEmail}</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>DEUDA TOTAL RESTANTE</Text>
            <Text style={styles.metricValueRose}>
              {formatCurrency(metrics.totalRemaining)}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>COMPROMISO MENSUAL</Text>
            <Text style={styles.metricValueEmerald}>
              {formatCurrency(metrics.monthlyTotal)}/mes
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>TOTAL ABONADO</Text>
            <Text style={styles.metricValueBlue}>
              {formatCurrency(metrics.totalPaid)}
            </Text>
          </View>
        </View>
      </View>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>
        Financiamientos Activos ({credits.length}):
      </Text>

      {/* Items List */}
      {credits.map((cr) => (
        <View key={cr.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{cr.item_description}</Text>
            <Text style={styles.itemSub}>
              Cuota: {formatCurrency(cr.installment_amount)} ({cr.frequency})
            </Text>
          </View>

          <View style={styles.itemRight}>
            <Text style={styles.itemBalance}>
              {formatCurrency(cr.remaining_balance)}
            </Text>
            <TouchableOpacity onPress={() => onSelectCredit(cr)}>
              <Text style={styles.itemLink}>Ver Cronograma →</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginTop: 4,
  },
  email: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
    marginBottom: 16,
  },
  metricsGrid: {
    gap: 8,
  },
  metricBox: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSubtle,
  },
  metricValueRose: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.danger,
    marginTop: 2,
  },
  metricValueEmerald: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 2,
  },
  metricValueBlue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.info,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  itemSub: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemBalance: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.danger,
  },
  itemLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
});
