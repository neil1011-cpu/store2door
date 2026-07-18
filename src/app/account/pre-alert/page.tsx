
'use client';

import { useAccountProfile } from '../layout';
import { PreAlertTab } from '../dashboard-components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BellRing, History, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { PreAlert } from '@/lib/types';

export default function PreAlertPage() {
    const userProfile = useAccountProfile();
    const firestore = useFirestore();

    const preAlertsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.id) return null;
        return query(collection(firestore, 'users', userProfile.id, 'pre_alerts'), orderBy('submissionDate', 'desc'));
    }, [firestore, userProfile?.id]);
    const { data: userPreAlerts, isLoading } = useCollection<PreAlert>(preAlertsQuery);

    if (!userProfile) return null;

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
                        <p className="text-muted-foreground">Notify our Florida warehouse of incoming packages.</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5">
                    <Card className="border-none shadow-lg">
                        <CardHeader>
                            <CardTitle>Submit New Document</CardTitle>
                            <CardDescription>Upload your commercial invoice to expedite customs clearance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PreAlertTab customerId={userProfile.id} customerName={userProfile.fullName} />
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
                            <CardDescription>Track the status of your uploaded documents.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Status</TableHead>
                                        <TableHead>Tracking #</TableHead>
                                        <TableHead>Contents</TableHead>
                                        <TableHead className="text-right pr-6">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-48 text-center">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                                <p className="text-xs font-bold uppercase mt-2 opacity-40">Syncing History...</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : userPreAlerts && userPreAlerts.length > 0 ? (
                                        userPreAlerts.map((alert) => (
                                            <TableRow key={alert.id}>
                                                <TableCell className="pl-6">
                                                    <Badge variant={alert.status === 'Processed' ? 'secondary' : 'destructive'} className="px-3">
                                                        {alert.status === 'Processed' ? (
                                                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Acknowledged</>
                                                        ) : (
                                                            <><AlertCircle className="h-3 w-3 mr-1" /> Submitted</>
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono font-black text-primary uppercase text-xs">{alert.trackingNumber}</TableCell>
                                                <TableCell className="text-xs max-w-[150px] truncate">{alert.contents}</TableCell>
                                                <TableCell className="text-right pr-6 text-xs opacity-60">
                                                    {alert.submissionDate?.toDate ? alert.submissionDate.toDate().toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-48 text-muted-foreground italic">
                                                No documents uploaded yet.
                                            </TableCell>
                                        </TableRow>
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
