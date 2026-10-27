import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/theme';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const norm = status.toLowerCase();

  let text = 'Al Día';
  let badgeStyle = styles.badgeActive;
  let textStyle = styles.textActive;

  if (norm === 'atrasado' || norm === 'vencida') {
    text = norm === 'vencida' ? 'Vencida' : 'En Mora';
    badgeStyle = styles.badgeDanger;
    textStyle = styles.textDanger;
  } else if (norm === 'cancelado' || norm === 'pagada') {
    text = norm === 'pagada' ? '✓ Pagada' : 'Liquidado';
    badgeStyle = styles.badgeSuccess;
    textStyle = styles.textSuccess;
  } else if (norm === 'pendiente') {
    text = 'Pendiente';
    badgeStyle = styles.badgePending;
    textStyle = styles.textPending;
  } else if (norm === 'parcial') {
    text = 'Abono Parcial';
    badgeStyle = styles.badgeInfo;
    textStyle = styles.textInfo;
  }

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.text, textStyle]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  textActive: {
    color: colors.primary,
  },
  badgeSuccess: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  textSuccess: {
    color: colors.primary,
  },
  badgeDanger: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  textDanger: {
    color: colors.danger,
  },
  badgeInfo: {
    backgroundColor: colors.infoLight,
    borderColor: colors.infoBorder,
  },
  textInfo: {
    color: colors.info,
  },
  badgePending: {
    backgroundColor: colors.cardBorder,
    borderColor: colors.cardBorder,
  },
  textPending: {
    color: colors.textMuted,
  },
});
