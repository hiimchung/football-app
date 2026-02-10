import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Target, Users, Save } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PlayerStat {
  userId: string;
  username: string;
  goals: string;
  assists: string;
}

export default function GameStatsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [gameTitle, setGameTitle] = useState('');
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id && user) fetchGameAndPlayers();
  }, [id, user]);

  const fetchGameAndPlayers = async () => {
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, title, host_id, status')
        .eq('id', id)
        .maybeSingle();

      if (gameError) throw gameError;
      if (!gameData) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      if (gameData.host_id !== user?.id) {
        setError('Only the game organizer can add stats');
        setLoading(false);
        return;
      }

      setGameTitle(gameData.title);

      const { data: players, error: playersError } = await supabase
        .from('game_players')
        .select('user_id, profiles(id, username)')
        .eq('game_id', id as string);

      if (playersError) throw playersError;

      const { data: existingStats, error: statsError } = await supabase
        .from('player_game_stats')
        .select('user_id, goals, assists')
        .eq('game_id', id as string);

      if (statsError) throw statsError;

      const statsMap = new Map(
        (existingStats || []).map((s: any) => [s.user_id, s])
      );

      const mapped: PlayerStat[] = (players || []).map((gp: any) => {
        const existing = statsMap.get(gp.profiles.id);
        return {
          userId: gp.profiles.id,
          username: gp.profiles.username,
          goals: existing ? String(existing.goals) : '0',
          assists: existing ? String(existing.assists) : '0',
        };
      });

      setPlayerStats(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const updateStat = (
    index: number,
    field: 'goals' | 'assists',
    value: string
  ) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setPlayerStats((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: cleaned };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user || !id) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const upserts = playerStats.map((ps) => ({
        game_id: id as string,
        user_id: ps.userId,
        goals: parseInt(ps.goals, 10) || 0,
        assists: parseInt(ps.assists, 10) || 0,
      }));

      const { error: upsertError } = await supabase
        .from('player_game_stats')
        .upsert(upserts, { onConflict: 'game_id,user_id' });

      if (upsertError) throw upsertError;

      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save stats');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (error && playerStats.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game Stats</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorContainerText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBackLink}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Add Stats</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {gameTitle}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>Stats saved successfully!</Text>
          </View>
        )}

        <View style={styles.columnHeaders}>
          <View style={styles.playerCol}>
            <Text style={styles.colLabel}>Player</Text>
          </View>
          <View style={styles.statCol}>
            <Target size={14} color="#10b981" />
            <Text style={styles.colLabel}>Goals</Text>
          </View>
          <View style={styles.statCol}>
            <Users size={14} color="#10b981" />
            <Text style={styles.colLabel}>Assists</Text>
          </View>
        </View>

        {playerStats.map((ps, index) => (
          <View
            key={ps.userId}
            style={[
              styles.playerStatRow,
              index < playerStats.length - 1 && styles.playerStatRowBorder,
            ]}
          >
            <View style={styles.playerCol}>
              <View style={styles.playerAvatar}>
                <User size={16} color="#ffffff" />
              </View>
              <Text style={styles.playerName} numberOfLines={1}>
                {ps.username}
              </Text>
            </View>
            <View style={styles.statCol}>
              <TextInput
                style={styles.statInput}
                value={ps.goals}
                onChangeText={(v) => updateStat(index, 'goals', v)}
                keyboardType="numeric"
                maxLength={3}
                selectTextOnFocus
              />
            </View>
            <View style={styles.statCol}>
              <TextInput
                style={styles.statInput}
                value={ps.assists}
                onChangeText={(v) => updateStat(index, 'assists', v)}
                keyboardType="numeric"
                maxLength={3}
                selectTextOnFocus
              />
            </View>
          </View>
        ))}

        {playerStats.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No players in this game</Text>
          </View>
        )}

        {playerStats.length > 0 && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={18} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Stats</Text>
              </>
            )}
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorContainerText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  goBackLink: {
    marginTop: 16,
  },
  goBackText: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '600',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  playerCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statCol: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  colLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    marginBottom: 8,
  },
  playerStatRowBorder: {},
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statInput: {
    backgroundColor: '#374151',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: 56,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  emptyCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
