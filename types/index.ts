// Re-export API types for backward compatibility
export type { 
  User, 
  TimeEntry,
  PunchLocation,
  BreakSession,
  WebAuthnCredential,
  CompanySettings,
  AuditLog,
  PunchType,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  PunchRequest,
  TimeEntryFilters,
  MonthlyStats
} from './api';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
  speed?: number;
}

export interface GeolocationState {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  attempts: number;
  lastUpdate: Date | null;
}

export interface PunchAction {
  type: 'clock_in' | 'lunch_out' | 'lunch_in' | 'clock_out';
  label: string;
  color: string;
  icon: string;
}