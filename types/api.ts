// API Types aligned with database schema
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD format
  clock_in?: string; // HH:MM:SS format 
  lunch_out?: string; 
  lunch_in?: string; 
  clock_out?: string; 
  notes?: string;
  total_hours?: number;
  regular_hours?: number;
  overtime_hours?: number;
  created_at: string;
  updated_at: string;
  // Relations
  punch_locations?: PunchLocation[];
}

export interface PunchLocation {
  id: string;
  time_entry_id: string;
  punch_type: PunchType;
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp: string;
}

export interface BreakSession {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD format
  total_time_used: number; // seconds
  sessions_data: {
    pausedTime: number;
    startTime: number | null;
    isActive: boolean;
    isPaused: boolean;
    lastActiveTime: number | null;
  };
  created_at: string;
  updated_at: string;
}

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  daily_hours: number;
  overtime_rate: number;
  break_limit_minutes: number;
  work_start_time: string; // HH:MM format
  work_end_time: string;
  lunch_duration_minutes: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  ip_address: string;
  timestamp: string;
}

export type PunchType = 'clock_in' | 'lunch_out' | 'lunch_in' | 'clock_out';

// Request/Response types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_at: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  full_name: string;
  password: string;
  is_admin?: boolean;
}

export interface PunchRequest {
  punch_type: PunchType;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  notes?: string;
  punch_time_client?: string; // Hora local do cliente (HH:MM)
}

export interface TimeEntryFilters {
  start_date?: string;
  end_date?: string;
  user_id?: string;
}

export interface MonthlyStats {
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  overtime_pay: number;
  working_days: number;
  break_time_used: number;
}