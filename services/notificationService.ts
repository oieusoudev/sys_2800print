import { apiClient } from '@/lib/api';
import { UserAnnouncement, NotificationBadge } from '@/types/admin';

export class NotificationService {
  async getMyAnnouncements(): Promise<UserAnnouncement[]> {
    try {
      const response = await apiClient.get<UserAnnouncement[]>('/notifications/me');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      throw new Error('Failed to load notifications');
    }
  }

  async getUnreadCount(): Promise<NotificationBadge> {
    try {
      const response = await apiClient.get<NotificationBadge>('/notifications/unread-count');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      throw new Error('Failed to load notification count');
    }
  }

  async markAsRead(announcementId: string): Promise<void> {
    try {
      await apiClient.post(`/notifications/mark-read/${announcementId}`);
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      console.log('🔄 Calling mark all as read API...');
      const response = await apiClient.post('/notifications/mark-all-read');
      console.log('✅ Mark all as read API response:', response);
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('fetch failed')) {
          throw new Error('Connection failed. Please check your internet connection and try again.');
        } else if (error.message.includes('Database error')) {
          throw new Error('Database connection failed. Please try again later.');
        }
      }
      
      throw new Error('Failed to mark all notifications as read');
    }
  }
}

export const notificationService = new NotificationService();