'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabase } from '@/components/supabase-provider';
import { RevenueBarChart } from '@/components/dashboard-charts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Package, TrendingUp, ArrowUpRight, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SalesDashboardPage() {
    const { supabase } = useSupabase();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchSalesData = async () => {
        setIsLoading(true);
        try {
            const [
                { data: ledgerData },
                { data: userData },
                { count: shipmentCount },
                { data: topCustomers }
            ] = await Promise.all([
                supabase.from('financial_ledger').select('*').gt('amount', 0),
                supabase.from('profiles').select('created_at'),
                supabase.from('shipments').select('*', { count: 'exact', head: true }),
                supabase.from('shipments').select('profile_id, profiles(full_name, mailbox_number)')
            ]);

            // Monthly Revenue
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const revMap: Record<string, number> = {};
            ledgerData?.forEach(l => {
                const m = months[new Date(l.transaction_date).getMonth()];
                revMap[m] = (revMap[m] || 0) + Number(l.amount);
            });
            const revenueTrend = months.map(m => ({ month: m, revenue: revMap[m] || 0 }));

            // Customer Growth
            const regMap: Record<string, number> = {};
            userData?.forEach(u => {
                const m = months[new Date(u.created_at).getMonth()];
                regMap[m] = (regMap[m] || 0) + 1;
            });
            const registrationTrend = months.map(m => ({ month: m, count: regMap[m] || 0 }));

            // Top Customers (Mock logic based on shipment association)
            const custMap: Record<string, any> = {};
            topCustomers?.forEach(s => {
                const id = s.profile_id;
                const prof: any = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                if (!custMap[id]) custMap[id] = { name: prof?.full_name, mailbox: prof?.mailbox_number, count: 0 };
                custMap[id].count++;
            });
            const topList = Object.entries(custMap)
                .map(([id, stats]) => ({ id, ...stats }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setData({
                revenueTrend,
                registrationTrend,
                shipmentCount: shipmentCount || 0,
                totalRevenue: ledgerData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0,
                totalUsers: userData?.length || 0,
                topList
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSalesData();
    }, [supabase]);

    if (isLoading) return <div className="space-y-6"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-[500px] rounded-3xl" /></div>;

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Sales Intelligence</h1>
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1">Growth and Performance Metrics</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none shadow-xl rounded-[2rem] bg-emerald-500 text-white">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Settled Revenue</p>
                        <h3 className="text-4xl font-black italic tracking-tighter">JMD ${data.totalRevenue.toLocaleString()}</h3>
                        <div className="flex items-center gap-2 mt-4"><ArrowUpRight className="h-4 w-4" /><span className="text-[10px] font-bold uppercase">All-time collection</span></div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl rounded-[2rem] bg-indigo-500 text-white">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Customers</p>
                        <h3 className="text-4xl font-black italic tracking-tighter">{data.totalUsers}</h3>
                        <div className="flex items-center gap-2 mt-4"><UserCheck className="h-4 w-4" /><span className="text-[10px] font-bold uppercase">Authorized Profiles</span></div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl rounded-[2rem] bg-zinc-950 text-white">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Volume Cleared</p>
                        <h3 className="text-4xl font-black italic tracking-tighter">{data.shipmentCount} Parcels</h3>
                        <div className="flex items-center gap-2 mt-4"><Package className="h-4 w-4" /><span className="text-[10px] font-bold uppercase">Global Transits</span></div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-8">
                        <CardTitle className="text-xs font-black uppercase tracking-widest italic flex items-center gap-3"><DollarSign className="h-5 w-5 text-emerald-500" /> Revenue Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <RevenueBarChart data={data.revenueTrend} />
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-8">
                        <CardTitle className="text-xs font-black uppercase tracking-widest italic flex items-center gap-3"><Users className="h-5 w-5 text-indigo-500" /> High-Value Shippers</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase">Top customers ranked by shipment volume.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="pl-8 text-[10px] font-black uppercase">Customer</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Mailbox</TableHead>
                                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Volume</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.topList.map((c: any) => (
                                    <TableRow key={c.id} className="h-16 hover:bg-primary/5 transition-colors">
                                        <TableCell className="pl-8 font-black uppercase text-sm">{c.name}</TableCell>
                                        <TableCell><Badge variant="outline" className="font-black italic text-[10px] border-2">{c.mailbox}</Badge></TableCell>
                                        <TableCell className="text-right pr-8 font-black italic text-lg text-primary">{c.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
