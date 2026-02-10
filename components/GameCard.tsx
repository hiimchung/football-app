import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, MapPin, Users, Lock } from 'lucide-react-native';
import { Game } from '../types';

interface GameCardProps {
  game: Game;
  onPress: () => void;
  onJoinPress?: () => void;
}

const skillLevelColors: Record<string, string> = {
  Beginner: '#3b82f6',
  Intermediate: '#eab308',
  Advanced: '#ef4444',
  beginner: '#3b82f6',
  intermediate: '#eab308',
  advanced: '#ef4444',
};

export default function GameCard({ game, onPress, onJoinPress }: GameCardProps) {
  const isClosed = game.status === 'closed';

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, isClosed && styles.cardClosed]} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{game.title}</Text>
            {isClosed && (
              <View style={styles.closedBadge}>
                <Lock size={10} color="#f59e0b" />
                <Text style={styles.closedBadgeText}>Closed</Text>
              </View>
            )}
          </View>
          <Text style={styles.host}>Hosted by {game.host.name}</Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: skillLevelColors[game.skillLevel] || '#6b7280' },
          ]}
        >
          <Text style={styles.badgeText}>{game.skillLevel}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Calendar size={16} color="#9CA3AF" />
          <Text style={styles.detailText}>
            {game.date} at {game.time}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MapPin size={16} color="#9CA3AF" />
          <Text style={styles.detailText}>{game.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Users size={16} color="#9CA3AF" />
          <Text style={styles.detailText}>
            {game.players.length}/{game.maxPlayers} players
          </Text>
        </View>
      </View>

      {onJoinPress && !isClosed && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onJoinPress();
          }}
          style={styles.joinButton}
          activeOpacity={0.7}
        >
          <Text style={styles.joinButtonText}>Join Game</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardClosed: {
    opacity: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  closedBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  host: {
    color: '#9ca3af',
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#d1d5db',
    marginLeft: 8,
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
