'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  LogOut,
  Loader2,
  Inbox,
  Truck,
  DollarSign,
  Mail,
  Plane,
  Tag,
  Calculator,
  Bell,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Notifications } from '@/components/notifications';
import { ThemeToggle } from '@/components/theme-toggle';

function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const adminRoleRef = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;
      return doc(firestore, 'admin_roles', user.uid);
    },
    [firestore, user]
  );

  const {
    data: adminRoleDoc,
    isLoading: isAdminLoading,
  } = useDoc(adminRoleRef);

  useEffect(() => {
    // Only proceed once loading for both user and admin role is complete
    if (isUserLoading || isAdminLoading) return;

    if (!user) {
      router.replace('/admin-login');
      return;
    }

    // If the database has loaded and the admin role document is definitively missing
    // we use !adminRoleDoc to check for existence
    if (adminRoleRef && !adminRoleDoc) {
        toast({
          title: 'Access Denied',
          description: "Administrator privileges required for this area. Use the recovery tool if needed.",
          variant: 'destructive',
        });
        router.replace('/admin-login');
    }
  }, [isUserLoading, isAdminLoading, adminRoleDoc, adminRoleRef, router, toast, user]);

  // Show persistent loader until authorization check is complete
  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Authorizing Admin Session...</p>
      </div>
    );
  }
  
  // Only render children if user is authenticated and admin role is verified
  if (!user || !adminRoleDoc) return null;

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/admin-login');
  };

  const sidebarLinks = [
    { href: "/admin", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/admin/pre-alerts", icon: <Inbox />, label: "Pre-Alerts" },
    { href: "/admin/shipping", icon: <Truck />, label: "Shipping" },
    { href: "/admin/users", icon: <Users />, label: "Users" },
    { href: "/admin/finance", icon: <DollarSign />, label: "Finance" },
    { href: "/admin/communications", icon: <Mail />, label: "Communications" },
    { href: "/admin/manifests", icon: <Plane />, label: "Manifests" },
    { href: "/admin/rates", icon: <Tag />, label: "Rates" },
    { href: "/admin/customs-calculator", icon: <Calculator />, label: "Calculator" },
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
                      <AvatarImage src={user?.photoURL || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                  <div className="text-sm overflow-hidden">
                      <div className="font-bold truncate">{user?.displayName || 'Admin'}</div>
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
              <SidebarMenu>
                  <SidebarMenuItem>
                     <SidebarMenuButton variant="outline" onClick={handleSignOut} className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                     </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border mx-2 hidden md:block" />
            <div className="text-sm font-bold tracking-tight uppercase text-muted-foreground hidden md:block">
              FromStore2Door Admin
            </div>
            <div className="flex-1" />
             <ThemeToggle />
             <Notifications />
          </header>
          <main className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
