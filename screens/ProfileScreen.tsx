import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Edit, Crown, Calendar, MapPin, Users, ChevronRight } from 'lucide-react-native';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const skillLevelColors: Record<string, string> = {
  Beginner: '#3b82f6',
  Intermediate: '#eab308',
  Advanced: '#ef4444',
  beginner: '#3b82f6',
  intermediate: '#eab308',
  advanced: '#ef4444',
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface MiniGame {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  skillLevel: string;
  playerCount: number;
  maxPlayers: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [stats, setStats] = useState({ matchesPlayed: 0, goals: 0, assists: 0 });
  const [upcomingGames, setUpcomingGames] = useState<MiniGame[]>([]);
  const [pastGames, setPastGames] = useState<MiniGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchMyGames()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('stats')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setStats({
          matchesPlayed: data.matches_played,
          goals: data.goals,
          assists: data.assists,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMyGames = async () => {
    try {
      const { data: playerEntries, error: peError } = await supabase
        .from('game_players')
        .select('game_id')
        .eq('user_id', user?.id);

      if (peError) throw peError;
      if (!playerEntries || playerEntries.length === 0) {
        setUpcomingGames([]);
        setPastGames([]);
        return;
      }

      const gameIds = playerEntries.map((pe: any) => pe.game_id);

      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id, title, date, time, location, skill_level, max_players,
          game_players(user_id)
        `)
        .in('id', gameIds)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (gamesError) throw gamesError;

      const today = new Date().toISOString().split('T')[0];
      const upcoming: MiniGame[] = [];
      const past: MiniGame[] = [];

      (gamesData || []).forEach((g: any) => {
        const miniGame: MiniGame = {
          id: g.id,
          title: g.title,
          date: g.date,
          time: g.time,
          location: g.location,
          skillLevel: capitalize(g.skill_level),
          playerCount: g.game_players?.length || 0,
          maxPlayers: g.max_players,
        };

        if (g.date >= today) {
          upcoming.push(miniGame);
        } else {
          past.push(miniGame);
        }
      });

      past.reverse();
      setUpcomingGames(upcoming);
      setPastGames(past);
    } catch (error) {
      console.error('Error fetching my games:', error);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    router.replace('/login' as any);
  };

  const displaySkillLevel = capitalize(profile?.skill_level || 'beginner');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const displayedUpcoming = showAllUpcoming ? upcomingGames : upcomingGames.slice(0, 3);
  const displayedPast = showAllPast ? pastGames : pastGames.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <User size={48} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.username}>{profile?.username || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View
            style={[
              styles.skillBadge,
              { backgroundColor: skillLevelColors[profile?.skill_level || 'beginner'] || '#6b7280' },
            ]}
          >
            <Text style={styles.skillBadgeText}>{displaySkillLevel}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGridRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{stats.matchesPlayed}</Text>
              <Text style={styles.statBoxLabel}>Matches</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{stats.goals}</Text>
              <Text style={styles.statBoxLabel}>Goals</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{stats.assists}</Text>
              <Text style={styles.statBoxLabel}>Assists</Text>
            </View>
          </View>
        </View>

        {upcomingGames.length > 0 && (
          <View style={styles.gamesSection}>
            <View style={styles.gamesSectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Games</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{upcomingGames.length}</Text>
              </View>
            </View>
            {displayedUpcoming.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={styles.miniGameCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/game/${game.id}` as any)}
              >
                <View style={styles.miniGameInfo}>
                  <Text style={styles.miniGameTitle} numberOfLines={1}>{game.title}</Text>
                  <View style={styles.miniGameMeta}>
                    <Calendar size={12} color="#9ca3af" />
                    <Text style={styles.miniGameMetaText}>{game.date} at {game.time}</Text>
                  </View>
                  <View style={styles.miniGameMeta}>
                    <MapPin size={12} color="#9ca3af" />
                    <Text style={styles.miniGameMetaText} numberOfLines={1}>{game.location}</Text>
                  </View>
                </View>
                <View style={styles.miniGameRight}>
                  <View style={styles.miniPlayerCount}>
                    <Users size={12} color="#10b981" />
                    <Text style={styles.miniPlayerText}>
                      {game.playerCount}/{game.maxPlayers}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#6b7280" />
                </View>
              </TouchableOpacity>
            ))}
            {upcomingGames.length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllUpcoming(!showAllUpcoming)}
                style={styles.showMoreButton}
              >
                <Text style={styles.showMoreText}>
                  {showAllUpcoming ? 'Show less' : `Show all ${upcomingGames.length} games`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {pastGames.length > 0 && (
          <View style={styles.gamesSection}>
            <View style={styles.gamesSectionHeader}>
              <Text style={styles.sectionTitle}>Past Games</Text>
              <View style={[styles.countBadge, styles.countBadgePast]}>
                <Text style={[styles.countBadgeText, styles.countBadgeTextPast]}>{pastGames.length}</Text>
              </View>
            </View>
            {displayedPast.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.miniGameCard, styles.miniGameCardPast]}
                activeOpacity={0.7}
                onPress={() => router.push(`/game/${game.id}` as any)}
              >
                <View style={styles.miniGameInfo}>
                  <Text style={styles.miniGameTitle} numberOfLines={1}>{game.title}</Text>
                  <View style={styles.miniGameMeta}>
                    <Calendar size={12} color="#6b7280" />
                    <Text style={styles.miniGameMetaTextPast}>{game.date}</Text>
                  </View>
                  <View style={styles.miniGameMeta}>
                    <MapPin size={12} color="#6b7280" />
                    <Text style={styles.miniGameMetaTextPast} numberOfLines={1}>{game.location}</Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#4b5563" />
              </TouchableOpacity>
            ))}
            {pastGames.length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllPast(!showAllPast)}
                style={styles.showMoreButton}
              >
                <Text style={styles.showMoreText}>
                  {showAllPast ? 'Show less' : `Show all ${pastGames.length} games`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {upcomingGames.length === 0 && pastGames.length === 0 && (
          <View style={styles.emptyGamesCard}>
            <Text style={styles.emptyGamesTitle}>No games yet</Text>
            <Text style={styles.emptyGamesSubtitle}>
              Join or create a game to see it here
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push('/subscription' as any)}
          style={styles.subscriptionButton}
          activeOpacity={0.7}
        >
          <Crown size={20} color="#FFFFFF" />
          <Text style={styles.subscriptionButtonText}>Manage Subscriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.7}
          onPress={() => router.push('/edit-profile' as any)}
        >
          <Edit size={20} color="#10b981" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <Button
          onPress={handleLogout}
          title={loggingOut ? 'Logging out...' : 'Logout'}
          variant="outline"
          style={styles.logoutButton}
          disabled={loggingOut}
        />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  avatar: {
    width: 96,
    height: 96,
    backgroundColor: '#10b981',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#10b981',
  },
  username: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: '#9ca3af',
    fontSize: 15,
    marginBottom: 12,
  },
  skillBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillBadgeText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  statsGridRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statBoxValue: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statBoxLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  gamesSection: {
    marginBottom: 20,
  },
  gamesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
  countBadgePast: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  countBadgeTextPast: {
    color: '#9ca3af',
  },
  miniGameCard: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniGameCardPast: {
    opacity: 0.7,
  },
  miniGameInfo: {
    flex: 1,
    marginRight: 12,
  },
  miniGameTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  miniGameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  miniGameMetaText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  miniGameMetaTextPast: {
    color: '#6b7280',
    fontSize: 13,
  },
  miniGameRight: {
    alignItems: 'center',
    gap: 6,
  },
  miniPlayerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniPlayerText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  showMoreButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  showMoreText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyGamesCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  emptyGamesTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyGamesSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  subscriptionButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionButtonText: {
    color: '#ffffff',
    marginLeft: 12,
    fontWeight: '600',
    fontSize: 16,
  },
  editButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  editButtonText: {
    color: '#ffffff',
    marginLeft: 12,
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 16,
  },
});
