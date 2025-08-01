'use client';

import { useState } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, badge, isLoading, markAsRead, markAllAsRead } = useNotifications();

  const unreadNotifications = notifications.filter(n => !n.read_at);
  const readNotifications = notifications.filter(n => n.read_at);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.announcement_id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return 'há pouco tempo';
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative text-slate-300 hover:text-white hover:bg-slate-700"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {badge.hasUnread && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {badge.count > 99 ? '99+' : badge.count}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md max-h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-400" />
              <span>Notificações</span>
              {badge.hasUnread && (
                <Badge variant="destructive" className="text-xs">
                  {badge.count}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {badge.hasUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Carregando notificações...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhuma notificação</p>
                </div>
              ) : (
                <>
                  {/* Notificações não lidas */}
                  {unreadNotifications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                        Não lidas ({unreadNotifications.length})
                      </h4>
                      <div className="space-y-2">
                        {unreadNotifications.map((notification) => (
                          <Card 
                            key={notification.id} 
                            className="bg-blue-900/20 border-blue-600/50 cursor-pointer hover:bg-blue-900/30 transition-colors"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-white text-sm mb-1">
                                    {notification.announcement.title}
                                  </h5>
                                  <p className="text-slate-300 text-xs mb-2 line-clamp-2">
                                    {notification.announcement.message}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-slate-400 text-xs">
                                      {notification.announcement.sender?.full_name || 'Administração'}
                                    </p>
                                    <p className="text-slate-400 text-xs">
                                      {formatTimeAgo(notification.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-2 text-blue-400 hover:text-blue-300 hover:bg-blue-800/50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.announcement_id);
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notificações lidas */}
                  {readNotifications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
                        <div className="w-2 h-2 bg-slate-500 rounded-full mr-2" />
                        Lidas ({readNotifications.length})
                      </h4>
                      <div className="space-y-2">
                        {readNotifications.slice(0, 5).map((notification) => (
                          <Card 
                            key={notification.id} 
                            className="bg-slate-700/50 border-slate-600/50"
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-slate-300 text-sm mb-1">
                                    {notification.announcement.title}
                                  </h5>
                                  <p className="text-slate-400 text-xs mb-2 line-clamp-2">
                                    {notification.announcement.message}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-slate-500 text-xs">
                                      {notification.announcement.sender?.full_name || 'Administração'}
                                    </p>
                                    <p className="text-slate-500 text-xs">
                                      {formatTimeAgo(notification.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <Check className="h-4 w-4 text-green-400 ml-2" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {readNotifications.length > 5 && (
                          <p className="text-center text-slate-500 text-xs py-2">
                            E mais {readNotifications.length - 5} notificações...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}