'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, Phone, Home, Trash2, KeyRound, Wallet, PlusCircle, ShieldCheck, ShieldAlert, Send, CheckCircle2, MapPin, Copy, Building2, Edit2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/supabase-provider';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params?.userId as string;
    const { supabase } = useSupabase();
    const { toast } = useToast();
    
    const [profile, setProfile] = useState<any>(null);
    const [shipments, setShipments] = useState<any[]>([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    
    const [isEditMailboxOpen, setIsEditMailboxOpen] = useState(false);
    const [newMailbox, setNewMailbox] = useState('');
    const [isUpdatingMailbox, setIsUpdatingMailbox] = useState(false);

    const fetchData = useCallback(async () => {
        if (!userId || userId === '[userId]') return;
        
        setIsLoading(true);
        try {
            const [
                pRes,
                sRes,
                rRes,
                aRes
            ] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                supabase.from('shipments').select('*').eq('profile_id', userId).order('created_at', { ascending: false }),
                supabase.from('app_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
                supabase.from('addresses').select('*').eq('profile_id', userId).order('is_default', { ascending: false })
            ]);

            if (pRes.error) throw pRes.error;
            
            setProfile(pRes.data);
            setNewMailbox(pRes.data?.mailbox_number || '');
            setShipments(sRes.data || []);
            setAddresses(aRes.data || []);
            setIsAdmin(!!rRes.data);
        } catch (error: any) {
            console.error('[AUDIT_FETCH_ERROR]', error);
            toast({ title: "Registry Sync Failure", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [userId, supabase, toast]);

    useEffect(() => {
        if (userId) fetchData();
    }, [fetchData, userId]);

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to Clipboard" });
    };

    const handleUpdateMailbox = async () => {
        setIsUpdatingMailbox(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ mailbox_number: newMailbox.toUpperCase() })
                .eq('id', userId);
            
            if (error) throw error;
            toast({ title: "Mailbox Updated", description: "Global registry updated." });
            setIsEditMailboxOpen(false);
            fetchData();
        } catch (e: any) {
            toast({ title: "Update Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsUpdatingMailbox(false);
        }
    };

    const toggleAdminStatus = async () => {
        if (profile?.email === 'admin@neilussolutions.com') {
            toast({ title: "Access Locked", description: "Master admin profile is immutable.", variant: "destructive" });
            return;
        }
        setIsUpdatingRole(true);
        try {
            if (isAdmin) {
                await supabase.from('app_roles').delete().eq('user_id', userId).eq('role', 'admin');
                toast({ title: "Authority Revoked" });
            } else {
                await supabase.from('app_roles').insert({ user_id: userId, role: 'admin' });
                toast({ title: "Authority Granted" });
            }
            fetchData();
        } catch (e: any) {
            toast({ title: "Role Update Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const sessionRes = await supabase.auth.getSession();
            const token = sessionRes.data.session?.access_token;
            
            const res = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ userId })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Purge protocol failed.');

            toast({ title: "Identity Purged" });
            router.push('/admin/users');
        } catch (e: any) {
            toast({ title: "Purge Error", description: e.message, variant: "destructive" });
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Decrypting Profile Registry...</p>
            </div>
        );
    }
    
    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="bg-muted p-8 rounded-full">
                    <ShieldAlert className="h-16 w-16 text-muted-foreground opacity-20" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Identity Missing</h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">This UID does not exist in the active registry.</p>
                </div>
                <Button variant="outline" asChild className="font-black uppercase italic border-2 h-12 px-10">
                    <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Registry</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Account Intelligence</h1>
                    <p className="text-muted-foreground font-medium text-[10px] uppercase tracking-widest mt-1">Identity: {profile?.full_name || 'Anonymous'}</p>
                </div>
                <Button variant="outline" asChild className="font-bold border-2">
                    <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Registry</Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden border-none shadow-lg rounded-3xl">
                        <CardHeader className="items-center bg-primary/5 pb-8 pt-10 relative">
                            <Avatar className="h-28 w-28 border-4 border-background shadow-2xl">
                                <AvatarFallback className="text-4xl font-black">{profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-2xl pt-6 font-black italic uppercase tracking-tighter text-center">{profile?.full_name || 'Legacy Account'}</CardTitle>
                            <div className="flex items-center gap-2 mt-3">
                                <Badge className="font-mono font-black italic tracking-tighter uppercase px-4 py-1.5 text-sm shadow-sm">{profile?.mailbox_number || 'TBD'}</Badge>
                                <Dialog open={isEditMailboxOpen} onOpenChange={setIsEditMailboxOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors">
                                            <Edit2 className="h-4 w-4 text-primary" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md rounded-[2rem] border-4">
                                        <DialogHeader>
                                            <DialogTitle className="uppercase italic tracking-tighter text-3xl text-center font-black">Update Global Code</DialogTitle>
                                            <DialogDescription className="text-center font-bold text-[10px] uppercase tracking-widest">Crucial for Logicware Hub linking.</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-8 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase opacity-60 tracking-widest ml-1">Mailbox Reference (e.g. FSTD101)</Label>
                                                <Input value={newMailbox} onChange={e => setNewMailbox(e.target.value.toUpperCase())} className="h-16 text-3xl font-black border-4 rounded-2xl text-center font-mono shadow-inner" />
                                            </div>
                                            <Alert className="bg-orange-50 border-orange-200 rounded-xl">
                                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                                <AlertDescription className="text-[10px] font-bold uppercase text-orange-800 leading-relaxed italic">
                                                    CAUTION: Changing this will disconnect previous tracking links in the Logistics Hub.
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                        <DialogFooter className="gap-3">
                                            <DialogClose asChild><Button variant="outline" className="h-14 font-black uppercase w-full border-2 rounded-xl">Cancel</Button></DialogClose>
                                            <Button onClick={handleUpdateMailbox} disabled={isUpdatingMailbox} className="flex-1 h-14 font-black uppercase italic shadow-xl rounded-xl">
                                                {isUpdatingMailbox ? <Loader2 className="animate-spin" /> : "Authorize Change"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-5 pt-8">
                             <div className="flex items-center gap-4 group">
                                <div className="bg-muted p-2.5 rounded-xl group-hover:bg-primary/10 transition-colors"><Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary" /></div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Verified Email</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold truncate text-sm">{profile?.email || 'N/A'}</p>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(profile?.email)}><Copy className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center gap-4">
                                <div className="bg-muted p-2.5 rounded-xl"><Phone className="h-5 w-5 text-muted-foreground" /></div>
                                <div><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Direct Phone</p><p className="font-bold text-sm">{profile?.phone || 'NOT REGISTERED'}</p></div>
                            </div>
                             <div className="flex items-center gap-4">
                                <div className="bg-muted p-2.5 rounded-xl"><Home className="h-5 w-5 text-muted-foreground" /></div>
                                <div><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Tax ID (TRN)</p><p className="font-mono font-black text-sm">{profile?.trn || 'NOT REGISTERED'}</p></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-zinc-950 text-white">
                        <CardHeader className="bg-white/5 pb-6 pt-8">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-zinc-400">
                                <Wallet className="h-4 w-4 text-indigo-400" /> FINANCIAL STATUS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-8">
                            <div className={cn("text-center p-8 rounded-[2rem] border-4 border-dashed transition-all", Number(profile?.wallet_balance) < 0 ? "bg-red-500/10 border-red-500/30" : "bg-indigo-500/10 border-indigo-500/30")}>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2 italic">UNIVERSAL BALANCE</p>
                                <p className={cn("text-5xl font-black italic tracking-tighter drop-shadow-2xl", Number(profile?.wallet_balance) < 0 ? "text-red-500" : "text-indigo-400")}>
                                    ${Math.abs(Number(profile?.wallet_balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                                <Badge variant="outline" className={cn("mt-4 uppercase text-[9px] font-black tracking-widest border-2", Number(profile?.wallet_balance) < 0 ? "text-red-500 border-red-500/20" : "text-indigo-400 border-indigo-400/20")}>
                                    {Number(profile?.wallet_balance) < 0 ? 'LEDGER DEBT' : 'CREDIT STANDING'}
                                </Badge>
                            </div>
                            <AdjustBalanceDialog userId={profile?.id} userName={profile?.full_name} currentBalance={Number(profile?.wallet_balance || 0)} onSuccess={fetchData} />
                        </CardContent>
                    </Card>

                    <Card className={cn("border-4 rounded-[2rem] overflow-hidden transition-all", isAdmin ? "border-primary/20 bg-primary/5" : "border-dashed opacity-70")}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" /> Authority Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button 
                                onClick={toggleAdminStatus} 
                                disabled={isUpdatingRole || profile?.email === 'admin@neilussolutions.com'} 
                                variant={isAdmin ? "destructive" : "default"}
                                className="w-full font-black uppercase italic text-xs h-12 shadow-xl rounded-xl"
                            >
                                {isUpdatingRole ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : (isAdmin ? <ShieldAlert className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />)}
                                {isAdmin ? "Revoke Admin Access" : "Authorize Administrator"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] overflow-hidden border-2 shadow-md">
                        <CardHeader className="bg-muted/10 py-4">
                            <CardTitle className="text-[10px] font-black uppercase opacity-40 text-center tracking-[0.2em]">Safety & Restoration</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 flex flex-col gap-3">
                            <ResetPasswordDialog userId={profile?.id} userName={profile?.full_name} />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/5 font-black uppercase italic text-[10px] h-11" disabled={profile?.email === 'admin@neilussolutions.com'}>
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Purge Identity Record
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem] border-8 border-destructive/10">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-3xl font-black uppercase tracking-tighter italic text-center">Confirm Deep Purge?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-[10px] font-bold uppercase tracking-widest text-center py-4">
                                            This will permanently remove <strong>{profile?.full_name}</strong> from Auth and all registry tables. This action is irreversible.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-3">
                                        <AlertDialogCancel className="font-black uppercase h-14 rounded-xl border-2">Abort Purge</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase h-14 rounded-xl shadow-2xl">Confirm Deletion</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {/* Address Registry Card */}
                    <Card className="shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between p-8">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-primary" /> COORDINATE REGISTRY
                            </CardTitle>
                            <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest bg-white border-2">Master Logistics ID</Badge>
                        </CardHeader>
                        <CardContent className="p-10 space-y-10">
                            {/* Assigned US Warehouse Address */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 italic">
                                    <Building2 className="h-4 w-4" /> Assigned US Intake Hub
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-[2rem] border-4 border-dashed bg-primary/5 relative group">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Recipient Authority</p>
                                            <p className="text-lg font-black uppercase italic tracking-tighter">{profile?.full_name || 'Loading...'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Address Line 1</p>
                                            <p className="text-lg font-black uppercase italic tracking-tighter text-zinc-600">3507 NW 19th ST</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Address Line 2 (Unit)</p>
                                            <p className="text-2xl font-black text-primary uppercase italic tracking-tighter">{profile?.mailbox_number || 'TBD'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">City / State</p>
                                            <p className="text-lg font-black uppercase italic tracking-tighter text-zinc-600">Lauderdale Lake, FL</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Zip Code</p>
                                            <p className="text-lg font-black uppercase italic tracking-tighter text-zinc-600">33311-4224</p>
                                        </div>
                                        <Button variant="outline" className="w-full h-12 mt-4 font-black uppercase italic text-[10px] border-2 shadow-sm" onClick={() => copyToClipboard(`${profile?.full_name}\n3507 NW 19th ST\n${profile?.mailbox_number}\nLauderdale Lake, FL 33311-4224`)}>
                                            <Copy className="h-4 w-4 mr-2" /> Copy Full Coordination
                                        </Button>
                                    </div>
                                    <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <MapPin size={120} />
                                    </div>
                                </div>
                            </div>

                            <Separator className="h-1 bg-muted/50" />

                            {/* Registered Local Addresses (Jamaica) */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 italic">
                                        <Home className="h-4 w-4" /> LOCAL DELIVERY TARGETS
                                    </h3>
                                    <Badge className="bg-primary/10 text-primary text-[9px] font-black uppercase border-2 border-primary/20 italic tracking-widest h-8 px-6">Jamaica Registry</Badge>
                                </div>
                                
                                {addresses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {addresses.map((addr) => (
                                            <div key={addr.id} className="p-6 rounded-[1.5rem] border-2 bg-muted/30 relative group hover:border-primary/20 transition-all">
                                                {addr.is_default && (
                                                    <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black uppercase px-4 py-1.5 rounded-bl-xl shadow-lg italic">Primary Target</div>
                                                )}
                                                <p className="text-sm font-black uppercase italic tracking-tight">{addr.address_line_1}</p>
                                                {addr.address_line_2 && <p className="text-[10px] font-bold opacity-60 uppercase mt-1 tracking-widest">{addr.address_line_2}</p>}
                                                <p className="text-xs font-black uppercase opacity-80 mt-3 text-primary">{addr.city}, {addr.state_parish}</p>
                                                <div className="mt-6 flex items-center justify-between border-t pt-4 border-muted">
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-2">{addr.address_type || 'STANDARD'}</Badge>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 hover:opacity-100 transition-all" onClick={() => copyToClipboard(`${addr.address_line_1}\n${addr.address_line_2 || ''}\n${addr.city}, ${addr.state_parish}`)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center border-4 border-dashed rounded-[2rem] bg-muted/20 opacity-30">
                                        <MapPin className="h-10 w-10 mb-2" />
                                        <p className="text-[10px] uppercase font-black tracking-[0.2em]">No local coordinates established.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b p-8">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-primary" /> TRANSIT HISTORY AUDIT
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50 h-16">
                                    <TableRow>
                                        <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest">Document ID</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Manifest Contents</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Logistics State</TableHead>
                                        <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Line Total (JMD)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipments.length > 0 ? (
                                        shipments.map((s) => (
                                        <TableRow key={s.id} className="h-24 hover:bg-primary/5 transition-colors border-b last:border-0">
                                            <TableCell className="pl-10">
                                                <p className="font-mono font-black text-primary uppercase text-lg italic tracking-tighter">{s.tracking_number}</p>
                                                <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{new Date(s.created_at).toLocaleDateString()}</p>
                                            </TableCell>
                                            <TableCell className="text-[11px] uppercase font-bold opacity-70 italic truncate max-w-[200px] leading-tight">
                                                {s.contents || 'Hub Synchronized Parcel'}
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="font-black italic uppercase text-[9px] border-2 py-1 px-4">{s.status || 'Updated'}</Badge></TableCell>
                                            <TableCell className="text-right pr-10">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-2xl font-black italic tracking-tighter text-primary">
                                                        ${Number(s.total_cost_jmd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[8px] font-black opacity-20 italic">JMD</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-64">
                                                <div className="flex flex-col items-center justify-center opacity-10 space-y-4">
                                                    <ShieldAlert size={80} />
                                                    <p className="text-2xl font-black uppercase italic tracking-[0.5em]">Universal Empty</p>
                                                </div>
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

function ResetPasswordDialog({ userId, userName }: { userId: string, userName: string }) {
    const [open, setOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const { toast } = useToast();
    const { supabase } = useSupabase();

    const handleSendResetLink = async () => {
        setIsResetting(true);
        try {
            const sessionRes = await supabase.auth.getSession();
            const token = sessionRes.data.session?.access_token;

            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ userId })
            });
            
            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.message || "Reset request denied.");
            }

            toast({ title: "Link Dispatched", description: `Access key restoration link sent to client.` });
            setOpen(false);
        } catch (error: any) {
            toast({ title: "Reset Error", description: error.message, variant: "destructive" });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-primary hover:bg-primary/5 font-black uppercase italic text-[10px] h-11">
                    <KeyRound className="mr-3 h-4 w-4" /> Reset Access Key
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] border-4">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-3xl text-center font-black">Restore Access Key</DialogTitle>
                </DialogHeader>
                <div className="py-10 text-center space-y-6 px-4">
                    <div className="bg-primary/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4 transform rotate-6"><Send className="h-12 w-12 text-primary" /></div>
                    <p className="text-sm font-bold uppercase tracking-tight text-zinc-500 leading-relaxed">
                        Dispatch a secure restoration link to <br/>
                        <strong className="text-primary text-lg italic">{userName || 'the client'}</strong>?
                    </p>
                </div>
                <DialogFooter>
                    <Button onClick={handleSendResetLink} disabled={isResetting} className="w-full h-16 font-black uppercase italic text-xl shadow-2xl rounded-2xl">
                        {isResetting ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Send className="mr-3 h-6 w-6" />}
                        Authorize Dispatch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AdjustBalanceDialog({ userId, userName, currentBalance, onSuccess }: { userId: string, userName: string, currentBalance: number, onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(currentBalance.toString());
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();
    const { supabase } = useSupabase();

    // Reset amount when currentBalance prop changes or dialog opens
    useEffect(() => {
        if (open) setAmount(currentBalance.toString());
    }, [currentBalance, open]);

    const handleAdjustBalance = async () => {
        setIsUpdating(true);
        try {
            const newBalance = parseFloat(amount);
            if (isNaN(newBalance)) throw new Error("Invalid numeric value provided.");
            
            const diff = newBalance - currentBalance;
            if (diff === 0) {
                setOpen(false);
                return;
            }

            const userRes = await supabase.auth.getUser();
            const actor = userRes.data.user;

            const { error } = await supabase.from('financial_ledger').insert({
                profile_id: userId,
                amount: diff,
                transaction_type: 'adjustment',
                description: `Manual Ledger Adjustment [Admin: ${actor?.email?.split('@')[0]}]`,
                created_by: actor?.id
            });

            if (error) throw error;

            toast({ 
                title: "Registry Adjusted", 
                description: `${diff > 0 ? 'Added' : 'Subtracted'} JMD $${Math.abs(diff).toLocaleString()} in audit ledger.` 
            });
            
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            toast({ title: "Ledger Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-14 font-black uppercase italic text-[11px] border-4 rounded-2xl shadow-lg hover:bg-white/5 transition-all">
                    <PlusCircle className="mr-3 h-4 w-4 text-indigo-400" /> Adjust Manual Balance
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] border-8 border-indigo-500/10">
                <DialogHeader><DialogTitle className="uppercase italic tracking-tighter text-3xl text-center font-black">Financial Standing</DialogTitle></DialogHeader>
                <div className="space-y-8 py-6">
                    <div className="p-8 rounded-[2rem] bg-indigo-500/5 border-4 border-dashed border-indigo-500/20 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-2 italic">CURRENT STANDING</p>
                        <p className="text-3xl font-black italic tracking-tighter text-indigo-600">JMD ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1 italic">Define New Registry Total (JMD $)</Label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-20 text-5xl font-black border-4 rounded-2xl text-center shadow-inner" />
                    </div>
                    <div className="p-5 bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-2xl flex gap-4">
                        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-[9px] font-black text-amber-700 uppercase leading-relaxed tracking-tight italic">
                            THIS OPERATION CREATES AN IMMUTABLE AUDIT RECORD IN THE FINANCIAL LEDGER. THE DELTA WILL BE LOGGED AS A MANUAL ADJUSTMENT.
                        </p>
                    </div>
                </div>
                <DialogFooter className="gap-3">
                    <DialogClose asChild><Button variant="outline" className="h-14 font-black uppercase w-full border-2 rounded-xl">Abort</Button></DialogClose>
                    <Button onClick={handleAdjustBalance} disabled={isUpdating} className="flex-1 h-14 font-black uppercase italic shadow-2xl rounded-xl bg-indigo-600 hover:bg-indigo-500">
                        {isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Authorize Adjustment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
