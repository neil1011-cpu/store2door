'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Users, 
    Inbox, 
    Truck, 
    DollarSign, 
    ArrowRight, 
    Loader2, 
    Package, 
    Activity,
    Clock,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
    const { supabase } = useSupabase();
    const [stats, setStats] = useState<any>(null);
    const [recentPreAlerts, setRecentPreAlerts] = useState<any[]>([]);
    const [recentShipments, setRecentShipments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const [
                    { count: pendingCount },
                    { count: activeCount },
                    { count: userCount },
                    { data: ledgerData },
                    { data: alerts },
                    { data: ships }
                ] = await Promise.all([
                    supabase.from('pre_alerts').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
                    supabase.from('shipments').select('*', { count: 'exact', head: true }),
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('financial_ledger').select('amount'),
                    supabase.from('pre_alerts').select('*, profiles(full_name, mailbox_number)').eq('status', 'Pending').order('submission_date', { ascending: false }).limit(5),
                    supabase.from('shipments').select('*, profiles(full_name, mailbox_number)').order('created_at', { ascending: false }).limit(5)
                ]);

                const revenue = ledgerData?.filter(l => Number(l.amount) > 0).reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

                setStats({
                    pending: pendingCount || 0,
                    active: activeCount || 0,
                    users: userCount || 0,
                    revenue
                });
                setRecentPreAlerts(alerts || []);
                setRecentShipments(ships || []);
            } catch (err) {
                console.error("Dashboard Error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [supabase]);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Command Center</h1>
                    <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-1">Operational Overview & Registry Status</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-black h-8 px-4">
                    <CheckCircle2 className="h-3 w-3 mr-2" /> Systems Active
                </Badge>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Pending Pre-Alerts', value: stats.pending, icon: Inbox, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: 'Active Shipments', value: stats.active, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                    { label: 'Registry Revenue', value: `JMD $${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-600/10' },
                ].map((kpi, i) => (
                    <Card key={i} className="border shadow-sm">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{kpi.label}</p>
                                <h3 className="text-2xl font-black italic tracking-tighter">{kpi.value}</h3>
                            </div>
                            <div className={`${kpi.bg} p-3 rounded-xl`}>
                                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                {/* Recent Pre-Alerts */}
                <Card className="border shadow-md rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-4 w-4 text-orange-500" /> Awaiting Intake
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase" asChild>
                            <Link href="/admin/pre-alerts">View Queue <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                {recentPreAlerts.length > 0 ? recentPreAlerts.map(pa => (
                                    <TableRow key={pa.id} className="h-16 hover:bg-muted/5 transition-colors">
                                        <TableCell className="pl-6">
                                            <p className="font-bold text-sm uppercase">{pa.profiles?.full_name}</p>
                                            <p className="text-[9px] font-mono opacity-60 uppercase">{pa.profiles?.mailbox_number}</p>
                                        </TableCell>
                                        <TableCell className="font-mono font-bold text-primary text-xs uppercase">{pa.tracking_number}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="outline" size="sm" asChild className="h-8 text-[9px] font-black uppercase italic border-2">
                                                <Link href="/admin/pre-alerts">Process</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell className="h-32 text-center text-muted-foreground italic opacity-30 text-xs">No pending pre-alerts.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Shipments */}
                <Card className="border shadow-md rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-500" /> Recent Shipments
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase" asChild>
                            <Link href="/admin/shipping">View Ledger <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                {recentShipments.length > 0 ? recentShipments.map(s => (
                                    <TableRow key={s.id} className="h-16 hover:bg-muted/5 transition-colors">
                                        <TableCell className="pl-6">
                                            <p className="font-bold text-sm uppercase italic">{s.profiles?.full_name}</p>
                                            <p className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">{s.tracking_number}</p>
                                        </TableCell>
                                        <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase italic border-2">{s.status}</Badge></TableCell>
                                        <TableCell className="text-right pr-6 font-black italic text-sm text-primary">
                                            ${Number(s.total_cost_jmd || 0).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell className="h-32 text-center text-muted-foreground italic opacity-30 text-xs">No active shipments logged.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-24 border-2 flex flex-col gap-2 font-black uppercase italic text-[10px]" asChild>
                    <Link href="/admin/pos"><Activity className="h-6 w-6 text-indigo-500" /> POS Station</Link>
                </Button>
                <Button variant="outline" className="h-24 border-2 flex flex-col gap-2 font-black uppercase italic text-[10px]" asChild>
                    <Link href="/admin/finance"><DollarSign className="h-6 w-6 text-green-600" /> Finance Hub</Link>
                </Button>
                <Button variant="outline" className="h-24 border-2 flex flex-col gap-2 font-black uppercase italic text-[10px]" asChild>
                    <Link href="/admin/users"><Users className="h-6 w-6 text-blue-500" /> Account Registry</Link>
                </Button>
                <Button variant="outline" className="h-24 border-2 flex flex-col gap-2 font-black uppercase italic text-[10px]" asChild>
                    <Link href="/admin/settings"><Activity className="h-6 w-6 text-muted-foreground" /> System Console</Link>
                </Button>
            </div>
        </div>
    );
}
