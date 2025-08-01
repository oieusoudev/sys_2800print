import { LocationData } from '@/types';

export function getAccuracyLevel(accuracy: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
  label: string;
} {
  if (accuracy <= 20) {
    return { level: 'excellent', color: 'text-green-400', label: 'Excelente' };
  } else if (accuracy <= 50) {
    return { level: 'good', color: 'text-blue-400', label: 'Boa' };
  } else if (accuracy <= 100) {
    return { level: 'fair', color: 'text-yellow-400', label: 'Razoável' };
  } else {
    return { level: 'poor', color: 'text-red-400', label: 'Ruim' };
  }
}

export function formatCoordinates(lat: number, lng: number): string {
  const formatCoord = (coord: number, isLat: boolean) => {
    const abs = Math.abs(coord);
    const degrees = Math.floor(abs);
    const minutes = Math.floor((abs - degrees) * 60);
    const seconds = ((abs - degrees - minutes / 60) * 3600).toFixed(1);
    const direction = isLat ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  return `${formatCoord(lat, true)} ${formatCoord(lng, false)}`;
}

export function getGoogleMapsUrl(location: LocationData): string {
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}

export function isLocationAccurate(location: LocationData | null): boolean {
  return location !== null && location.accuracy <= 200; // Mais flexível
}