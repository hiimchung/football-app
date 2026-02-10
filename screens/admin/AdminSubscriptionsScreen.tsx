import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface SubscriptionRow {
  id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  profiles: { username: string } | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  expired: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' },
  pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  completed: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
};

const PLAN_LABELS: Record<string, string> = {
  pro_player: 'Pro Player',
  organizer_pro: 'Organizer Pro',
  boost_game: 'Boost Game',
};

export default function AdminSubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'id, plan, status, amount, currency, created_at, profiles(username)'
      )
      .order('created_at', { ascending: false });

    if (!error && data) setSubscriptions(data as any);
    setLoading(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Subscriptions</Text>
        <Text style={styles.pageSubtitle}>
          {subscriptions.length} total subscriptions
        </Text>
      </View>

      <ScrollView style={styles.tableScroll}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>User</Text>
          <Text style={[styles.th, { flex: 1 }]}>Plan</Text>
          <Text style={[styles.th, { flex: 1 }]}>Status</Text>
          <Text style={[styles.th, { width: 100 }]}>Amount</Text>
          <Text style={[styles.th, { flex: 1 }]}>Created</Text>
        </View>

        {subscriptions.map((s) => {
          const statusColor =
            STATUS_COLORS[s.status] || STATUS_COLORS.expired;
          return (
            <View key={s.id} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
                {(s.profiles as any)?.username ?? 'Unknown'}
              </Text>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>
                    {PLAN_LABELS[s.plan] ?? s.plan}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: statusColor.text },
                    ]}
                  >
                    {s.status}
                  </Text>
                </View>
              </View>
              <Text style={[styles.td, { width: 100 }]}>
                {s.currency} {s.amount}
              </Text>
              <Text style={[styles.td, { flex: 1 }]}>
                {formatDate(s.created_at)}
              </Text>
            </View>
          );
        })}

        {subscriptions.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No subscriptions found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 32,
    paddingBottom: 0,
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
  },
  tableScroll: {
    flex: 1,
    marginHorizontal: 32,
    marginTop: 24,
    marginBottom: 32,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  th: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  td: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  planBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyRow: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
  },
});
