
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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';

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
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const adminRoleRef = useMemoFirebase(() => user ? doc(firestore, 'roles_admin', user.uid) : null, [firestore, user]);
  const { data: adminRoleDoc, isLoading: isAdminLoading } = useDoc(adminRoleRef);
  
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Wait until both user and admin role checks are complete
    if (isUserLoading || isAdminLoading) {
      return;
    }
    
    setAuthChecked(true); // Mark that we have definitive auth state

    if (!user) {
      // If there's no user, redirect to login
      router.push('/admin-login');
    } else if (!adminRoleDoc) {
      // If there is a user but they don't have an admin role doc, deny access
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access the admin panel.",
        variant: 'destructive'
      });
      signOut(auth);
      router.push('/admin-login');
    }
    
    // If user exists and adminRoleDoc exists, the layout will render the children
  }, [user, isUserLoading, adminRoleDoc, isAdminLoading, router, toast, auth]);

  
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

  // Show skeleton loader until we have a definitive answer on auth status
  if (!authChecked) {
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

  // If checks are complete and we have a user and an admin role, render the layout
  if (user && adminRoleDoc) {
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
                          <AvatarImage src={user?.photoURL || undefined} alt="Admin avatar" />
                          <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{user?.displayName || 'Admin'}</span>
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
                      <AvatarImage src={user?.photoURL || undefined} alt="Admin avatar" />
                      <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  </header>
                  <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                  {children}
                  </main>
              </SidebarInset>
          </SidebarProvider>
    );
  }

  // If auth checks are done but user is not a valid admin, this will render null while redirecting.
  return null;
}
