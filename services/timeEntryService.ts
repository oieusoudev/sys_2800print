import { apiClient } from '@/lib/api';
import { TimeEntry, PunchRequest, TimeEntryFilters, MonthlyStats } from '@/types/api';

export class TimeEntryService {
  async punchClock(punchData: PunchRequest): Promise<TimeEntry> {
    const response = await apiClient.post<TimeEntry>('/time-entries/punch', punchData);
    return response.data;
  }

  async getTodayEntry(): Promise<TimeEntry | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get<TimeEntry>(`/time-entries/today?date=${today}`);
      return response.data;
    } catch (error) {
      console.error('Get today entry error:', error);
      return null;
    }
  }

  async getTimeEntries(filters: TimeEntryFilters = {}): Promise<TimeEntry[]> {
    const queryParams = new URLSearchParams();
    
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.user_id) queryParams.append('user_id', filters.user_id);

    const response = await apiClient.get<TimeEntry[]>(`/time-entries?${queryParams.toString()}`);
    return response.data;
  }

  async getCurrentMonthEntries(): Promise<TimeEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    return this.getTimeEntries({
      start_date: startOfMonth,
      end_date: endOfMonth
    });
  }

  async getMonthlyStats(): Promise<MonthlyStats> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const response = await apiClient.get<MonthlyStats>(`/time-entries/stats?year=${year}&month=${month}`);
    return response.data;
  }

  async updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry> {
    const response = await apiClient.put<TimeEntry>(`/time-entries/update/${id}`, data);
    return response.data;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await apiClient.delete(`/time-entries/delete/${id}`);
  }

  async addNotes(notes: string): Promise<TimeEntry> {
    const response = await apiClient.post<TimeEntry>('/time-entries/notes', { notes });
    return response.data;
  }

  async exportToCSV(filters: TimeEntryFilters = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.user_id) queryParams.append('user_id', filters.user_id);

    const response = await fetch(`${apiClient['baseURL']}/time-entries/export-csv?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiClient['token']}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Export failed: ${response.statusText} - ${errorText}`);
    }

    return response.blob();
  }
}

export const timeEntryService = new TimeEntryService();