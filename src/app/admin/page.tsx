
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
  TrendingUp,
} from 'lucide-react';
import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, collection } from 'firebase/firestore';
import type { Shipment, PreAlert, UserProfile, Invoice, Transaction } from '@/lib/types';


const StatCard = ({ title, value, icon, color, href }: { title: string, value?: string, icon: React.ReactNode, color: string, href: string }) => {
    return (
        <div className={`${color} rounded-lg text-white p-4 flex flex-col justify-between min-h-[140px] shadow-md relative overflow-hidden group hover:shadow-lg transition-shadow`}>
            <div className="flex justify-between items-start relative">
                <div className="flex flex-col z-10 h-full">
                    {value !== undefined ? (
                        <>
                            <span className="text-4xl font-bold tracking-tight">{value}</span>
                            <p className="font-medium opacity-90 mt-1">{title}</p>
                        </>
                    ) : (
                         <p className="font-bold text-xl">{title}</p>
                    )}
                </div>
                <div className="absolute -right-4 -top-4 text-black opacity-10 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
            <Link href={href} className="text-sm mt-4 bg-black bg-opacity-10 rounded p-1.5 text-center flex items-center justify-center gap-1 hover:bg-opacity-20 transition-colors z-10 font-medium">
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
        return query(collection(firestore, 'users'));
    }, [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

    const invoicesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'invoices'));
    }, [firestore]);
    const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(invoicesQuery);

    const transactionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'transactions'));
    }, [firestore]);
    const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

    const dashboardItems = useMemo(() => {
        const pendingPreAlerts = preAlerts?.filter(pa => pa.status === 'Pending').length ?? 0;
        const totalShipments = shipments?.length ?? 0;
        const totalUsers = users?.length ?? 0;

        // Financial Calculations
        const paidInvoices = invoices?.filter(inv => inv.status === 'Paid') || [];
        const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const manualRevenue = transactions?.filter(t => t.type === 'revenue').reduce((sum, t) => sum + t.amount, 0) || 0;
        const manualExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;

        const totalRevenue = invoiceRevenue + manualRevenue;
        const netProfit = totalRevenue - manualExpenses;

        return [
            { title: 'Pending Pre-Alerts', value: pendingPreAlerts.toString(), icon: <Inbox size={100} />, color: 'bg-red-500', href: '/admin/pre-alerts' },
            { title: 'Total Shipments', value: totalShipments.toString(), icon: <Truck size={100} />, color: 'bg-blue-500', href: '/admin/shipping' },
            { title: 'Total Users', value: totalUsers.toString(), icon: <Users size={100} />, color: 'bg-amber-500', href: '/admin/users' },
            { title: 'Total Revenue (JMD)', value: `JMD $${totalRevenue.toLocaleString()}`, icon: <TrendingUp size={100} />, color: 'bg-emerald-500', href: '/admin/finance' },
            { title: 'Net Profit (JMD)', value: `JMD $${netProfit.toLocaleString()}`, icon: <DollarSign size={100} />, color: 'bg-cyan-500', href: '/admin/finance' },
            { title: 'Communications', icon: <Mail size={100} />, color: 'bg-teal-500', href: '/admin/communications' },
            { title: 'Flight Manifests', icon: <Plane size={100} />, color: 'bg-orange-500', href: '/admin/manifests' },
            { title: 'Courier Rates', icon: <Tag size={100} />, color: 'bg-indigo-500', href: '/admin/rates' },
            { title: 'Customs Calculator', icon: <Calculator size={100} />, color: 'bg-purple-500', href: '/admin/customs-calculator' },
            { title: 'Settings', icon: <Settings size={100} />, color: 'bg-slate-500', href: '/admin/settings' },
        ];
    }, [shipments, users, preAlerts, invoices, transactions]);

    const isLoading = isLoadingPreAlerts || isLoadingShipments || isLoadingUsers || isLoadingInvoices || isLoadingTransactions;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-1">Real-time statistics and management shortcuts.</p>
            </div>
            {isLoading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(10)].map((_, i) => (
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
             <div className="text-center text-muted-foreground text-sm mt-12 border-t pt-6">
                Copyright © {new Date().getFullYear()} Developed By FromStore2Door. All rights reserved.
            </div>
        </div>
    );
}
