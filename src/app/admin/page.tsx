'use client';
import { Button } from '@/components/ui/button';

import Link from 'next/link';
import { Users, Inbox, Truck, ArrowRightCircle, Loader2, DollarSign, Plane, Tag, Calculator, Settings, TrendingUp, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendChart, StatusPieChart } from '@/components/dashboard-charts';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
    const { supabase } = useSupabase();
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Key Counts
            const [
                { count: pendingPreAlerts },
                { count: activeShipments },
                { count: totalUsers },
                { data: ledgerData },
                { data: statusData },
                { data: volumeData }
            ] = await Promise.all([
                supabase.from('pre_alerts').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
                supabase.from('shipments').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('financial_ledger').select('amount'),
                supabase.from('shipments').select('status'),
                supabase.from('shipments').select('created_at').order('created_at', { ascending: false }).limit(200)
            ]);

            // 2. Process Financials
            const revenue = ledgerData?.filter(l => Number(l.amount) > 0).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const netProfit = ledgerData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            // 3. Process Status Distribution
            const statusMap: Record<string, number> = {};
            statusData?.forEach(s => {
                const label = s.status || 'Unknown';
                statusMap[label] = (statusMap[label] || 0) + 1;
            });
            const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value })).slice(0, 5);

            // 4. Process Volume Trends (Last 7 Days)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const trendMap: Record<string, number> = {};
            const today = new Date();
            for(let i=6; i>=0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                trendMap[days[d.getDay()]] = 0;
            }
            
            volumeData?.forEach(v => {
                const date = new Date(v.created_at);
                const dayLabel = days[date.getDay()];
                if (dayLabel in trendMap) trendMap[dayLabel]++;
            });
            const trendData = Object.entries(trendMap).map(([name, volume]) => ({ name, volume }));

            setStats({
                pendingPreAlerts: pendingPreAlerts || 0,
                activeShipments: activeShipments || 0,
                totalUsers: totalUsers || 0,
                revenue,
                netProfit,
                pieData,
                trendData
            });
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [supabase]);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="grid gap-4 md:grid-cols-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-[400px] rounded-2xl" />
                    <Skeleton className="h-[400px] rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Operations Hub</h1>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1">Live Global Logistics Registry</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-black h-8 px-4">
                        <CheckCircle2 className="h-3 w-3 mr-2" /> System Status: Operational
                    </Badge>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-primary text-primary-foreground">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Package className="h-8 w-8 opacity-20" />
                            <Badge className="bg-white/20 text-white border-none uppercase text-[8px] font-black">Active Ledger</Badge>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Shipments</p>
                        <h3 className="text-5xl font-black italic tracking-tighter">{stats.activeShipments}</h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Inbox className="h-8 w-8 text-orange-500 opacity-20" />
                            <Badge variant="outline" className="uppercase text-[8px] font-black italic">Awaiting Intake</Badge>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Pre-Alerts</p>
                        <h3 className="text-5xl font-black italic tracking-tighter text-orange-500">{stats.pendingPreAlerts}</h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="h-8 w-8 text-indigo-500 opacity-20" />
                            <Badge variant="outline" className="uppercase text-[8px] font-black italic">Global Reach</Badge>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Registered Users</p>
                        <h3 className="text-5xl font-black italic tracking-tighter text-indigo-500">{stats.totalUsers}</h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-zinc-950 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <DollarSign className="h-8 w-8 text-green-400 opacity-20" />
                            <Badge className="bg-green-500/20 text-green-400 border-none uppercase text-[8px] font-black">Settled Registry</Badge>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Universal Revenue</p>
                        <h3 className="text-3xl font-black italic tracking-tighter text-green-400">JMD ${stats.revenue.toLocaleString()}</h3>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts Row */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-8">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 italic">
                            <TrendingUp className="h-5 w-5 text-primary" /> Daily Shipment Velocity
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Inbound and outbound volume over the last 7 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <TrendChart data={stats.trendData} />
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-8">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 italic">
                            <Truck className="h-5 w-5 text-primary" /> Logistics Funnel
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Real-time status distribution across registry.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 flex flex-col items-center justify-center">
                        <StatusPieChart data={stats.pieData} />
                    </CardContent>
                </Card>
            </div>

            {/* Alert / Bottleneck Panel */}
            {stats.pendingPreAlerts > 10 && (
                <Card className="border-4 border-dashed border-orange-200 bg-orange-50 rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8 flex items-center gap-6">
                        <div className="bg-orange-500 p-4 rounded-2xl shadow-lg transform rotate-3">
                            <AlertCircle className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black uppercase italic tracking-tighter text-orange-800 leading-none">Operational Surge Detected</h4>
                            <p className="text-xs font-bold uppercase tracking-widest text-orange-700/60 mt-2">
                                Intake queue is currently at {stats.pendingPreAlerts} items. Authorize processing to prevent dispatch delays.
                            </p>
                        </div>
                        <Button variant="outline" className="ml-auto border-2 border-orange-200 text-orange-700 font-black uppercase italic h-12 px-8" asChild>
                            <Link href="/admin/pre-alerts">Clear Queue</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader><CardTitle className="text-sm font-black uppercase italic">Administrative Shortcuts</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-20 border-2 font-black uppercase italic text-[10px] flex flex-col gap-2" asChild>
                            <Link href="/admin/shipping"><Truck className="h-5 w-5" /> Shipping Ledger</Link>
                        </Button>
                        <Button variant="outline" className="h-20 border-2 font-black uppercase italic text-[10px] flex flex-col gap-2" asChild>
                            <Link href="/admin/finance"><DollarSign className="h-5 w-5" /> Finance Registry</Link>
                        </Button>
                        <Button variant="outline" className="h-20 border-2 font-black uppercase italic text-[10px] flex flex-col gap-2" asChild>
                            <Link href="/admin/manifests"><Plane className="h-5 w-5" /> Manifest Folders</Link>
                        </Button>
                        <Button variant="outline" className="h-20 border-2 font-black uppercase italic text-[10px] flex flex-col gap-2" asChild>
                            <Link href="/admin/users"><Users className="h-5 w-5" /> Account Registry</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-indigo-600 text-white relative group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
                        <Calculator size={180} />
                    </div>
                    <CardHeader className="relative z-10 pt-10 px-10">
                        <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">Landed Cost Tool</CardTitle>
                        <CardDescription className="text-white/60 font-bold uppercase text-[10px]">Official JCA Pricing + S2D Freight Logic</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 p-10 pt-0">
                        <p className="text-sm font-medium leading-relaxed opacity-80 mb-8">
                            Estimate total costs including duty, compliance fees, and administrative charges for high-value items.
                        </p>
                        <Button className="w-full h-14 bg-white text-indigo-600 hover:bg-white/90 font-black uppercase italic shadow-2xl" asChild>
                            <Link href="/admin/customs-calculator">Open Calculator</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="text-center mt-12 text-muted-foreground opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
                System Uplink: SECURE • Database: PostgreSQL • Hub: Logicware v2
            </div>
        </div>
    );
}
