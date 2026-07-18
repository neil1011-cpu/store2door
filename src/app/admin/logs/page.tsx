
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search, History, RefreshCw, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';
import type { SystemLog } from '@/lib/types';
import { cn } from '@/lib/utils';

const getLogTypeVariant = (type: string) => {
    switch (type) {
        case 'pre_alert_upload': return 'default';
        case 'logicware_webhook': return 'secondary';
        case 'auth_event': return 'outline';
        default: return 'outline';
    }
};

export default function LogsPage() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const logsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
    }, [firestore]);

    const { data: logs, isLoading } = useCollection<SystemLog>(logsQuery);

    const filteredLogs = useMemo(() => {
        if (!logs) return [];
        if (!searchTerm) return logs;
        const lower = searchTerm.toLowerCase();
        return logs.filter(log => 
            (log.description || '').toLowerCase().includes(lower) ||
            (log.userName || '').toLowerCase().includes(lower) ||
            (log.type || '').toLowerCase().includes(lower)
        );
    }, [logs, searchTerm]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight italic uppercase">System Activity Logs</h1>
                    <p className="text-muted-foreground">Comprehensive audit trail of worldwide logistics events.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
                </div>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                Audit Trail
                            </CardTitle>
                            <CardDescription>Displaying the latest 100 system events.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search logs..." 
                                className="pl-9 h-11 border-2" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Type</TableHead>
                                <TableHead>Event Description</TableHead>
                                <TableHead>User / Source</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead className="text-right pr-6">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        <p className="text-xs font-bold uppercase mt-2 opacity-40 tracking-widest">Syncing Audit Trail...</p>
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="pl-6">
                                        <Badge variant={getLogTypeVariant(log.type)} className="capitalize text-[10px] px-2">
                                            {log.type.replace(/_/g, ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">{log.description}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs">{log.userName || 'System'}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{log.userId || 'internal'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs opacity-60">
                                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase" onClick={() => console.log(log.metadata)}>
                                            Metadata
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredLogs.length === 0 && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No logs found for the current filter.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
