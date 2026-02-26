import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<Coordinates | null> {
  try {
    const granted = await requestLocationPermission();
    if (!granted) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

// NEW: Geocode an address string to coordinates
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const geocodedLocation = await Location.geocodeAsync(address);
    if (geocodedLocation.length > 0) {
      return {
        latitude: geocodedLocation[0].latitude,
        longitude: geocodedLocation[0].longitude,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// NEW: Reverse geocode coordinates to a readable address
export async function reverseGeocodeCoords(latitude: number, longitude: number): Promise<string | null> {
  try {
    const reverseGeocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (reverseGeocoded.length > 0) {
      const address = reverseGeocoded[0];
      // Format: "123 Main St, New York"
      const street = address.street || address.name;
      const city = address.city || address.subregion;
      if (street && city) return `${street}, ${city}`;
      if (city) return city;
      if (address.region) return address.region;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}