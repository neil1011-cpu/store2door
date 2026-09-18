
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
import { useSupabase } from '@/components/supabase-provider';

export function Notifications() {
  const { supabase } = useSupabase();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeed = async () => {
    setIsLoading(true);
    // Pull the latest activity from system_logs instead of separate tables
    const { data } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
    
    setNotifications(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    
    // Subscribe to new log entries for real-time notifications
    const channel = supabase.channel('realtime_logs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_logs' }, () => {
            fetchFeed();
        })
        .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const unreadCount = notifications.length; // Simplified for MVP

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 text-[10px] animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 shadow-2xl border-2">
        <DropdownMenuLabel className="flex justify-between items-center py-4">
          <span className="text-xs font-black uppercase tracking-widest italic">Operations Feed</span>
          <Badge variant="secondary" className="text-[8px] font-black uppercase">Live Updates</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto opacity-20" /></div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground italic text-xs">No recent operational activity.</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="p-4 cursor-pointer focus:bg-primary/5 border-b last:border-0 h-auto">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg mt-1"><CircleDot className="h-3 w-3 text-primary" /></div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-black uppercase italic tracking-tighter leading-tight">{n.log_type.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] font-medium leading-relaxed opacity-60">{n.description}</p>
                    <p className="text-[8px] font-bold uppercase opacity-30 mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center py-4 focus:bg-transparent">
          <Link href="/admin/logs" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View Master Audit Trail</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
