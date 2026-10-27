import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { DashboardScreen } from './src/screens/dashboard/DashboardScreen';
import { CreditDetailScreen } from './src/screens/credits/CreditDetailScreen';
import { fetchCreditsForUser } from './src/services/credit.service';
import type { Credit } from './src/types/credit.types';
import { colors } from './src/theme/theme';

function MainApp() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loadingCredits, setLoadingCredits] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);

  const loadCredits = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingCredits(true);
      const data = await fetchCreditsForUser(user.id, user.email || '', isAdmin);
      setCredits(data);
    } catch (err) {
      console.error('Error al cargar créditos:', err);
    } finally {
      setLoadingCredits(false);
      setRefreshing(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) {
      loadCredits();
    } else {
      setCredits([]);
      setSelectedCredit(null);
    }
  }, [user, isAdmin, loadCredits]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCredits();
  };

  const handleCreditUpdated = (updatedCredit: Credit) => {
    setCredits((prev) => prev.map((c) => (c.id === updatedCredit.id ? updatedCredit : c)));
    if (selectedCredit && selectedCredit.id === updatedCredit.id) {
      setSelectedCredit(updatedCredit);
    }
  };

  // 1. Cargando estado de autenticación
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 2. Pantalla de Login / Registro
  if (!user) {
    return <LoginScreen />;
  }

  // 3. Detalle de Crédito Seleccionado
  if (selectedCredit) {
    return (
      <CreditDetailScreen
        credit={selectedCredit}
        onBack={() => {
          setSelectedCredit(null);
          loadCredits();
        }}
        onCreditUpdated={handleCreditUpdated}
      />
    );
  }

  // 4. Dashboard Principal
  return (
    <DashboardScreen
      credits={credits}
      loading={loadingCredits}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      onSelectCredit={(credit) => setSelectedCredit(credit)}
      onPaymentRegistered={() => {
        loadCredits();
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
