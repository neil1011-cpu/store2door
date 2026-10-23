'use client';

import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarFooter } from '@/components/ui/sidebar';
import Link from 'next/link';
import { LayoutDashboard, Users, Package, Settings, LogOut, Loader2, Inbox, Truck, DollarSign, Mail, Plane, Tag, Calculator, Bell, ShoppingCart, History, Database, BarChart3, HeadphonesContact } from 'lucide-react';
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
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (data && !error) {
          setIsAdmin(true);
        } else {
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
          router.replace('/admin-login');
        }
      } finally {
        setIsVerifying(false);
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
    { href: "/admin", icon: <LayoutDashboard />, label: "Operations Hub" },
    { href: "/admin/sales", icon: <BarChart3 />, label: "Sales & Growth" },
    { href: "/admin/customer-service", icon: <HeadphonesContact />, label: "Customer Service" },
    { href: "/admin/pos", icon: <ShoppingCart />, label: "POS System" },
    { href: "/admin/pre-alerts", icon: <Inbox />, label: "Pre-Alerts" },
    { href: "/admin/shipping", icon: <Truck />, label: "Shipping" },
    { href: "/admin/users", icon: <Users />, label: "Users" },
    { href: "/admin/finance", icon: <DollarSign />, label: "Finance" },
    { href: "/admin/communications", icon: <Mail />, label: "Communications" },
    { href: "/admin/manifests", icon: <Plane />, label: "Manifests" },
    { href: "/admin/migration", icon: <Database />, label: "Migration" },
    { href: "/admin/rates", icon: <Tag />, label: "Rates" },
    { href: "/admin/customs-calculator", icon: <Calculator />, label: "Calculator" },
    { href: "/admin/logs", icon: <History />, label: "Activity Logs" },
    { href: "/admin/settings", icon: <Settings />, label: "Settings" },
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
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6 sticky top-0 z-30 shadow-sm">
            <SidebarTrigger />
            <div className="text-xs font-black tracking-[0.2em] uppercase text-muted-foreground hidden md:block">FSTD Global OS</div>
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
