import type { Metadata } from 'next';
import './globals.css';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'SwiftRoute',
  description: 'Backend for a shipping/courier service website.',
};

const AppLogo = () => (
  <div className="flex items-center gap-2 px-2">
    <Route className="size-6 text-primary" />
    <h1 className="text-lg font-bold text-primary-foreground">SwiftRoute</h1>
  </div>
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-body antialiased">
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
                    <Link href="/">
                      <LayoutDashboard />
                      Dashboard
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="AI Pre-Alerts">
                    <Link href="/pre-alerts">
                      <ScanText />
                      AI Pre-Alerts
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Shipping Status">
                    <Link href="/shipping">
                      <Truck />
                      Shipping Status
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Flight Manifests">
                    <Link href="/manifests">
                      <FileText />
                      Flight Manifests
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Profit/Loss">
                    <Link href="/finance">
                      <Banknote />
                      Profit/Loss
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Users">
                    <Link href="/users">
                      <Users />
                      Users
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Settings">
                    <Link href="#">
                      <Settings />
                      Settings
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Account">
                    <Link href="#">
                       <Avatar className="size-7">
                        <AvatarImage src="https://placehold.co/40x40" alt="User avatar" />
                        <AvatarFallback>SR</AvatarFallback>
                      </Avatar>
                      <span>Admin User</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
              <SidebarTrigger className="hidden md:flex" />
              <div className="flex-1">
                {/* Header content can go here */}
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
               <Avatar>
                  <AvatarImage src="https://placehold.co/40x40" alt="User avatar" />
                  <AvatarFallback>SR</AvatarFallback>
                </Avatar>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}

import { Toaster } from "@/components/ui/toaster"
