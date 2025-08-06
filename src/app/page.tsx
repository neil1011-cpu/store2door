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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Pre-Alerts',
    description: 'Generate delivery address from a receipt image.',
    icon: <ScanText className="h-8 w-8 text-primary" />,
    href: '/pre-alerts',
  },
  {
    title: 'Shipping Status',
    description: 'Track your shipments in real-time.',
    icon: <Truck className="h-8 w-8 text-primary" />,
    href: '/shipping',
  },
  {
    title: 'Flight Manifests',
    description: 'Manage and view flight manifest documents.',
    icon: <FileText className="h-8 w-8 text-primary" />,
    href: '/manifests',
  },
  {
    title: 'Profit/Loss',
    description: 'View your financial statements.',
    icon: <Banknote className="h-8 w-8 text-primary" />,
    href: '/finance',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          From Store 2 Door Admin Panel
        </h1>
        <p className="text-muted-foreground">
          Your all-in-one solution for courier management.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            An overview of the latest events in your system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-sm text-muted-foreground">
              No recent activity to show.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
