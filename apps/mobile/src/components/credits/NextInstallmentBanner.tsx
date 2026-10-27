import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import type { CreditInstallment } from '../../types/credit.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { colors } from '../../theme/theme';

interface NextInstallmentBannerProps {
  installment: CreditInstallment;
  onPayNow: (amount: number) => void;
}

export function NextInstallmentBanner({ installment, onPayNow }: NextInstallmentBannerProps) {
  const pendingAmount = Number(installment.amount) - Number(installment.amount_paid);

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.badge}>PRÓXIMA CUOTA A CANCELAR</Text>
        <Text style={styles.number}>Cuota #{installment.installment_number}</Text>
        <Text style={styles.date}>
          Vence: <Text style={styles.dateHighlight}>{formatDate(installment.due_date)}</Text>
        </Text>
      </View>

      <TouchableOpacity
        style={styles.payBtn}
        onPress={() => onPayNow(pendingAmount)}
        activeOpacity={0.8}
      >
        <Text style={styles.payBtnText}>Pagar {formatCurrency(pendingAmount)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  info: {
    flex: 1,
    marginRight: 12,
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.info,
    letterSpacing: 0.5,
  },
  number: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  dateHighlight: {
    color: colors.text,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: colors.info,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  payBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
});
