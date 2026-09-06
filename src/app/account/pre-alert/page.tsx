
'use client';

import { useAccountProfile } from '../layout';
import { PreAlertTab } from '../dashboard-components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BellRing, History, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/supabase-provider';

export default function PreAlertPage() {
    const { profile } = useAccountProfile();
    const { supabase } = useSupabase();
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!profile) return;
        
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('pre_alerts')
                .select('*')
                .eq('profile_id', profile.id)
                .order('submission_date', { ascending: false });
            setHistory(data || []);
            setIsLoading(false);
        };

        fetchHistory();

        // Real-time updates
        const channel = supabase
            .channel('pre-alert-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_alerts', filter: `profile_id=eq.${profile.id}` }, () => {
                fetchHistory();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile, supabase]);

    if (!profile) return null;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/account">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <BellRing className="h-6 w-6 text-orange-500" />
                            Pre-Alerts
                        </h1>
                        <p className="text-muted-foreground">Notify our Florida warehouse via Supabase Realtime.</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle>Submit New Document</CardTitle>
                            <CardDescription>Upload your commercial invoice for Supabase processing.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PreAlertTab profileId={profile.id} />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-7">
                    <Card className="border-none shadow-xl">
                        <CardHeader className="bg-muted/10">
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                Submission History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Status</TableHead>
                                        <TableHead>Tracking #</TableHead>
                                        <TableHead className="text-right pr-6">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={3} className="text-center py-20"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                                    ) : history.length > 0 ? (
                                        history.map((alert) => (
                                            <TableRow key={alert.id}>
                                                <TableCell className="pl-6">
                                                    <Badge variant={alert.status === 'Processed' ? 'secondary' : 'destructive'}>
                                                        {alert.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono font-bold uppercase">{alert.tracking_number}</TableCell>
                                                <TableCell className="text-right pr-6 opacity-60">
                                                    {new Date(alert.submission_date).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={3} className="text-center py-20 italic opacity-40">No documents found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
