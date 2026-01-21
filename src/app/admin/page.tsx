
'use client';

import Link from 'next/link';
import {
  Users,
  Inbox,
  Truck,
  ArrowRightCircle,
  Loader2,
  DollarSign,
  Mail,
  Plane,
  Tag,
  Calculator,
  Settings,
} from 'lucide-react';
import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, collection } from 'firebase/firestore';
import type { Shipment, PreAlert, UserProfile } from '@/lib/types';


const StatCard = ({ title, value, icon, color, href }: { title: string, value?: string, icon: React.ReactNode, color: string, href: string }) => {
    return (
        <div className={`${color} rounded-lg text-white p-4 flex flex-col justify-between min-h-[140px] shadow-md`}>
            <div className="flex justify-between items-start relative">
                <div className="flex flex-col z-10 h-full">
                    {value ? (
                        <>
                            <span className="text-4xl font-bold">{value}</span>
                            <p className="font-medium">{title}</p>
                        </>
                    ) : (
                         <p className="font-bold text-xl">{title}</p>
                    )}
                </div>
                <div className="absolute -right-2 -top-2 text-black opacity-20">
                    {icon}
                </div>
            </div>
            <Link href={href} className="text-sm mt-4 bg-black bg-opacity-10 rounded p-1 text-center flex items-center justify-center gap-1 hover:bg-opacity-20 transition-colors z-10">
                View Section <ArrowRightCircle className="h-4 w-4" />
            </Link>
        </div>
    );
};

export default function DashboardPage() {
    const firestore = useFirestore();

    const preAlertsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'pre_alerts'));
    }, [firestore]);
    const { data: preAlerts, isLoading: isLoadingPreAlerts } = useCollection<PreAlert>(preAlertsQuery);

    const shipmentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collectionGroup(firestore, 'shipments'));
    }, [firestore]);
    const { data: shipments, isLoading: isLoadingShipments } = useCollection<Shipment>(shipmentsQuery);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'));
    }, [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    const dashboardItems = useMemo(() => {
        const pendingPreAlerts = preAlerts?.filter(pa => pa.status === 'Pending').length ?? 0;
        const totalShipments = shipments?.length ?? 0;
        const totalUsers = users?.length ?? 0;

        return [
            { title: 'Pending Pre-Alerts', value: pendingPreAlerts.toString(), icon: <Inbox size={80} />, color: 'bg-red-500', href: '/admin/pre-alerts' },
            { title: 'Total Shipments', value: totalShipments.toString(), icon: <Truck size={80} />, color: 'bg-blue-500', href: '/admin/shipping' },
            { title: 'Total Users', value: totalUsers.toString(), icon: <Users size={80} />, color: 'bg-amber-500', href: '/admin/users' },
            { title: 'Finance', icon: <DollarSign size={80} />, color: 'bg-emerald-500', href: '/admin/finance' },
            { title: 'Communications', icon: <Mail size={80} />, color: 'bg-teal-500', href: '/admin/communications' },
            { title: 'Manifests', icon: <Plane size={80} />, color: 'bg-orange-500', href: '/admin/manifests' },
            { title: 'Courier Rates', icon: <Tag size={80} />, color: 'bg-cyan-500', href: '/admin/rates' },
            { title: 'Customs Calculator', icon: <Calculator size={80} />, color: 'bg-purple-500', href: '/admin/customs-calculator' },
            { title: 'Settings', icon: <Settings size={80} />, color: 'bg-slate-500', href: '/admin/settings' },
        ];
    }, [shipments, users, preAlerts]);

    const isLoading = isLoadingPreAlerts || isLoadingShipments || isLoadingUsers;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            </div>
            {isLoading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-[140px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {dashboardItems.map((item) => (
                        <StatCard key={item.title} {...item} />
                    ))}
                </div>
            )}
             <div className="text-center text-muted-foreground text-sm mt-8">
                Copyright © {new Date().getFullYear()} Developed By FromStore2Door. All rights reserved.
            </div>
        </div>
    );
}
