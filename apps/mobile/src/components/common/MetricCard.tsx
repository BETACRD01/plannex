import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/theme';

interface MetricCardProps {
  label: string;
  value: string;
  variant?: 'primary' | 'danger' | 'info' | 'neutral';
  suffix?: string;
}

export function MetricCard({ label, value, variant = 'neutral', suffix }: MetricCardProps) {
  const valueStyle = [
    styles.value,
    variant === 'primary' && styles.valuePrimary,
    variant === 'danger' && styles.valueDanger,
    variant === 'info' && styles.valueInfo,
    variant === 'neutral' && styles.valueNeutral,
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={valueStyle}>
        {value}
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  valuePrimary: {
    color: colors.primary,
  },
  valueDanger: {
    color: colors.danger,
  },
  valueInfo: {
    color: colors.info,
  },
  valueNeutral: {
    color: colors.text,
  },
  suffix: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSubtle,
  },
});
