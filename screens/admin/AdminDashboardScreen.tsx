import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Users, UserCheck, Trophy, CreditCard } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface Metrics {
  totalUsers: number;
  activeUsers: number;
  totalGames: number;
  activeSubscriptions: number;
}

const METRIC_CONFIGS = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: '#3b82f6' },
  {
    key: 'activeUsers',
    label: 'Active Users',
    icon: UserCheck,
    color: '#10b981',
  },
  {
    key: 'totalGames',
    label: 'Games Created',
    icon: Trophy,
    color: '#f59e0b',
  },
  {
    key: 'activeSubscriptions',
    label: 'Active Subscriptions',
    icon: CreditCard,
    color: '#06b6d4',
  },
] as const;

export default function AdminDashboardScreen() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalGames: 0,
    activeSubscriptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [usersRes, activeRes, gamesRes, subsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('banned', false),
        supabase.from('games').select('*', { count: 'exact', head: true }),
        supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
      ]);

      setMetrics({
        totalUsers: usersRes.count ?? 0,
        activeUsers: activeRes.count ?? 0,
        totalGames: gamesRes.count ?? 0,
        activeSubscriptions: subsRes.count ?? 0,
      });
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#10b981"
        />
      }
    >
      <Text style={styles.pageTitle}>Dashboard</Text>
      <Text style={styles.pageSubtitle}>Platform overview</Text>

      <View style={styles.metricsGrid}>
        {METRIC_CONFIGS.map((cfg) => {
          const Icon = cfg.icon;
          return (
            <View key={cfg.key} style={styles.metricCard}>
              <View
                style={[
                  styles.metricIconWrap,
                  { backgroundColor: cfg.color + '18' },
                ]}
              >
                <Icon size={24} color={cfg.color} />
              </View>
              <Text style={styles.metricValue}>
                {metrics[cfg.key as keyof Metrics]}
              </Text>
              <Text style={styles.metricLabel}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    padding: 32,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
  },
  pageSubtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 32,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  metricCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 220,
    flex: 1,
  },
  metricIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
});
