import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CreditInstallment } from '../../types/credit.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';
import { colors } from '../../theme/theme';

interface InstallmentRowProps {
  installment: CreditInstallment;
  isMediasCuotas?: boolean;
}

export function InstallmentRow({ installment, isMediasCuotas }: InstallmentRowProps) {
  // Cuotas 24 a 36 con descuento del 50%
  const isPromo50 = Boolean(isMediasCuotas && installment.installment_number >= 24);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={styles.number}>Cuota #{installment.installment_number}</Text>
          {isPromo50 && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoText}>50% DESC</Text>
            </View>
          )}
        </View>
        <Text style={styles.date}>Vence: {formatDate(installment.due_date)}</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>{formatCurrency(installment.amount)}</Text>
        <View style={styles.badgeWrapper}>
          <StatusBadge status={installment.status} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  left: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  number: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  promoBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  promoText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  date: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  badgeWrapper: {
    marginTop: 4,
  },
});
