import { apiClient } from '@/lib/api';
import { BreakSession } from '@/types/api';

export class BreakService {
  async getTodayBreakSession(): Promise<BreakSession | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      return this.getBreakSessionByDate(today);
    } catch (error) {
      console.error('Get today break session error:', error);
      return null;
    }
  }

  async getBreakSessionByDate(date: string): Promise<BreakSession | null> {
    try {
      const response = await apiClient.get<BreakSession>(`/break-sessions/today?date=${date}`);
      return response.data;
    } catch (error) {
      console.error('Get break session by date error:', error);
      return null;
    }
  }

  async startBreak(): Promise<BreakSession> {
    const response = await apiClient.post<BreakSession>('/break-sessions/start');
    return response.data;
  }

  async pauseBreak(): Promise<BreakSession> {
    const response = await apiClient.post<BreakSession>('/break-sessions/pause');
    return response.data;
  }

  async resumeBreak(): Promise<BreakSession> {
    const response = await apiClient.post<BreakSession>('/break-sessions/resume');
    return response.data;
  }

  async updateBreakSession(sessionData: Partial<BreakSession['sessions_data']>): Promise<BreakSession> {
  }
  async updateBreakSession(totalTimeUsed: number, sessionData: BreakSession['sessions_data']): Promise<BreakSession> {
    const response = await apiClient.put<BreakSession>('/break-sessions/update', { 
      total_time_used: totalTimeUsed,
      sessions_data: sessionData 
    });
    return response.data;
  }

  async getBreakHistory(startDate?: string, endDate?: string): Promise<BreakSession[]> {
    const queryParams = new URLSearchParams();
    
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    const response = await apiClient.get<BreakSession[]>(`/break-sessions/list?${queryParams.toString()}`);
    return response.data;
  }
}

export const breakService = new BreakService();