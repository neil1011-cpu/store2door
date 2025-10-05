
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
        <div className="flex h-screen w-screen">
            <div className="hidden md:flex flex-col gap-4 border-r p-2">
                <Skeleton className="h-10 w-48" />
                <div className="flex flex-col gap-2 flex-1 p-2">
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
                <Skeleton className="h-10 w-48" />
            </div>
            <div className="flex-1 p-6">
                 <div className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-5 w-80" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-96 w-full" />
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
    // When auth is done loading, check if there's no user or the user is not an admin
    if (!isUserLoading && (!user || user.email !== ADMIN_EMAIL)) {
      // If not the admin, redirect to home page
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  // While loading, show the skeleton. Let the useEffect handle redirection.
  if (isUserLoading) {
    return <AdminLoadingSkeleton />;
  }

  // If the user is loaded but is not the correct admin, they will be redirected by the effect.
  // Render the children only if the user is the authenticated admin.
  // This prevents a brief flash of the admin content for non-admin users.
  if (!user || user.email !== ADMIN_EMAIL) {
    // Render a loading state or nothing while redirection happens
    return <AdminLoadingSkeleton />;
  }

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
