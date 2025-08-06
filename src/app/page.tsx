
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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

type Activity = {
  id: string;
  type: 'user' | 'alert';
  text: string;
  date: string;
  timestamp: Date;
};

export default function DashboardPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const usersCollection = collection(db, 'users');
        const usersQuery = query(usersCollection, orderBy('mailboxNumber', 'desc'), limit(3));
        const usersSnapshot = await getDocs(usersQuery);
        const usersActivities = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: 'user' as const,
                text: `${data.name} was added as a new user.`,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                 // Using a placeholder date for now, will be fixed when a timestamp is added to user data
                timestamp: new Date(2024, 6, 30),
            }
        });

        // Placeholder for pre-alerts until it's connected to Firestore
        const preAlertsActivities: Activity[] = [
            {
                id: '1',
                type: 'alert',
                text: 'New pre-alert from John Doe (JM456).',
                date: 'Jul 29',
                timestamp: new Date(2024, 6, 29)
            },
            {
                id: '2',
                type: 'alert',
                text: 'New pre-alert from Jane Smith (JM789).',
                date: 'Jul 28',
                timestamp: new Date(2024, 6, 28)
            }
        ];
        
        const combinedActivities = [...usersActivities, ...preAlertsActivities];
        combinedActivities.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setActivities(combinedActivities.slice(0, 5));

      } catch (error) {
        console.error("Error fetching activities: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const renderIcon = (type: 'user' | 'alert') => {
    switch(type) {
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'alert':
        return <Bell className="h-4 w-4" />;
      default:
        return null;
    }
  }


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
            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <p className="text-sm text-muted-foreground">Loading activity...</p>
                </div>
            ) : activities.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
                    <p className="text-sm text-muted-foreground">
                    No recent activity to show.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activities.map(activity => (
                        <div key={activity.id} className="flex items-center gap-4">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {renderIcon(activity.type)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="text-sm">{activity.text}</p>
                            </div>
                            <time className="text-sm text-muted-foreground">{activity.date}</time>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
