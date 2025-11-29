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
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

const AppLogo = () => (
  <div className="flex items-center gap-2 px-2">
    <Route className="size-6 text-primary" />
    <h1 className="text-lg font-bold">FromStore2Door</h1>
  </div>
);

// Guard that assumes a user already exists (Auth is done in AdminLayout)
function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // If for some reason user is missing, don't even try to load admin doc
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Redirecting to login...</span>
      </div>
    );
  }

  // Build the doc ref only when user is present
  const adminRoleRef = useMemoFirebase(
    () => doc(firestore, 'roles_admin', user.uid),
    [firestore, user.uid],
  );

  // CRITICAL FIX: Use skipCache to ensure we get the latest data from the server,
  // preventing a false negative from a stale cache right after login.
  const {
    data: adminRoleDoc,
    isLoading: isAdminLoading,
  } = useDoc(adminRoleRef, { skipCache: true });

  // Redirect once the admin doc has finished loading and does NOT exist
  useEffect(() => {
    if (isAdminLoading) return;

    // Finished loading and no admin role doc => not an admin
    if (!adminRoleDoc) {
      toast({
        title: 'Access denied',
        description: "You don't have permission to access the admin panel.",
        variant: 'destructive',
      });

      router.replace('/admin-login');
    }
  }, [isAdminLoading, adminRoleDoc, router, toast]);

  // While we're still checking admin status, show a loader
  if (isAdminLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Verifying admin privileges...</span>
      </div>
    );
  }

  // At this point, loading is done:
  // - If adminRoleDoc exists => admin, allow access
  // - If it doesn't, the effect above is firing a redirect and we render nothing here
  if (!adminRoleDoc) {
    // Avoid flicker while redirect happens
    return null;
  }

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

  // If auth has finished and there is no user, go to admin-login
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/admin-login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
      router.replace('/admin-login');
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  // Global auth loading: don't show layout until Firebase Auth is done
  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Authenticating...</span>
      </div>
    );
  }

  // No user after auth resolved: the effect above is redirecting, we render a minimal fallback
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Redirecting to login...</span>
      </div>
    );
  }

  // Auth ok; now we render the layout and let AdminAuthGuard handle admin role
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
          <div className="flex-1" />
          <Notifications />
          <Avatar>
            <AvatarImage src={user.photoURL || undefined} alt="Admin avatar" />
            <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <AdminAuthGuard>{children}</AdminAuthGuard>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
