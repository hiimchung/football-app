import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Navigation, MapPin, X, Check } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import Input from '../components/Input';
import Button from '../components/Button';
import SkillLevelPicker from '../components/SkillLevelPicker';
import CalendarPicker from '../components/CalendarPicker';
import TimeDropdown from '../components/TimeDropdown';
import { SkillLevel } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentLocation, Coordinates, reverseGeocodeCoords } from '../lib/location';

// Interface for OpenStreetMap Search Results
interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export default function CreateGameScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('Intermediate');
  
  // Location State
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  
  // Autocomplete State
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Map Modal State
  const [showMap, setShowMap] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 18.0179, // Default to Jamaica roughly (or update to your preferred default)
    longitude: -76.8099,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [tempPin, setTempPin] = useState<Coordinates | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // --- 1. AUTOCOMPLETE LOGIC ---
  const searchAddress = async (text: string) => {
    setLocationName(text);
    if (fieldErrors.location) setFieldErrors((p) => ({ ...p, location: '' }));
    
    // Clear coordinates if user starts typing manually again
    if (coordinates) setCoordinates(null);

    if (text.length > 2) {
      setIsSearching(true);
      try {
        // Free OpenStreetMap Geocoding API
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5`
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const selectSearchResult = (item: SearchResult) => {
    setLocationName(item.display_name);
    setCoordinates({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    });
    setSearchResults([]);
    Keyboard.dismiss();
  };

  // --- 2. MAP PICKER LOGIC ---
  const openMapPicker = async () => {
    Keyboard.dismiss();
    // If we already have coordinates, center the map there
    if (coordinates) {
      setMapRegion({
        ...mapRegion,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      setTempPin(coordinates);
    } else {
      // Try to get current location to center map
      const currentLoc = await getCurrentLocation();
      if (currentLoc) {
        setMapRegion({
          ...mapRegion,
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        });
        setTempPin(currentLoc);
      }
    }
    setShowMap(true);
  };

  const confirmMapLocation = async () => {
    if (tempPin) {
      setCoordinates(tempPin);
      // Reverse geocode the pin to get a readable address name
      const address = await reverseGeocodeCoords(tempPin.latitude, tempPin.longitude);
      setLocationName(address || `${tempPin.latitude.toFixed(4)}, ${tempPin.longitude.toFixed(4)}`);
      if (fieldErrors.location) setFieldErrors((p) => ({ ...p, location: '' }));
    }
    setShowMap(false);
  };

  // --- 3. FORM VALIDATION & SUBMISSION ---
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) errors.title = 'Game title is required';
    if (!date) errors.date = 'Please select a date';
    if (!time) errors.time = 'Please select a time';
    if (!locationName.trim() || !coordinates) errors.location = 'Please select a valid location from the dropdown or map';

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

  const handleCreateGame = async () => {
    setError('');
    if (!validate()) return;
    if (!user) return setError('You must be logged in to create a game');

    setLoading(true);
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert({
          title: title.trim(),
          date,
          time,
          location: locationName.trim(),
          skill_level: skillLevel.toLowerCase(),
          host_id: user.id,
          max_players: parseInt(maxPlayers),
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        })
        .select()
        .single();

      if (gameError) throw gameError;

      const { error: joinError } = await supabase
        .from('game_players')
        .insert({ game_id: gameData.id, user_id: user.id });

      if (joinError) throw joinError;

      router.back();
    } catch (err: any) {
      console.error('Error creating game:', err);
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>Create New Game</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Input value={title} onChangeText={setTitle} placeholder="Saturday Morning Game" label="Game Title" />
        {fieldErrors.title ? <Text style={styles.fieldError}>{fieldErrors.title}</Text> : null}

        <CalendarPicker selectedDate={date} onSelectDate={setDate} label="Date" />
        {fieldErrors.date ? <Text style={styles.fieldError}>{fieldErrors.date}</Text> : null}

        <TimeDropdown selectedTime={time} onSelectTime={setTime} label="Time" />
        {fieldErrors.time ? <Text style={styles.fieldError}>{fieldErrors.time}</Text> : null}

        {/* --- LOCATION PICKER UI --- */}
        <View style={styles.locationContainer}>
          <Text style={styles.inputLabel}>Location</Text>
          
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Input
                value={locationName}
                onChangeText={searchAddress}
                placeholder="Search for an address..."
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#10b981" style={styles.searchSpinner} />
              )}
            </View>

            <TouchableOpacity style={styles.mapButton} onPress={openMapPicker}>
              <MapPin size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Autocomplete Dropdown Results */}
          {searchResults.length > 0 && (
            <View style={styles.dropdownContainer}>
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.dropdownItem}
                  onPress={() => selectSearchResult(item)}
                >
                  <MapPin size={16} color="#9ca3af" style={styles.dropdownIcon} />
                  <Text style={styles.dropdownText} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Status Indicator */}
          {coordinates && searchResults.length === 0 && (
            <View style={styles.locationSuccessBadge}>
              <Check size={14} color="#10b981" />
              <Text style={styles.locationSuccessText}>Location coordinates locked</Text>
            </View>
          )}

          {fieldErrors.location ? <Text style={styles.fieldError}>{fieldErrors.location}</Text> : null}
        </View>

        <Input
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          placeholder="12"
          label="Max Players"
          keyboardType="numeric"
        />
        {fieldErrors.maxPlayers ? <Text style={styles.fieldError}>{fieldErrors.maxPlayers}</Text> : null}

        <SkillLevelPicker selected={skillLevel} onSelect={setSkillLevel} />

        <Button onPress={handleCreateGame} title={loading ? 'Creating...' : 'Create Game'} style={styles.submitButton} disabled={loading} />
      </ScrollView>

      {/* --- FULL SCREEN MAP MODAL --- */}
      <Modal visible={showMap} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMap(false)} style={styles.closeButton}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Pin Location</Text>
            <TouchableOpacity onPress={confirmMapLocation} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              onPress={(e) => setTempPin(e.nativeEvent.coordinate)}
            >
              {tempPin && <Marker coordinate={tempPin} />}
            </MapView>
            
            <View style={styles.mapInstructionBox}>
              <Text style={styles.mapInstructionText}>Tap anywhere on the map to drop a pin</Text>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  headerBar: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 16, backgroundColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#374151' },
  pageTitle: { color: '#ffffff', fontSize: 26, fontWeight: '700' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  errorBanner: { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, marginBottom: 16, textAlign: 'center', fontSize: 14, fontWeight: '500', overflow: 'hidden' },
  fieldError: { color: '#ef4444', fontSize: 13, marginTop: -12, marginBottom: 12, marginLeft: 4 },
  
  // Location Styles
  locationContainer: { marginBottom: 16, zIndex: 10 },
  inputLabel: { color: '#d1d5db', fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  searchInputWrapper: { flex: 1, position: 'relative' },
  searchSpinner: { position: 'absolute', right: 12, top: 14 },
  mapButton: { height: 48, width: 48, backgroundColor: '#3b82f6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
  // Dropdown Styles
  dropdownContainer: { backgroundColor: '#1f2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151', marginTop: 4, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#374151' },
  dropdownIcon: { marginRight: 10 },
  dropdownText: { color: '#d1d5db', fontSize: 14, flex: 1 },
  locationSuccessBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginLeft: 4 },
  locationSuccessText: { color: '#10b981', fontSize: 13, fontWeight: '500' },
  
  submitButton: { marginTop: 16 },

  // Map Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#111827' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#1f2937' },
  closeButton: { padding: 4 },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  confirmButton: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  confirmButtonText: { color: '#ffffff', fontWeight: '600' },
  mapWrapper: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapInstructionBox: { position: 'absolute', top: 20, alignSelf: 'center', backgroundColor: 'rgba(31, 41, 55, 0.9)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  mapInstructionText: { color: '#ffffff', fontWeight: '500', fontSize: 14 },
});