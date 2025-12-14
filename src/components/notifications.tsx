
'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuFooter,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, ScanText, Truck, CircleDot, Check } from 'lucide-react';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const READ_NOTIFICATIONS_KEY = 'read-notifications';

type Notification = {
  id: string;
  type: 'pre-alert' | 'status-update';
  title: string;
  description: string;
  isRead: boolean;
  timestamp: string;
  href: string;
};

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'pre-alert':
      return <ScanText className="h-4 w-4 text-muted-foreground" />;
    case 'status-update':
      return <Truck className="h-4 w-4 text-muted-foreground" />;
    default:
      return <CircleDot className="h-4 w-4 text-muted-foreground" />;
  }
};

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getReadNotificationIds = (): string[] => {
    try {
        const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse read notifications from localStorage", e);
        return [];
    }
  };

  const saveReadNotificationIds = (ids: string[]) => {
      try {
          localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(ids));
      } catch (e) {
          console.error("Failed to save read notifications to localStorage", e);
      }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        
        if (!response.ok || !Array.isArray(data)) {
            throw new Error(data.message || 'Failed to fetch notifications.');
        }

        const readIds = getReadNotificationIds();

        const updatedNotifications = data.map((n: Notification) => ({
            ...n,
            isRead: readIds.includes(n.id)
        })).sort((a: Notification, b: Notification) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setNotifications(updatedNotifications);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
        toast({
            title: 'Could not load notifications',
            description: (error as Error).message,
            variant: 'destructive'
        })
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const readIds = getReadNotificationIds();
    if (!readIds.includes(id)) {
        const newReadIds = [...readIds, id];
        saveReadNotificationIds(newReadIds);
    }
    
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    saveReadNotificationIds(allIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast({
        title: 'All notifications marked as read.'
    })
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && <Badge variant="secondary">{unreadCount} Unread</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
            {loading ? (
            <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
            ) : notifications.length === 0 ? (
            <DropdownMenuItem disabled className="text-center text-muted-foreground">No notifications</DropdownMenuItem>
            ) : (
            notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} asChild className={cn("group data-[disabled]:opacity-100", notification.isRead && "opacity-60")}>
                    <Link href={notification.href} className="flex items-start gap-3 relative">
                        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1">
                            <p className={cn("font-medium", !notification.isRead && "font-semibold")}>{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                        </div>
                        {!notification.isRead &&
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                                title="Mark as read"
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        }
                    </Link>
                </DropdownMenuItem>
            ))
            )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuFooter className="p-1 space-y-1">
            <Button variant="secondary" size="sm" className="w-full" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                Mark all as read
            </Button>
            <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/admin/notifications">
                    View all notifications
                </Link>
            </Button>
        </DropdownMenuFooter>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
