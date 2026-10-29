
'use client';

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarFooter } from '@/components/ui/sidebar';
import Link from 'next/link';
import { 
    LayoutDashboard, 
    Users, 
    Settings, 
    LogOut, 
    Loader2, 
    Inbox, 
    Truck, 
    DollarSign, 
    Mail, 
    Plane, 
    ShoppingCart, 
    History,
    TrendingUp,
    Headphones,
    Database,
    Tag,
    Calculator
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode, useRef } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { Notifications } from '@/components/notifications';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

/**
 * @fileOverview Hardened Admin Authentication Guard.
 * Ensures the session is valid and authorized before rendering administrative routes.
 * Implements strict timeout and terminal state management to prevent loading hangs.
 */
function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { supabase, user, isLoading } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const checkInProgress = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setIsVerifying(false);
      router.replace('/admin-login');
      return;
    }

    if (checkInProgress.current) return;
    checkInProgress.current = true;

    const checkRole = async () => {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth Timeout')), 10000)
      );

      try {
        const rpcPromise = supabase.rpc('is_admin');
        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;
        
        if (data === true && !error) {
          setIsAdmin(true);
        } else {
          // Hardcoded fallback for master domain admin
          if (user.email === 'admin@neilussolutions.com') {
            setIsAdmin(true);
          } else {
            router.replace('/admin-login');
          }
        }
      } catch (e) {
        if (user.email === 'admin@neilussolutions.com') {
          setIsAdmin(true);
        } else {
          console.error('[AUTH_GUARD_FAIL]', e);
          router.replace('/admin-login');
        }
      } finally {
        setIsVerifying(false);
        checkInProgress.current = false;
      }
    };

    checkRole();
  }, [user, isLoading, supabase, router]);

  if (isLoading || isVerifying) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-black uppercase italic tracking-tighter">Authorizing Admin Session</p>
      </div>
    );
  }
  
  if (!isAdmin) return null;

  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = useSupabase();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/admin-login');
  };

  const sidebarLinks = [
    { href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, label: "OPERATIONS HUB" },
    { href: "/admin/sales", icon: <TrendingUp className="h-4 w-4" />, label: "SALES & GROWTH" },
    { href: "/admin/customer-service", icon: <Headphones className="h-4 w-4" />, label: "CUSTOMER SERVICE" },
    { href: "/admin/pos", icon: <ShoppingCart className="h-4 w-4" />, label: "POS SYSTEM" },
    { href: "/admin/pre-alerts", icon: <Inbox className="h-4 w-4" />, label: "PRE-ALERTS" },
    { href: "/admin/shipping", icon: <Truck className="h-4 w-4" />, label: "SHIPPING" },
    { href: "/admin/users", icon: <Users className="h-4 w-4" />, label: "USERS" },
    { href: "/admin/finance", icon: <DollarSign className="h-4 w-4" />, label: "FINANCE" },
    { href: "/admin/communications", icon: <Mail className="h-4 w-4" />, label: "COMMUNICATIONS" },
    { href: "/admin/manifests", icon: <Plane className="h-4 w-4" />, label: "MANIFESTS" },
    { href: "/admin/migration", icon: <Database className="h-4 w-4" />, label: "MIGRATION" },
    { href: "/admin/rates", icon: <Tag className="h-4 w-4" />, label: "RATES" },
    { href: "/admin/customs-calculator", icon: <Calculator className="h-4 w-4" />, label: "CALCULATOR" },
    { href: "/admin/logs", icon: <History className="h-4 w-4" />, label: "ACTIVITY LOGS" },
    { href: "/admin/settings", icon: <Settings className="h-4 w-4" />, label: "SETTINGS" },
  ];

  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <Sidebar className="border-r-2">
          <SidebarHeader className="p-4 border-b">
             <div className="flex items-center gap-3 p-1">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                  <div className="text-sm overflow-hidden">
                      <div className="font-bold truncate text-foreground">{user?.user_metadata?.full_name || 'Admin'}</div>
                      <div className="text-muted-foreground text-[10px] truncate uppercase font-bold tracking-widest">{user?.email}</div>
                  </div>
              </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2 pt-4">
              {sidebarLinks.map((link) => (
                   <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton asChild isActive={pathname === link.href} className="h-10 font-bold uppercase tracking-tight">
                          <Link href={link.href}>
                              {link.icon}
                              <span className="ml-2">{link.label}</span>
                          </Link>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-destructive hover:bg-destructive/5 font-black uppercase italic text-xs">
                <LogOut className="mr-2 h-4 w-4" /> SIGN OUT
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6 sticky top-0 z-30 shadow-sm">
            <SidebarTrigger />
            <div className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground hidden md:block">Store2Door OS</div>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Notifications />
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full bg-muted/5">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
