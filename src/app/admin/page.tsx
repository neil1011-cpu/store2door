'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ScanText,
  Truck,
  FileText,
  Banknote,
  ArrowRight,
  Users,
  Bell,
  DollarSign,
  Settings,
  Calculator,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

const features = [
  {
    title: 'Pre-Alerts',
    description: 'View and process incoming package alerts.',
    icon: <ScanText className="h-8 w-8 text-primary" />,
    href: '/admin/pre-alerts',
  },
  {
    title: 'Shipping Status',
    description: 'Track and update all shipments.',
    icon: <Truck className="h-8 w-8 text-primary" />,
    href: '/admin/shipping',
  },
  {
    title: 'Flight Manifests',
    description: 'Manage and view flight manifest documents.',
    icon: <FileText className="h-8 w-8 text-primary" />,
    href: '/admin/manifests',
  },
  {
    title: 'Communications',
    description: 'Manage customer messages and send emails.',
    icon: <Megaphone className="h-8 w-8 text-primary" />,
    href: '/admin/communications',
  },
  {
    title: 'Notifications',
    description: 'View system and warehouse notifications.',
    icon: <Bell className="h-8 w-8 text-primary" />,
    href: '/admin/notifications',
  },
  {
    title: 'Finance & Invoices',
    description: 'View financial statements and manage invoices.',
    icon: <Banknote className="h-8 w-8 text-primary" />,
    href: '/admin/finance',
  },
  {
    title: 'Users',
    description: 'Manage users and their addresses.',
    icon: <Users className="h-8 w-8 text-primary" />,
    href: '/admin/users',
  },
  {
    title: 'Courier Rates',
    description: 'Manage your shipping rates.',
    icon: <DollarSign className="h-8 w-8 text-primary" />,
    href: '/admin/rates',
  },
  {
    title: 'Customs Calculator',
    description: 'Estimate customs fees.',
    icon: <Calculator className="h-8 w-8 text-primary" />,
    href: '/admin/customs-calculator',
  },
  {
    title: 'Settings',
    description: 'Manage application settings.',
    icon: <Settings className="h-8 w-8 text-primary" />,
    href: '/admin/settings',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Firebase authentication
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Build admin doc reference only when user exists
  const adminRef = useMemoFirebase(
    () => (user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );

  const { data: adminDoc, isLoading: isAdminLoading } = useDoc(adminRef);

  // Handle authentication + authorization
  useEffect(() => {
    if (isUserLoading || isAdminLoading) return;

    // Not logged in
    if (!user) {
      router.replace('/admin-login');
      return;
    }

    // Logged in but not admin
    if (!adminDoc) {
      toast({
        title: 'Access Denied',
        description: "You don't have admin permissions.",
        variant: 'destructive',
      });
      router.replace('/admin-login');
    }
  }, [isUserLoading, isAdminLoading, user, adminDoc, router, toast]);

  // Global loading screen until Firebase finishes checking
  if (isUserLoading || isAdminLoading || !user || !adminDoc) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-4">Loading admin dashboard...</span>
      </div>
    );
  }

  // User + Admin confirmed → show dashboard
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          FromStore2Door Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Your all-in-one solution for courier management.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {features.map((feature) => (
          <Link href={feature.href} key={feature.title} className="block">
            <Card className="group h-full transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {feature.title}
                </CardTitle>
                {feature.icon}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
