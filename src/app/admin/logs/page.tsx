
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search, History, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/components/supabase-provider';
import Link from 'next/link';

const getLogVariant = (type: string) => {
    switch (type.toLowerCase()) {
        case 'pos_transaction': return 'default';
        case 'intake_processed': return 'secondary';
        case 'identity_creation': return 'outline';
        case 'welcome_reset_dispatch': return 'outline';
        default: return 'outline';
    }
};

export default function LogsPage() {
    const { supabase } = useSupabase();
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        setLogs(data || []);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        if (!searchTerm) return logs;
        const s = searchTerm.toLowerCase();
        return logs.filter(l => 
            l.description.toLowerCase().includes(s) || 
            l.log_type.toLowerCase().includes(s)
        );
    }, [logs, searchTerm]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Activity Logs</h1>
                    <p className="text-muted-foreground font-medium uppercase text-[10px]">Universal Audit Trail (PostgreSQL)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchLogs} className="font-bold border-2"><RefreshCw className="mr-2 h-4 w-4" /> Refresh Feed</Button>
                    <Button variant="outline" asChild className="font-bold border-2"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
                </div>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Master Registry Logs</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input placeholder="Search events..." className="pl-9 h-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="pl-6 text-[10px] font-black uppercase">Log Type</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Event Description</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Timestamp</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow>
                            ) : filteredLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-muted/30 h-16">
                                    <TableCell className="pl-6"><Badge variant={getLogVariant(log.log_type)} className="text-[8px] font-black uppercase tracking-tighter border-2">{log.log_type.replace(/_/g, ' ')}</Badge></TableCell>
                                    <TableCell className="text-xs font-bold uppercase tracking-tight italic opacity-80">{log.description}</TableCell>
                                    <TableCell className="text-[10px] font-medium opacity-60">{new Date(log.created_at).toLocaleString()}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="sm" onClick={() => console.log(log.metadata)} className="text-[9px] font-black uppercase h-7 px-4">Metadata</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
