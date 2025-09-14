
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AppLogo = () => (
  <div className="flex items-center gap-2 px-2">
    <Route className="size-6 text-primary" />
    <h1 className="text-lg font-bold text-primary-foreground">SwiftRoute</h1>
  </div>
);


export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                    <SidebarMenuButton asChild tooltip="Profit/Loss">
                        <Link href="/admin/finance">
                        <Banknote />
                        Profit/Loss
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
                        <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <span>Guest User</span>
                    </SidebarMenuButton>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
                <SidebarTrigger className="hidden md:flex" />
                <div className="flex-1">
                    {/* Header content can go here */}
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <div className="flex items-center gap-2">
                        <ScanText className="h-4 w-4" />
                        <span>New pre-alert from John Doe (JM456)</span>
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <div className="flex items-center gap-2">
                        <ScanText className="h-4 w-4" />
                        <span>New pre-alert from Jane Smith (JM789)</span>
                        </div>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Avatar>
                    <AvatarImage src={"https://placehold.co/40x40"} alt="User avatar" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-6">
                {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
  );
}
