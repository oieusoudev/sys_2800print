import { useState, useEffect, useCallback } from 'react';
import { UserAnnouncement, NotificationBadge } from '@/types/admin';
import { notificationService } from '@/services/notificationService';
import { toast } from 'sonner';

export function useNotifications() {
  const [notifications, setNotifications] = useState<UserAnnouncement[]>([]);
  const [badge, setBadge] = useState<NotificationBadge>({ count: 0, hasUnread: false });
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notificationsData, badgeData] = await Promise.all([
        notificationService.getMyAnnouncements(),
        notificationService.getUnreadCount()
      ]);
      
      setNotifications(notificationsData);
      setBadge(badgeData);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (announcementId: string) => {
    try {
      await notificationService.markAsRead(announcementId);
      
      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification.announcement_id === announcementId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );
      
      // Atualizar badge
      setBadge(prev => ({
        count: Math.max(0, prev.count - 1),
        hasUnread: prev.count > 1
      }));
      
      toast.success('Notificação marcada como lida');
    } catch (error: any) {
      console.error('Error marking as read:', error);
      toast.error('Erro ao marcar como lida');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      console.log('🔄 Starting mark all as read process...');
      await notificationService.markAllAsRead();
      
      // Atualizar estado local
      const now = new Date().toISOString();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read_at: now }))
      );
      
      // Atualizar badge
      setBadge({ count: 0, hasUnread: false });
      
      console.log('✅ Successfully marked all notifications as read');
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error: any) {
      console.error('❌ Error marking all as read:', error);
      
      // Show more specific error message to user
      const errorMessage = error.message || 'Erro ao marcar todas como lidas';
      toast.error(errorMessage);
    }
  }, []);

  // Carregar notificações ao montar o componente
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Polling para atualizar notificações a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      notificationService.getUnreadCount()
        .then(setBadge)
        .catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    badge,
    isLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead
  };
}