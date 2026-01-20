
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
  SidebarInput,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Search,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    () => {
      if (!firestore || !user) return null;
      return doc(firestore, 'roles_admin', user.uid);
    },
    [firestore, user]
  );

  const {
    data: adminRoleDoc,
    isLoading: isAdminLoading,
  } = useDoc(adminRoleRef, { skipCache: true });

  // Redirect once the admin doc has finished loading and does NOT exist
  useEffect(() => {
    if (isAdminLoading) return;

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
  
  // If the admin doc doesn't exist after loading, render nothing.
  // The useEffect above is already handling the redirect.
  // This prevents child components from rendering prematurely.
  if (!adminRoleDoc) {
    return null;
  }

  // Only render children if the admin role is confirmed.
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
  const pathname = usePathname();

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
  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Loading...</span>
      </div>
    );
  }

  const sidebarLinks = [
    { href: "/admin", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/admin/settings", icon: <Building2 />, label: "Branch List" },
    { href: "/admin/users", icon: <Users />, label: "Branch Staff" },
    { href: "/admin/shipping", icon: <Package />, label: "Parcels" },
    { href: "/admin/shipping", icon: <Search />, label: "Track Parcels" }, // The screenshot's track parcels might be internal. Shipping is closest.
    { href: "/admin/settings", icon: <Settings />, label: "System Setting" },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-2">
           <div className="flex items-center gap-2 p-2 rounded-lg">
                <Avatar className="size-9">
                    <AvatarImage src={user.photoURL || undefined} alt="Admin avatar" />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-sm overflow-hidden">
                    <div className="font-semibold text-sidebar-foreground truncate">{user.displayName || 'Bishwagit Das'}</div>
                    <div className="text-sidebar-foreground/80 truncate">{user.email}</div>
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent>
           <div className="p-2">
               <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
                   <SidebarInput placeholder="Search..." className="pl-9 h-9" />
               </div>
           </div>
          <SidebarMenu>
            {sidebarLinks.map((link, index) => (
                 <SidebarMenuItem key={index}>
                    <SidebarMenuButton asChild isActive={pathname === link.href} variant={pathname === link.href ? 'default' : 'ghost'} className="data-[active=true]:bg-sidebar-accent justify-start">
                        <Link href={link.href}>
                            {link.icon}
                            {link.label}
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
              <SidebarMenuItem>
                 <SidebarMenuButton variant="ghost" onClick={handleSignOut}>
                    <LogOut />
                    Logout
                 </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <div className="text-sm text-muted-foreground">Home</div>
          <div className="flex-1" />
           <Button variant="ghost" size="icon">
                <Search className="h-5 w-5"/>
           </Button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gray-100 dark:bg-zinc-800/50">
          <AdminAuthGuard>{children}</AdminAuthGuard>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
