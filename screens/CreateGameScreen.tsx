import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Navigation, Check } from 'lucide-react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import SkillLevelPicker from '../components/SkillLevelPicker';
import CalendarPicker from '../components/CalendarPicker';
import TimeDropdown from '../components/TimeDropdown';
import { SkillLevel } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentLocation, Coordinates } from '../lib/location';

export default function CreateGameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('Intermediate');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) errors.title = 'Game title is required';
    if (!date) errors.date = 'Please select a date';
    if (!time) errors.time = 'Please select a time';
    if (!location.trim()) errors.location = 'Location is required';

    if (!maxPlayers.trim()) {
      errors.maxPlayers = 'Max players is required';
    } else {
      const num = parseInt(maxPlayers);
      if (isNaN(num) || num < 2) errors.maxPlayers = 'Must be at least 2 players';
      if (num > 100) errors.maxPlayers = 'Must be 100 or fewer players';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUseLocation = async () => {
    setLocationLoading(true);
    const coords = await getCurrentLocation();
    if (coords) {
      setCoordinates(coords);
    } else {
      setError('Could not get your location. Please check your browser permissions.');
    }
    setLocationLoading(false);
  };

  const handleCreateGame = async () => {
    setError('');
    if (!validate()) return;

    if (!user) {
      setError('You must be logged in to create a game');
      return;
    }

    setLoading(true);
    try {
      const insertData: any = {
        title: title.trim(),
        date,
        time,
        location: location.trim(),
        skill_level: skillLevel.toLowerCase(),
        host_id: user.id,
        max_players: parseInt(maxPlayers),
      };

      if (coordinates) {
        insertData.latitude = coordinates.latitude;
        insertData.longitude = coordinates.longitude;
      }

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert(insertData)
        .select()
        .single();

      if (gameError) throw gameError;

      const { error: joinError } = await supabase
        .from('game_players')
        .insert({
          game_id: gameData.id,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      setTitle('');
      setDate('');
      setTime('');
      setLocation('');
      setMaxPlayers('');
      setSkillLevel('Intermediate');
      setCoordinates(null);
      setFieldErrors({});
      setError('');

      router.back();
    } catch (err: any) {
      console.error('Error creating game:', err);
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>Create New Game</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Input
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: '' }));
          }}
          placeholder="Saturday Morning Game"
          label="Game Title"
        />
        {fieldErrors.title ? (
          <Text style={styles.fieldError}>{fieldErrors.title}</Text>
        ) : null}

        <CalendarPicker
          selectedDate={date}
          onSelectDate={(d) => {
            setDate(d);
            if (fieldErrors.date) setFieldErrors((p) => ({ ...p, date: '' }));
          }}
          label="Date"
        />
        {fieldErrors.date ? (
          <Text style={styles.fieldError}>{fieldErrors.date}</Text>
        ) : null}

        <TimeDropdown
          selectedTime={time}
          onSelectTime={(t) => {
            setTime(t);
            if (fieldErrors.time) setFieldErrors((p) => ({ ...p, time: '' }));
          }}
          label="Time"
        />
        {fieldErrors.time ? (
          <Text style={styles.fieldError}>{fieldErrors.time}</Text>
        ) : null}

        <Input
          value={location}
          onChangeText={(t) => {
            setLocation(t);
            if (fieldErrors.location) setFieldErrors((p) => ({ ...p, location: '' }));
          }}
          placeholder="Central Park Field 3"
          label="Location"
        />
        {fieldErrors.location ? (
          <Text style={styles.fieldError}>{fieldErrors.location}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.locationButton, coordinates && styles.locationButtonActive]}
          onPress={handleUseLocation}
          activeOpacity={0.7}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : coordinates ? (
            <Check size={18} color="#10b981" />
          ) : (
            <Navigation size={18} color="#9ca3af" />
          )}
          <Text style={[styles.locationButtonText, coordinates && styles.locationButtonTextActive]}>
            {coordinates ? 'Location captured' : 'Use Current Location'}
          </Text>
        </TouchableOpacity>

        <Input
          value={maxPlayers}
          onChangeText={(t) => {
            setMaxPlayers(t);
            if (fieldErrors.maxPlayers) setFieldErrors((p) => ({ ...p, maxPlayers: '' }));
          }}
          placeholder="12"
          label="Max Players"
          keyboardType="numeric"
        />
        {fieldErrors.maxPlayers ? (
          <Text style={styles.fieldError}>{fieldErrors.maxPlayers}</Text>
        ) : null}

        <SkillLevelPicker selected={skillLevel} onSelect={setSkillLevel} />

        <Button
          onPress={handleCreateGame}
          title={loading ? 'Creating...' : 'Create Game'}
          style={styles.submitButton}
          disabled={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 48,
  },
  errorBanner: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    overflow: 'hidden',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  locationButtonActive: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  locationButtonText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '500',
  },
  locationButtonTextActive: {
    color: '#10b981',
  },
  submitButton: {
    marginTop: 16,
  },
});
