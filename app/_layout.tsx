import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { initRevenueCat } from '../lib/revenuecat';

function AppContent() {
  const { user } = useAuth();
  useNotifications(user?.id);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="game/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="game-stats/[id]" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Initialize RevenueCat on app launch
    initRevenueCat();
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}