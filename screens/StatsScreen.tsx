import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Trophy, Target as TargetIcon, Users, Calendar } from 'lucide-react-native';
import StatCard from '../components/StatCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function StatsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
  });
  const [pastGames, setPastGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      // 1. Fetch the games the user played in that are closed
      const { data: closedGames, error: gamesError } = await supabase
        .from('game_players')
        .select('game_id, games!inner(id, title, date, status)')
        .eq('user_id', user?.id)
        .eq('games.status', 'closed');

      if (gamesError) throw gamesError;

      // 2. Fetch the actual stat records for the user
      const { data: playerStats, error: statsError } = await supabase
        .from('player_game_stats')
        .select('game_id, goals, assists')
        .eq('user_id', user?.id);

      if (statsError) throw statsError;

      const totalGoals = (playerStats || []).reduce(
        (sum: number, s: any) => sum + (s.goals || 0),
        0
      );
      const totalAssists = (playerStats || []).reduce(
        (sum: number, s: any) => sum + (s.assists || 0),
        0
      );

      setStats({
        matchesPlayed: closedGames?.length || 0,
        goals: totalGoals,
        assists: totalAssists,
      });

      // 3. Map the history list together
      const history = (closedGames || []).map(cg => {
         const stat = playerStats?.find(s => s.game_id === cg.game_id);
         return {
           game: cg.games,
           goals: stat?.goals || 0,
           assists: stat?.assists || 0
         };
      }).sort((a, b) => new Date(b.game.date).getTime() - new Date(a.game.date).getTime());

      setPastGames(history);

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>Your Stats</Text>
        <Text style={styles.subtitle}>Track your performance</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
      >
        <View style={styles.statItem}>
          <StatCard
            label="Matches Played"
            value={stats.matchesPlayed}
            icon={<Trophy size={32} color="#10b981" />}
          />
        </View>

        <View style={styles.statItem}>
          <StatCard
            label="Goals Scored"
            value={stats.goals}
            icon={<TargetIcon size={32} color="#10b981" />}
          />
        </View>

        <View style={styles.statItem}>
          <StatCard
            label="Assists"
            value={stats.assists}
            icon={<Users size={32} color="#10b981" />}
          />
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Goals per Match</Text>
            <Text style={styles.overviewValue}>
              {stats.matchesPlayed > 0
                ? (stats.goals / stats.matchesPlayed).toFixed(1)
                : '0.0'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Assists per Match</Text>
            <Text style={styles.overviewValue}>
              {stats.matchesPlayed > 0
                ? (stats.assists / stats.matchesPlayed).toFixed(1)
                : '0.0'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Total Contributions</Text>
            <Text style={styles.overviewValue}>{stats.goals + stats.assists}</Text>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Games Played</Text>
          {pastGames.length === 0 ? (
            <Text style={styles.emptyText}>You haven't played any closed games yet.</Text>
          ) : (
            pastGames.map((pg, index) => (
              <View key={index} style={styles.pastGameCard}>
                <View style={styles.pastGameLeft}>
                  <Text style={styles.pastGameTitle} numberOfLines={1}>{pg.game.title}</Text>
                  <View style={styles.pastGameDateRow}>
                    <Calendar size={12} color="#9ca3af" />
                    <Text style={styles.pastGameDate}>{pg.game.date}</Text>
                  </View>
                </View>
                <View style={styles.pastGameRight}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillValue}>{pg.goals}</Text>
                    <Text style={styles.statPillLabel}>G</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillValue}>{pg.assists}</Text>
                    <Text style={styles.statPillLabel}>A</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 15,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  statItem: {
    marginBottom: 16,
  },
  overviewCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  overviewLabel: {
    color: '#9ca3af',
    fontSize: 15,
  },
  overviewValue: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  historySection: {
    marginTop: 8,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 10,
  },
  pastGameCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#374151',
  },
  pastGameLeft: {
    flex: 1,
    marginRight: 12,
  },
  pastGameTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pastGameDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pastGameDate: {
    color: '#9ca3af',
    fontSize: 13,
  },
  pastGameRight: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 44,
  },
  statPillValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  statPillLabel: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});