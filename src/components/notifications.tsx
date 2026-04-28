
'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell, ScanText, Truck, CircleDot, Check, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy, limit } from 'firebase/firestore';
import type { PreAlert, Shipment } from '@/lib/types';

const READ_NOTIFICATIONS_KEY = 'read-notifications';

type Notification = {
  id: string;
  type: 'pre-alert' | 'status-update';
  title: string;
  description: string;
  isRead: boolean;
  timestamp: any;
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
  const { toast } = useToast();
  const firestore = useFirestore();

  // 1. Real-time Pre-Alerts
  const preAlertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'pre_alerts'), orderBy('submissionDate', 'desc'), limit(10));
  }, [firestore]);
  const { data: preAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

  // 2. Real-time Shipments
  const shipmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'shipments'), orderBy('shippingDate', 'desc'), limit(10));
  }, [firestore]);
  const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

  useEffect(() => {
    if (!preAlerts && !shipments) return;

    const getReadNotificationIds = (): string[] => {
      try {
        const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    };

    const readIds = getReadNotificationIds();
    const combined: Notification[] = [];

    preAlerts?.forEach((pa) => {
      combined.push({
        id: `pa-${pa.id}`,
        type: 'pre-alert',
        title: `New Pre-Alert: ${pa.trackingNumber}`,
        description: `${pa.customerName} submitted a pre-alert for ${pa.contents}.`,
        isRead: readIds.includes(`pa-${pa.id}`),
        timestamp: pa.submissionDate,
        href: '/admin/pre-alerts',
      });
    });

    shipments?.forEach((s) => {
      combined.push({
        id: `ship-${s.id}`,
        type: 'status-update',
        title: `Shipment: ${s.status}`,
        description: `Package ${s.trackingNumber} (${s.contents}) is now ${s.status}.`,
        isRead: readIds.includes(`ship-${s.id}`),
        timestamp: s.shippingDate,
        href: '/admin/shipping',
      });
    });

    const sorted = combined.sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || 0;
      const timeB = b.timestamp?.toMillis?.() || 0;
      return timeB - timeA;
    });

    setNotifications(sorted.slice(0, 15));
  }, [preAlerts, shipments]);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const stored = localStorage.getItem(READ_NOTIFICATIONS_KEY);
      const readIds = stored ? JSON.parse(stored) : [];
      if (!readIds.includes(id)) {
        localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...readIds, id]));
      }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isLoading = isLoadingPreAlerts || isLoadingShipments;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Activity Feed</span>
          {unreadCount > 0 && <Badge variant="secondary">{unreadCount} New</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground px-4 text-sm">
              No recent activity found.
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem key={n.id} asChild className={cn("p-3 cursor-pointer", n.isRead && "opacity-60")}>
                <Link href={n.href} className="flex items-start gap-3 group">
                  <div className="mt-1">{getNotificationIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm font-medium leading-none", !n.isRead && "font-bold")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                  </div>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-primary font-medium cursor-pointer">
          <Link href="/admin/notifications">View All Notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
