import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/theme';

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title = 'Plannex' }: AppHeaderProps) {
  const { user, profile, isAdmin, signOut } = useAuth();

  const handleSignOutConfirm = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const displayName = profile?.full_name || user?.email || 'Usuario';
  const roleLabel = isAdmin ? 'ADMIN' : 'CLIENTE';

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>{title}</Text>
          <View style={styles.liveDot} />
        </View>
        <Text style={styles.userSubtitle} numberOfLines={1}>
          {displayName} • <Text style={isAdmin ? styles.adminText : styles.clientText}>{roleLabel}</Text>
        </Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOutConfirm}>
        <Text style={styles.signOutText}>Salir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.headerBg,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  userSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  adminText: {
    color: colors.danger,
    fontWeight: '800',
  },
  clientText: {
    color: colors.primary,
    fontWeight: '800',
  },
  signOutBtn: {
    backgroundColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
});
