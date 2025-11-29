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
  Users,
  Bell,
  DollarSign,
  Settings,
  Calculator,
  Megaphone,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Notifications } from '@/components/notifications';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

const AppLogo = () => (
  <div className="flex items-center gap-2 px-2">
    <Route className="size-6 text-primary" />
    <h1 className="text-lg font-bold">FromStore2Door</h1>
  </div>
);

function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useUser(); // User is guaranteed to exist by the time this component renders
  const firestore = useFirestore();
  const { toast } = useToast();

  const adminRoleRef = useMemoFirebase(() => user ? doc(firestore, 'roles_admin', user.uid) : null, [firestore, user]);
  const { data: adminRoleDoc, isLoading: isAdminLoading } = useDoc(adminRoleRef);
  
  useEffect(() => {
    // Wait until the loading of the admin role document is complete
    if (isAdminLoading) {
      return;
    }

    // If, after loading, the admin document does not exist, redirect.
    if (!adminRoleDoc) {
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access the admin panel.",
        variant: 'destructive',
      });
      router.push('/admin-login');
    }
  }, [adminRoleDoc, isAdminLoading, router, toast]);

  // While we check for the admin role, show a loader.
  if (isAdminLoading || !adminRoleDoc) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Verifying admin privileges...</span>
      </div>
    );
  }

  // If all checks pass, render the protected admin content.
  return <>{children}</>;
}


export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  
  useEffect(() => {
    // This effect only handles the case where the user is definitively not logged in *after* loading is complete.
    if (!isUserLoading && !user) {
      router.push('/admin-login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    try {
        await signOut(auth);
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
  
  // Primary loading state: wait for Firebase Auth to determine if a user is logged in.
  if (isUserLoading) {
    return (
         <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
             <span className="ml-4">Authenticating...</span>
        </div>
    );
  }
  
  // If there's no user after loading, the useEffect above will trigger a redirect.
  // We can return null or a loader here as a fallback.
  if (!user) {
     return (
         <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
             <span className="ml-4">Redirecting to login...</span>
        </div>
    );
  }

  // If a user is logged in, render the main layout, which includes the AdminAuthGuard.
  // The guard will then handle the next step of authorization.
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
                    <AvatarImage src={user.photoURL || undefined} alt="Admin avatar" />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{user.displayName || 'Admin'}</span>
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
                <AvatarImage src={user.photoURL || undefined} alt="Admin avatar" />
                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
              <AdminAuthGuard>
                {children}
              </AdminAuthGuard>
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
