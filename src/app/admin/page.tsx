
'use client';

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
  Inbox,
  Receipt,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Pre-Alerts',
    description: 'Generate delivery address from a receipt image.',
    icon: <ScanText className="h-8 w-8 text-primary" />,
    href: '/admin/pre-alerts',
  },
  {
    title: 'Shipping Status',
    description: 'Track your shipments in real-time.',
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
    title: 'Invoices',
    description: 'Create and manage customer invoices.',
    icon: <Receipt className="h-8 w-8 text-primary" />,
    href: '/admin/invoices',
  },
  {
    title: 'Messages',
    description: 'View messages from customers.',
    icon: <Inbox className="h-8 w-8 text-primary" />,
    href: '/admin/messages',
  },
   {
    title: 'Promotions',
    description: 'Send marketing emails to customers.',
    icon: <Megaphone className="h-8 w-8 text-primary" />,
    href: '/admin/promotions',
  },
  {
    title: 'Notifications',
    description: 'View system and warehouse notifications.',
    icon: <Bell className="h-8 w-8 text-primary" />,
    href: '/admin/notifications',
  },
  {
    title: 'Profit/Loss',
    description: 'View your financial statements.',
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
  }
];

export default function DashboardPage() {

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
          <Card
            key={feature.title}
            className="group transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {feature.title}
              </CardTitle>
              {feature.icon}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {feature.description}
              </p>
              <Button
                variant="link"
                className="mt-4 p-0"
                asChild
              >
                <Link href={feature.href}>
                  Go to {feature.title} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
