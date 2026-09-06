
'use client';

import Link from 'next/link';
import { Users, Inbox, Truck, ArrowRightCircle, Loader2, DollarSign, Plane, Tag, Calculator, Settings, TrendingUp } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { useSupabase } from '@/components/supabase-provider';

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
    const { supabase } = useSupabase();
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const [
                { count: pendingPreAlerts },
                { count: totalShipments },
                { count: totalUsers },
                { data: ledgerData }
            ] = await Promise.all([
                supabase.from('pre_alerts').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
                supabase.from('shipments').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('financial_ledger').select('amount')
            ]);

            const revenue = ledgerData?.filter(l => Number(l.amount) > 0).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const netProfit = ledgerData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            setStats({
                pendingPreAlerts: pendingPreAlerts || 0,
                totalShipments: totalShipments || 0,
                totalUsers: totalUsers || 0,
                revenue,
                netProfit
            });
            setIsLoading(false);
        };
        fetchStats();
    }, [supabase]);

    const dashboardItems = useMemo(() => {
        if (!stats) return [];
        return [
            { title: 'Pending Pre-Alerts', value: stats.pendingPreAlerts.toString(), icon: <Inbox size={100} />, color: 'bg-red-500', href: '/admin/pre-alerts' },
            { title: 'Total Shipments', value: stats.totalShipments.toString(), icon: <Truck size={100} />, color: 'bg-blue-500', href: '/admin/shipping' },
            { title: 'Total Users', value: stats.totalUsers.toString(), icon: <Users size={100} />, color: 'bg-amber-500', href: '/admin/users' },
            { title: 'Total Revenue', value: `JMD $${stats.revenue.toLocaleString()}`, icon: <TrendingUp size={100} />, color: 'bg-emerald-500', href: '/admin/finance' },
            { title: 'Net Ledger Standing', value: `JMD $${stats.netProfit.toLocaleString()}`, icon: <DollarSign size={100} />, color: 'bg-cyan-500', href: '/admin/finance' },
            { title: 'Flight Manifests', icon: <Plane size={100} />, color: 'bg-orange-500', href: '/admin/manifests' },
            { title: 'Courier Rates', icon: <Tag size={100} />, color: 'bg-indigo-500', href: '/admin/rates' },
            { title: 'Customs Calculator', icon: <Calculator size={100} />, color: 'bg-purple-500', href: '/admin/customs-calculator' },
            { title: 'Settings', icon: <Settings size={100} />, color: 'bg-slate-500', href: '/admin/settings' },
        ];
    }, [stats]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-1">Real-time statistics from Supabase PostgreSQL.</p>
            </div>
            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10" /></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {dashboardItems.map((item) => (
                        <StatCard key={item.title} {...item} />
                    ))}
                </div>
            )}
            <div className="text-center text-muted-foreground text-sm mt-12 border-t pt-6 opacity-40 uppercase font-bold tracking-widest">
                System Status: CUTOVER COMPLETE • ARCHIVAL FALLBACK READY
            </div>
        </div>
    );
}
