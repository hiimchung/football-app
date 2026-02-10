import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (session) {
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/login' as any);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [loading, session]);

  return (
    <View style={styles.container}>
      <Target size={80} color="#10b981" strokeWidth={2.5} />
      <Text style={styles.title}>PickupPlay</Text>
      <Text style={styles.subtitle}>Find Your Game</Text>
      {loading && (
        <ActivityIndicator size="large" color="#10b981" style={styles.loader} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 24,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 18,
    marginTop: 8,
  },
  loader: {
    marginTop: 32,
  },
});
