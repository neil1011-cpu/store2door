
'use client';

import Link from 'next/link';
import {
  Building2,
  Package,
  Users,
  Inbox,
  CheckSquare,
  Truck,
  PackageCheck,
  Archive,
  ArrowRightCircle,
  Loader2,
} from 'lucide-react';
import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';
import type { Shipment, PreAlert, UserProfile } from '@/lib/types';


const StatCard = ({ title, value, icon, color, href }: { title: string, value: string, icon: React.ReactNode, color: string, href: string }) => {
    return (
        <div className={`${color} rounded-lg text-white p-4 flex flex-col justify-between min-h-[140px] shadow-md`}>
            <div className="flex justify-between items-start relative">
                <div className="flex flex-col z-10">
                    <span className="text-4xl font-bold">{value}</span>
                    <p className="font-medium">{title}</p>
                </div>
                <div className="absolute -right-2 -top-2 text-black opacity-20">
                    {icon}
                </div>
            </div>
            <Link href={href} className="text-sm mt-4 bg-black bg-opacity-10 rounded p-1 text-center flex items-center justify-center gap-1 hover:bg-opacity-20 transition-colors z-10">
                More info <ArrowRightCircle className="h-4 w-4" />
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
        // This is not a collection group, it is a root collection
        return query(collection(firestore, 'users'));
    }, [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    const stats = useMemo(() => {
        const totalParcels = shipments?.length ?? 0;
        const totalStaff = 1; // Simplified, as admin roles are complex to query here.
        const itemsAccepted = preAlerts?.filter(pa => pa.status === 'Pending').length ?? 0;
        const collected = shipments?.filter(s => s.status === 'Processed').length ?? 0;
        const shipped = shipments?.filter(s => s.status === 'In Transit').length ?? 0;
        const delivered = shipments?.filter(s => s.status === 'Delivered').length ?? 0;

        return [
            { title: 'Total Branch', value: '1', icon: <Building2 size={80} />, color: 'bg-cyan-500', href: '/admin/settings' },
            { title: 'Total Parcel', value: totalParcels.toString(), icon: <Package size={80} />, color: 'bg-emerald-500', href: '/admin/shipping' },
            { title: 'Total Staff', value: totalStaff.toString(), icon: <Users size={80} />, color: 'bg-amber-500', href: '/admin/users' },
            { title: 'Item Accepted By Courier', value: itemsAccepted.toString(), icon: <Inbox size={80} />, color: 'bg-red-500', href: '/admin/pre-alerts' },
            { title: 'Collected', value: collected.toString(), icon: <CheckSquare size={80} />, color: 'bg-blue-500', href: '/admin/shipping' },
            { title: 'Shipped', value: shipped.toString(), icon: <Truck size={80} />, color: 'bg-red-600', href: '/admin/shipping' },
            { title: 'Delivered', value: delivered.toString(), icon: <PackageCheck size={80} />, color: 'bg-teal-500', href: '/admin/shipping' },
            { title: 'Pickup', value: '0', icon: <Archive size={80} />, color: 'bg-green-600', href: '#' },
        ];
    }, [shipments, users, preAlerts]);

    const isLoading = isLoadingPreAlerts || isLoadingShipments || isLoadingUsers;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            </div>
            {isLoading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-[140px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <StatCard key={stat.title} {...stat} />
                    ))}
                </div>
            )}
             <div className="text-center text-muted-foreground text-sm mt-8">
                Copyright © {new Date().getFullYear()} Developed By FromStore2Door. All rights reserved.
            </div>
        </div>
    );
}
