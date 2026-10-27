import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import type { CreditPayment } from '../../types/credit.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { colors } from '../../theme/theme';

interface PaymentHistoryItemProps {
  payment: CreditPayment;
  onViewVoucher: (url: string) => void;
}

export function PaymentHistoryItem({ payment, onViewVoucher }: PaymentHistoryItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.infoCol}>
          <Text style={styles.amount}>{formatCurrency(payment.amount)}</Text>
          <Text style={styles.date}>Fecha: {formatDate(payment.payment_date)}</Text>
          <Text style={styles.method}>Método: {payment.payment_method.toUpperCase()}</Text>
        </View>

        {payment.voucher_url ? (
          <TouchableOpacity
            style={styles.voucherBtn}
            onPress={() => onViewVoucher(payment.voucher_url!)}
            activeOpacity={0.8}
          >
            <Text style={styles.voucherBtnText}>Ver Recibo 🖼</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {payment.user_notes ? (
        <Text style={styles.notes}>"{payment.user_notes}"</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  method: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 1,
  },
  voucherBtn: {
    backgroundColor: colors.infoLight,
    borderColor: colors.infoBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  voucherBtnText: {
    color: colors.info,
    fontSize: 11,
    fontWeight: '700',
  },
  notes: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 6,
  },
});
