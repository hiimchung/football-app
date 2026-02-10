import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { Trash2, Star, StarOff } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface GameRow {
  id: string;
  title: string;
  date: string;
  status: string;
  featured: boolean;
  max_players: number;
  host: { username: string } | null;
  game_players: { user_id: string }[];
}

export default function AdminGamesScreen() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from('games')
      .select(
        'id, title, date, status, featured, max_players, host:profiles!games_host_id_fkey(username), game_players(user_id)'
      )
      .order('created_at', { ascending: false });

    if (!error && data) setGames(data as any);
    setLoading(false);
  };

  const toggleFeatured = async (gameId: string, featured: boolean) => {
    setActionLoading(gameId + '_feat');
    const { error } = await supabase
      .from('games')
      .update({ featured: !featured })
      .eq('id', gameId);

    if (!error) {
      setGames((prev) =>
        prev.map((g) =>
          g.id === gameId ? { ...g, featured: !featured } : g
        )
      );
    }
    setActionLoading(null);
  };

  const deleteGame = async (gameId: string) => {
    setActionLoading(gameId + '_del');
    const { error } = await supabase.from('games').delete().eq('id', gameId);

    if (!error) {
      setGames((prev) => prev.filter((g) => g.id !== gameId));
    }
    setActionLoading(null);
  };

  const handleDelete = (gameId: string, title: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Delete game "${title}"? This cannot be undone.`)) {
        deleteGame(gameId);
      }
    }
  };

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
        <Text style={styles.pageTitle}>Games</Text>
        <Text style={styles.pageSubtitle}>{games.length} total games</Text>
      </View>

      <ScrollView style={styles.tableScroll}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>Title</Text>
          <Text style={[styles.th, { flex: 1 }]}>Host</Text>
          <Text style={[styles.th, { flex: 1 }]}>Date</Text>
          <Text style={[styles.th, { width: 80 }]}>Status</Text>
          <Text style={[styles.th, { width: 80 }]}>Players</Text>
          <Text style={[styles.th, { width: 170 }]}>Actions</Text>
        </View>

        {games.map((g) => (
          <View key={g.id} style={styles.tableRow}>
            <View
              style={{
                flex: 2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {g.featured && (
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
              )}
              <Text style={styles.td} numberOfLines={1}>
                {g.title}
              </Text>
            </View>
            <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
              {(g.host as any)?.username ?? '-'}
            </Text>
            <Text style={[styles.td, { flex: 1 }]}>{g.date}</Text>
            <View style={{ width: 80 }}>
              <View
                style={[
                  styles.badge,
                  g.status === 'open'
                    ? styles.badgeOpen
                    : styles.badgeClosed,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    g.status === 'open'
                      ? styles.badgeOpenText
                      : styles.badgeClosedText,
                  ]}
                >
                  {g.status}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.td, { width: 80, textAlign: 'center' }]}
            >
              {g.game_players?.length ?? 0}/{g.max_players}
            </Text>
            <View style={{ width: 170, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  g.featured
                    ? styles.actionUnfeature
                    : styles.actionFeature,
                ]}
                onPress={() => toggleFeatured(g.id, g.featured)}
                disabled={actionLoading === g.id + '_feat'}
                activeOpacity={0.7}
              >
                {actionLoading === g.id + '_feat' ? (
                  <ActivityIndicator
                    size="small"
                    color={g.featured ? '#64748b' : '#f59e0b'}
                  />
                ) : g.featured ? (
                  <>
                    <StarOff size={14} color="#64748b" />
                    <Text style={styles.actionUnfeatureText}>
                      Unfeature
                    </Text>
                  </>
                ) : (
                  <>
                    <Star size={14} color="#f59e0b" />
                    <Text style={styles.actionFeatureText}>Feature</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionDelete]}
                onPress={() => handleDelete(g.id, g.title)}
                disabled={actionLoading === g.id + '_del'}
                activeOpacity={0.7}
              >
                {actionLoading === g.id + '_del' ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Trash2 size={14} color="#ef4444" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {games.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No games found</Text>
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
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeOpen: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeOpenText: { color: '#10b981' },
  badgeClosed: { backgroundColor: 'rgba(148, 163, 184, 0.1)' },
  badgeClosedText: { color: '#94a3b8' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  actionFeature: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  actionFeatureText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  actionUnfeature: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  actionUnfeatureText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
