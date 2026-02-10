import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Navigation } from 'lucide-react-native';
import GameCard from '../components/GameCard';
import { SkillLevel, Game } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Coordinates,
  getCurrentLocation,
  calculateDistance,
  formatDistance,
} from '../lib/location';

type FilterOption = SkillLevel | 'All' | 'Nearby';

const SKILL_FILTERS: FilterOption[] = ['All', 'Nearby', 'Beginner', 'Intermediate', 'Advanced'];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface GameWithDistance extends Game {
  distance?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('All');
  const [games, setGames] = useState<GameWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    initLocation();
  }, []);

  useEffect(() => {
    fetchGames();
  }, [userLocation]);

  const initLocation = async () => {
    setLocationLoading(true);
    const coords = await getCurrentLocation();
    if (coords) {
      setUserLocation(coords);
      setLocationName(`${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&zoom=10`
        );
        const data = await response.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county;
        const state = data.address?.state;
        if (city && state) {
          setLocationName(`${city}, ${state}`);
        } else if (city) {
          setLocationName(city);
        }
      } catch {}
    }
    setLocationLoading(false);
  };

  const fetchGames = async () => {
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          host:profiles!games_host_id_fkey(id, username, skill_level),
          game_players(user_id, profiles(id, username, skill_level))
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .eq('status', 'open')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (gamesError) throw gamesError;

      const formattedGames: GameWithDistance[] = (gamesData || []).map((game: any) => {
        let distance: number | undefined;
        if (
          userLocation &&
          game.latitude != null &&
          game.longitude != null
        ) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            game.latitude,
            game.longitude
          );
        }

        return {
          id: game.id,
          title: game.title,
          date: game.date,
          time: game.time,
          location: game.location,
          skillLevel: capitalize(game.skill_level) as SkillLevel,
          maxPlayers: game.max_players,
          latitude: game.latitude,
          longitude: game.longitude,
          status: game.status || 'open',
          host: {
            id: game.host.id,
            name: game.host.username,
            email: '',
            skillLevel: capitalize(game.host.skill_level) as SkillLevel,
            matchesPlayed: 0,
            goals: 0,
            assists: 0,
          },
          players: game.game_players.map((gp: any) => ({
            id: gp.profiles.id,
            name: gp.profiles.username,
            email: '',
            skillLevel: capitalize(gp.profiles.skill_level) as SkillLevel,
            matchesPlayed: 0,
            goals: 0,
            assists: 0,
          })),
          distance,
        };
      });

      setGames(formattedGames);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGames();
  }, [userLocation]);

  const filteredGames = (() => {
    if (selectedFilter === 'All') return games;
    if (selectedFilter === 'Nearby') {
      return games
        .filter((g) => g.distance != null && g.distance <= 20)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return games.filter((g) => g.skillLevel === selectedFilter);
  })();

  const handleFilterPress = (filter: FilterOption) => {
    if (filter === 'Nearby' && !userLocation) {
      initLocation();
    }
    setSelectedFilter(filter);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.locationRow}>
          {locationLoading ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : userLocation ? (
            <>
              <Navigation size={16} color="#10b981" />
              <Text style={styles.locationText}>{locationName}</Text>
            </>
          ) : (
            <TouchableOpacity onPress={initLocation} style={styles.locationRow}>
              <MapPin size={16} color="#9ca3af" />
              <Text style={styles.locationTextInactive}>Enable location</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.pageTitle}>Pickup Games</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {SKILL_FILTERS.map((filter) => {
            const isNearby = filter === 'Nearby';
            const isActive = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => handleFilterPress(filter)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  isNearby && !isActive && styles.filterChipNearby,
                ]}
                activeOpacity={0.7}
              >
                {isNearby && (
                  <Navigation
                    size={13}
                    color={isActive ? '#ffffff' : '#10b981'}
                    style={{ marginRight: 5 }}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                    isNearby && !isActive && styles.filterTextNearby,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.gameList}
        contentContainerStyle={styles.gameListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
            colors={['#10b981']}
          />
        }
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : filteredGames.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {selectedFilter === 'Nearby'
                ? userLocation
                  ? 'No games found within 20km. Try creating a new game!'
                  : 'Enable location to see nearby games.'
                : 'No games found. Pull to refresh or create a new game!'}
            </Text>
          </View>
        ) : (
          filteredGames.map((game) => (
            <View key={game.id}>
              {selectedFilter === 'Nearby' && game.distance != null && (
                <View style={styles.distanceTag}>
                  <Navigation size={11} color="#10b981" />
                  <Text style={styles.distanceTagText}>
                    {formatDistance(game.distance)} away
                  </Text>
                </View>
              )}
              <GameCard
                game={game}
                onPress={() => router.push(`/game/${game.id}` as any)}
              />
            </View>
          ))
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
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  locationText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  locationTextInactive: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  filterScroll: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterChipNearby: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  filterText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  filterTextNearby: {
    color: '#10b981',
  },
  gameList: {
    flex: 1,
  },
  gameListContent: {
    padding: 24,
  },
  centered: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    marginLeft: 4,
  },
  distanceTagText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
});
