import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Calendar, MapPin, Users, ArrowLeft, User, MessageCircle, Lock, XCircle, BarChart3 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Game, GameStatus, SkillLevel } from '../types';

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

export default function GameDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchGameDetails();
  }, [id]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const fetchGameDetails = async () => {
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          host:profiles!games_host_id_fkey(id, username, skill_level),
          game_players(user_id, profiles(id, username, skill_level))
        `)
        .eq('id', id)
        .maybeSingle();

      if (gameError) throw gameError;
      if (!gameData) {
        setLoading(false);
        return;
      }

      const formattedGame: Game = {
        id: gameData.id,
        title: gameData.title,
        date: gameData.date,
        time: gameData.time,
        location: gameData.location,
        skillLevel: capitalize(gameData.skill_level) as SkillLevel,
        maxPlayers: gameData.max_players,
        latitude: gameData.latitude,
        longitude: gameData.longitude,
        status: gameData.status || 'open',
        host: {
          id: gameData.host.id,
          name: gameData.host.username,
          email: '',
          skillLevel: capitalize(gameData.host.skill_level) as SkillLevel,
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
        },
        players: gameData.game_players.map((gp: any) => ({
          id: gp.profiles.id,
          name: gp.profiles.username,
          email: '',
          skillLevel: capitalize(gp.profiles.skill_level) as SkillLevel,
          matchesPlayed: 0,
          goals: 0,
          assists: 0,
        })),
      };

      setGame(formattedGame);
      setIsJoined(formattedGame.players.some((p) => p.id === user?.id));
    } catch (err) {
      console.error('Error fetching game details:', err);
      setError('Failed to load game details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!user || !game) return;
    if (game.players.length >= game.maxPlayers) {
      setError('This game has reached maximum capacity');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const { error: joinError } = await supabase
        .from('game_players')
        .insert({ game_id: game.id, user_id: user.id });
      if (joinError) throw joinError;
      setSuccessMsg('You have joined the game!');
      fetchGameDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to join game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGame = async () => {
    if (!user || !game) return;
    if (game.host.id === user.id) {
      setError('You are the host of this game.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const { error: leaveError } = await supabase
        .from('game_players')
        .delete()
        .eq('game_id', game.id)
        .eq('user_id', user.id);
      if (leaveError) throw leaveError;
      setSuccessMsg('You have left the game');
      fetchGameDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to leave game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseGame = async () => {
    if (!user || !game) return;
    if (game.host.id !== user.id) return;

    setActionLoading(true);
    setError(null);
    try {
      const { error: closeError } = await supabase
        .from('games')
        .update({ status: 'closed' })
        .eq('id', game.id)
        .eq('host_id', user.id);
      if (closeError) throw closeError;
      setSuccessMsg('Game has been closed');
      fetchGameDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to close game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenGame = async () => {
    if (!user || !game) return;
    if (game.host.id !== user.id) return;

    setActionLoading(true);
    setError(null);
    try {
      const { error: reopenError } = await supabase
        .from('games')
        .update({ status: 'open' })
        .eq('id', game.id)
        .eq('host_id', user.id);
      if (reopenError) throw reopenError;
      setSuccessMsg('Game has been reopened');
      fetchGameDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to reopen game');
    } finally {
      setActionLoading(false);
    }
  };

  const isHost = game?.host.id === user?.id;
  const isClosed = game?.status === 'closed';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Game not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.goBackButton}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spotsLeft = game.maxPlayers - game.players.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game Details</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}
        {successMsg && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMsg}</Text>
          </View>
        )}

        {isClosed && (
          <View style={styles.closedBanner}>
            <Lock size={16} color="#f59e0b" />
            <Text style={styles.closedBannerText}>This game has been closed by the host</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              <Text style={styles.hostText}>Hosted by {game.host.name}</Text>
            </View>
            <View
              style={[
                styles.skillBadge,
                { backgroundColor: skillLevelColors[game.skillLevel] || '#6b7280' },
              ]}
            >
              <Text style={styles.skillBadgeText}>{game.skillLevel}</Text>
            </View>
          </View>

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Calendar size={18} color="#9ca3af" />
              <Text style={styles.detailText}>
                {game.date} at {game.time}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={18} color="#9ca3af" />
              <Text style={styles.detailText}>{game.location}</Text>
            </View>
            <View style={styles.detailRow}>
              <Users size={18} color="#9ca3af" />
              <Text style={styles.detailText}>
                {game.players.length}/{game.maxPlayers} players joined
              </Text>
            </View>
          </View>

          <View style={styles.spotsRow}>
            <View
              style={[styles.spotsBadge, spotsLeft === 0 && styles.spotsBadgeFull]}
            >
              <Text
                style={[styles.spotsText, spotsLeft === 0 && styles.spotsTextFull]}
              >
                {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Players</Text>
          {game.players.map((player, index) => (
            <View
              key={player.id}
              style={[
                styles.playerRow,
                index < game.players.length - 1 && styles.playerRowBorder,
              ]}
            >
              <View style={styles.playerAvatar}>
                <User size={18} color="#ffffff" />
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerSkill}>{player.skillLevel}</Text>
              </View>
              {player.id === game.host.id && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {isJoined && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/chat/${game.id}` as any)}
            activeOpacity={0.7}
          >
            <MessageCircle size={18} color="#10b981" />
            <Text style={styles.chatButtonText}>Open Chat</Text>
          </TouchableOpacity>
        )}

        {isHost && isClosed && (
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => router.push(`/game-stats/${game.id}` as any)}
            activeOpacity={0.7}
          >
            <BarChart3 size={18} color="#3b82f6" />
            <Text style={styles.statsButtonText}>Add / Edit Player Stats</Text>
          </TouchableOpacity>
        )}

        {isHost && (
          isClosed ? (
            <TouchableOpacity
              style={styles.reopenButton}
              onPress={handleReopenGame}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Text style={styles.reopenButtonText}>Reopen Game</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseGame}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <>
                  <XCircle size={18} color="#f59e0b" />
                  <Text style={styles.closeButtonText}>Close Game</Text>
                </>
              )}
            </TouchableOpacity>
          )
        )}

        {!isClosed && isJoined && !isHost && (
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={handleLeaveGame}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text style={styles.leaveButtonText}>Leave Game</Text>
            )}
          </TouchableOpacity>
        )}

        {!isClosed && !isJoined && (
          <TouchableOpacity
            style={[styles.joinButton, (actionLoading || spotsLeft === 0) && styles.buttonDisabled]}
            onPress={handleJoinGame}
            disabled={actionLoading || spotsLeft === 0}
            activeOpacity={0.7}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.joinButtonText}>Join Game</Text>
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
  notFoundText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  goBackButton: {
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
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
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
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  gameTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  hostText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  skillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  skillBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsList: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    color: '#d1d5db',
    fontSize: 15,
  },
  spotsRow: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 14,
  },
  spotsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  spotsBadgeFull: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  spotsText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  spotsTextFull: {
    color: '#ef4444',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  playerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  playerSkill: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  hostBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hostBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  chatButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  statsButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  closedBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closedBannerText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  closeButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  reopenButton: {
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reopenButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
});
