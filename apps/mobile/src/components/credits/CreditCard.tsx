import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import type { Credit } from '../../types/credit.types';
import { StatusBadge } from '../common/StatusBadge';
import { formatCurrency, calculateProgress } from '../../utils/formatters';
import { colors } from '../../theme/theme';

interface CreditCardProps {
  credit: Credit;
  onPress: () => void;
  onReportPayment: () => void;
}

export function CreditCard({ credit, onPress, onReportPayment }: CreditCardProps) {
  const totalDebt = Number(credit.total_debt);
  const balance = Number(credit.remaining_balance);
  const { percentage } = calculateProgress(totalDebt, balance);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.topRow}>
        <Text style={styles.creditId}>ID: #{credit.id.slice(0, 8).toUpperCase()}</Text>
        <StatusBadge status={credit.status} />
      </View>

      <Text style={styles.title} numberOfLines={2}>{credit.item_description}</Text>

      <View style={styles.metricsRow}>
        <View>
          <Text style={styles.subLabel}>Saldo Restante</Text>
          <Text style={styles.balance}>{formatCurrency(balance)}</Text>
        </View>
        <View style={styles.alignRight}>
          <Text style={styles.subLabel}>Cuota {credit.frequency}</Text>
          <Text style={styles.installment}>{formatCurrency(credit.installment_amount)}</Text>
        </View>
      </View>

      {/* Amortization Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{percentage}% pagado</Text>
        <Text style={styles.progressText}>Total: {formatCurrency(totalDebt)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.detailBtn} onPress={onPress}>
          <Text style={styles.detailBtnText}>Ver Cronograma →</Text>
        </TouchableOpacity>

        {credit.status !== 'cancelado' && (
          <TouchableOpacity style={styles.payBtn} onPress={onReportPayment}>
            <Text style={styles.payBtnText}>+ Subir Comprobante</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditId: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textSubtle,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  subLabel: {
    fontSize: 10,
    color: colors.textSubtle,
  },
  balance: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.danger,
    marginTop: 1,
  },
  installment: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 1,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 10,
    color: colors.textSubtle,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  detailBtn: {
    paddingVertical: 6,
  },
  detailBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  payBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
});
