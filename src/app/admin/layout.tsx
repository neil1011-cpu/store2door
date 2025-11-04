
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
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Notifications } from '@/components/notifications';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


const AppLogo = () => (
  <div className="flex items-center gap-2 px-2">
    <Route className="size-6 text-primary" />
    <h1 className="text-lg font-bold">FromStore2Door</h1>
  </div>
);


export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
      if (!isAdminLoggedIn) {
        router.push('/admin-login');
      }
    } catch (error) {
      console.error('Could not access local storage', error);
      router.push('/admin-login');
    }
  }, [router, pathname]);
  
  const handleSignOut = () => {
    try {
        localStorage.removeItem('isAdminLoggedIn');
        toast({
            title: 'Signed Out',
            description: 'You have been successfully signed out.',
        });
        router.push('/admin-login');
    } catch (error) {
        toast({
            title: 'Sign Out Failed',
            description: 'Something went wrong.',
            variant: 'destructive'
        })
    }
  }

  if (!isClient) {
    return (
         <div className="flex h-screen">
            <Skeleton className="w-64" />
            <div className="flex-1 p-6">
                <Skeleton className="h-12 w-1/2 mb-6" />
                <Skeleton className="h-96" />
            </div>
        </div>
    );
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
                <SidebarFooter className="space-y-1">
                    <SidebarMenuButton>
                        <Avatar className="size-7">
                        <AvatarImage src={"https://placehold.co/40x40"} alt="User avatar" />
                        <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <span>Admin User</span>
                    </SidebarMenuButton>
                     <SidebarMenuButton variant="ghost" size="sm" onClick={handleSignOut}>
                        <LogOut />
                        Sign Out
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
                <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
  );
}
