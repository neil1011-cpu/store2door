'use client';

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarFooter } from '@/components/ui/sidebar';
import Link from 'next/link';
import { LayoutDashboard, Users, Package, Settings, LogOut, Loader2, Inbox, Truck, DollarSign, Mail, Plane, Tag, Calculator, Bell, DatabaseZap, ShoppingCart, History } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { Notifications } from '@/components/notifications';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { supabase, user, isLoading } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/admin-login');
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase.rpc('is_admin');
      if (data) {
        setIsAdmin(true);
      } else {
        router.replace('/admin-login');
      }
      setIsVerifying(false);
    };
    checkRole();
  }, [user, isLoading, supabase, router]);

  if (isLoading || isVerifying) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-black uppercase italic">Authorizing Admin Session</p>
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
    { href: "/admin", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/admin/pos", icon: <ShoppingCart />, label: "POS System" },
    { href: "/admin/pre-alerts", icon: <Inbox />, label: "Pre-Alerts" },
    { href: "/admin/shipping", icon: <Truck />, label: "Shipping" },
    { href: "/admin/users", icon: <Users />, label: "Users" },
    { href: "/admin/finance", icon: <DollarSign />, label: "Finance" },
    { href: "/admin/communications", icon: <Mail />, label: "Communications" },
    { href: "/admin/manifests", icon: <Plane />, label: "Manifests" },
    { href: "/admin/rates", icon: <Tag />, label: "Rates" },
    { href: "/admin/customs-calculator", icon: <Calculator />, label: "Calculator" },
    { href: "/admin/logs", icon: <History />, label: "Activity Logs" },
    { href: "/admin/notifications", icon: <Bell />, label: "Notifications" },
    { href: "/admin/settings", icon: <Settings />, label: "Settings" },
  ];

  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="p-4">
             <div className="flex items-center gap-3 p-1">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                  <div className="text-sm overflow-hidden">
                      <div className="font-bold truncate">{user?.user_metadata?.full_name || 'Admin'}</div>
                      <div className="text-muted-foreground text-[10px] truncate">{user?.email}</div>
                  </div>
              </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2">
              {sidebarLinks.map((link) => (
                   <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton asChild isActive={pathname === link.href} className="h-10">
                          <Link href={link.href}>
                              {link.icon}
                              <span className="font-medium">{link.label}</span>
                          </Link>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-destructive hover:bg-destructive/5 font-bold">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="text-sm font-bold tracking-tight uppercase text-muted-foreground hidden md:block">FromStore2Door Admin</div>
            <div className="flex-1" />
            <ThemeToggle />
            <Notifications />
          </header>
          <main className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
