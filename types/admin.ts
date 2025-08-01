// Admin-specific types
export interface AdminUser {
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

export interface Announcement {
  id: string;
  sender_id: string;
  recipient_id?: string;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string;
    username: string;
  };
  recipient?: {
    full_name: string;
    username: string;
  };
}

export interface UserAnnouncement {
  id: string;
  user_id: string;
  announcement_id: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
  announcement: Announcement;
}

export interface SendAnnouncementRequest {
  title: string;
  message: string;
  recipient_id?: string;
}

export interface NotificationBadge {
  count: number;
  hasUnread: boolean;
}