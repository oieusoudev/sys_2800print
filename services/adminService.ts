import { apiClient } from '@/lib/api';
import { AdminUser, Announcement, SendAnnouncementRequest } from '@/types/admin';
import { TimeEntry, MonthlyStats } from '@/types/api';

export class AdminService {
  async getAllUsers(): Promise<AdminUser[]> {
    const response = await apiClient.get<AdminUser[]>('/admin/users');
    return response.data;
  }

  async getUserTimeEntries(userId: string, startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('user_id', userId);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);

    const response = await apiClient.get<TimeEntry[]>(`/time-entries?${queryParams.toString()}`);
    return response.data;
  }

  async getUserMonthlyStats(userId: string, year?: number, month?: number): Promise<MonthlyStats> {
    const queryParams = new URLSearchParams();
    queryParams.append('user_id', userId);
    if (year) queryParams.append('year', year.toString());
    if (month) queryParams.append('month', month.toString());

    const response = await apiClient.get<MonthlyStats>(`/time-entries/stats?${queryParams.toString()}`);
    return response.data;
  }

  async sendGeneralAnnouncement(data: Omit<SendAnnouncementRequest, 'recipient_id'>): Promise<Announcement> {
    const response = await apiClient.post<Announcement>('/admin/announcements/send-general', data);
    return response.data;
  }

  async sendSpecificAnnouncement(data: SendAnnouncementRequest): Promise<Announcement> {
    const response = await apiClient.post<Announcement>('/admin/announcements/send-specific', data);
    return response.data;
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    const response = await apiClient.get<Announcement[]>('/admin/announcements');
    return response.data;
  }

  async deleteAnnouncement(announcementId: string): Promise<void> {
    await apiClient.delete(`/admin/announcements/${announcementId}`);
  }
}

export const adminService = new AdminService();