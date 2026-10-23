'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabase } from '@/components/supabase-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HeadphonesContact, Inbox, Truck, Search, Loader2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CustomerServicePage() {
    const { supabase } = useSupabase();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [queue, setQueue] = useState<any[]>([]);
    const [readyToPick, setReadyToPick] = useState<any[]>([]);

    const fetchQueueData = async () => {
        setIsLoading(true);
        try {
            const [
                { data: preAlerts },
                { data: pickUps }
            ] = await Promise.all([
                supabase.from('pre_alerts').select('*, profiles(full_name, mailbox_number)').eq('status', 'Pending').order('submission_date', { ascending: true }),
                supabase.from('shipments').select('*, profiles(full_name, mailbox_number)').eq('status', 'Ready for pick up').order('created_at', { ascending: false })
            ]);

            setQueue(preAlerts || []);
            setReadyToPick(pickUps || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQueueData();
    }, [supabase]);

    const filteredReady = readyToPick.filter(s => 
        s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profiles?.mailbox_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Service Terminal</h1>
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1">Customer Support & Operational Queue</p>
                </div>
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="SEARCH TRACKING, NAME, OR MAILBOX..." 
                        className="h-12 pl-12 border-2 font-bold uppercase text-xs rounded-2xl"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Pending Pre-Alerts Queue */}
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-8">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-widest italic flex items-center gap-3">
                                <Inbox className="h-5 w-5 text-orange-500" /> Awaiting Intake
                            </CardTitle>
                            <Badge className="bg-orange-500 text-white font-black italic">{queue.length} PRIORITY</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell className="text-center py-20"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
                                ) : queue.length > 0 ? (
                                    queue.map(alert => (
                                        <TableRow key={alert.id} className="h-20 hover:bg-primary/5 transition-colors border-b last:border-0">
                                            <TableCell className="pl-8">
                                                <p className="font-black text-sm uppercase">{alert.profiles?.full_name}</p>
                                                <p className="text-[10px] font-mono opacity-60 uppercase">{alert.profiles?.mailbox_number}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-mono font-bold text-primary text-xs uppercase">{alert.tracking_number}</p>
                                                <p className="text-[8px] font-black uppercase opacity-40 italic">{new Date(alert.submission_date).toLocaleDateString()} @ {new Date(alert.submission_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Button variant="ghost" size="sm" asChild className="h-9 font-black uppercase italic text-[9px] border-2">
                                                    <Link href="/admin/pre-alerts">Review</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell className="text-center py-20 opacity-30 italic text-sm">Clear Queue: All documents processed.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Ready for Pickup Queue */}
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-8">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-widest italic flex items-center gap-3">
                                <Truck className="h-5 w-5 text-indigo-500" /> Collection Bay
                            </CardTitle>
                            <Badge className="bg-indigo-500 text-white font-black italic">{readyToPick.length} READY</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell className="text-center py-20"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
                                ) : filteredReady.length > 0 ? (
                                    filteredReady.map(ship => (
                                        <TableRow key={ship.id} className="h-20 hover:bg-primary/5 transition-colors border-b last:border-0">
                                            <TableCell className="pl-8">
                                                <p className="font-black text-sm uppercase">{ship.profiles?.full_name}</p>
                                                <p className="text-[10px] font-mono opacity-60 uppercase">{ship.profiles?.mailbox_number}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ship.payment_status === 'Paid' ? 'outline' : 'destructive'} className="uppercase text-[8px] font-black border-2">
                                                    {ship.payment_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Button variant="outline" size="sm" asChild className="h-9 font-black uppercase italic text-[9px] border-2 shadow-sm">
                                                    <Link href="/admin/pos">Checkout</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell className="text-center py-20 opacity-30 italic text-sm">Collection bay is empty.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-4 border-dashed border-indigo-200 bg-indigo-50 rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="space-y-4 text-center lg:text-left">
                        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-indigo-800 leading-tight">Proactive Support</h3>
                        <p className="text-sm font-bold uppercase tracking-widest text-indigo-700/60 max-w-lg">
                            Track operational bottlenecks and dispatch status alerts directly from the registry hub.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
                        <div className="p-6 bg-white rounded-3xl border-2 border-indigo-200 shadow-xl text-center space-y-1">
                            <Clock className="h-6 w-6 text-indigo-500 mx-auto" />
                            <p className="text-[10px] font-black uppercase opacity-40">Avg Processing</p>
                            <p className="text-2xl font-black italic tracking-tighter text-indigo-600">4.2 Hrs</p>
                        </div>
                        <div className="p-6 bg-white rounded-3xl border-2 border-indigo-200 shadow-xl text-center space-y-1">
                            <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto" />
                            <p className="text-[10px] font-black uppercase opacity-40">Delayed Parcels</p>
                            <p className="text-2xl font-black italic tracking-tighter text-indigo-600">0 Items</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
