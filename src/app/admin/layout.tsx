
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
  ScanText,
  Truck,
  FileText,
  Banknote,
  Route,
  User,
  Settings,
  Users,
  Bell,
  DollarSign,
  Calculator,
  Megaphone,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Notifications } from '@/components/notifications';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const AppLogo = () => (
  <div className="flex items-center gap-2 px-2">
    <Route className="size-6 text-primary" />
    <h1 className="text-lg font-bold">FromStore2Door</h1>
  </div>
);

function AdminLoadingSkeleton() {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying admin access...</p>
            </div>
        </div>
    )
}

const ADMIN_EMAIL = 'admin@example.com';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If the authentication state is still loading, do nothing yet.
    if (isUserLoading) {
      return;
    }

    // After loading, if there's no user or the user is not the admin, redirect.
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  // While loading, or if the user is not the admin, show a loading/secure screen.
  // This prevents any child components from attempting to render and fetch data.
  if (isUserLoading || !user || user.email !== ADMIN_EMAIL) {
    return <AdminLoadingSkeleton />;
  }

  // If the checks pass, render the admin layout.
  return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                <div className="flex items-center justify-between">
                    <AppLogo />
                    <SidebarTrigger className="md:hidden" />
                </div>
                </SidebarHeader>
                <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Dashboard">
                        <Link href="/admin">
                        <LayoutDashboard />
                        Dashboard
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Pre-Alerts" size="sm">
                        <Link href="/admin/pre-alerts">
                        <ScanText />
                        Pre-Alerts
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Shipping Status" size="sm">
                        <Link href="/admin/shipping">
                        <Truck />
                        Shipping Status
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Flight Manifests" size="sm">
                        <Link href="/admin/manifests">
                        <FileText />
                        Flight Manifests
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Communications" size="sm">
                        <Link href="/admin/communications">
                        <Megaphone />
                        Communications
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Notifications" size="sm">
                        <Link href="/admin/notifications">
                        <Bell />
                        Notifications
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Finance">
                        <Link href="/admin/finance">
                        <Banknote />
                        Finance
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Courier Rates">
                        <Link href="/admin/rates">
                        <DollarSign />
                        Courier Rates
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Customs Calculator">
                        <Link href="/admin/customs-calculator">
                        <Calculator />
                        Customs Calculator
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Users">
                        <Link href="/admin/users">
                        <Users />
                        Users
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Settings">
                        <Link href="/admin/settings">
                        <Settings />
                        Settings
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenuButton>
                        <Avatar className="size-7">
                        <AvatarImage src={"https://placehold.co/40x40"} alt="User avatar" />
                        <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <span>Admin User</span>
                    </SidebarMenuButton>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
                <SidebarTrigger className="hidden md:flex" />
                <div className="flex-1">
                    {/* Header content can go here */}
                </div>
                
                <Notifications />

                <Avatar>
                    <AvatarImage src={"https://placehold.co/40x40"} alt="User avatar" />
                    <AvatarFallback>A</AvatarFallback>
                </Avatar>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-6">
                {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
  );
}
