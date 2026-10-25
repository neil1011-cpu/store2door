'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, Phone, Home, Trash2, KeyRound, Wallet, PlusCircle, ShieldCheck, ShieldAlert, Send, CheckCircle2, MapPin, Copy, Building2, Edit2, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
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
            
            fetch('/api/admin/logicware-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId: userId })
            }).catch(e => console.warn('[SYNC_WARN]', e));

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
                    <Card className="overflow-hidden border shadow-sm">
                        <CardHeader className="items-center bg-muted/20 pb-6 pt-8">
                            <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                                <AvatarFallback className="text-2xl font-black">{profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-lg pt-4 font-black italic uppercase tracking-tighter text-center">{profile?.full_name || 'Legacy Account'}</CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="font-mono font-bold uppercase border-2">{profile?.mailbox_number || 'TBD'}</Badge>
                                <Dialog open={isEditMailboxOpen} onOpenChange={setIsEditMailboxOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                            <Edit2 className="h-3.5 w-3.5 text-primary" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="uppercase italic font-black">Update Global Code</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold uppercase opacity-60">Mailbox Reference</Label>
                                                <Input value={newMailbox} onChange={e => setNewMailbox(e.target.value.toUpperCase())} className="h-12 text-xl font-bold border-2 font-mono" />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                            <Button onClick={handleUpdateMailbox} disabled={isUpdatingMailbox}>
                                                {isUpdatingMailbox ? <Loader2 className="animate-spin" /> : "Save Code"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4 pt-6">
                             <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium truncate">{profile?.email || 'N/A'}</p>
                            </div>
                             <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p className="font-medium">{profile?.phone || 'NOT REGISTERED'}</p>
                            </div>
                             <div className="flex items-center gap-3">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <p className="font-mono font-bold">{profile?.trn || 'NOT REGISTERED'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                        <CardContent className="p-4 space-y-4">
                            <div className={cn("p-4 rounded-xl border border-dashed text-center", Number(profile?.wallet_balance) < 0 ? "bg-red-50 border-red-200" : "bg-muted/20 border-muted")}>
                                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1 italic">Authorized Standing</p>
                                <p className={cn("text-xl font-black italic tracking-tighter", Number(profile?.wallet_balance) < 0 ? "text-red-600" : "text-primary")}>
                                    JMD ${Math.abs(Number(profile?.wallet_balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <AdjustBalanceDialog userId={profile?.id} userName={profile?.full_name} currentBalance={Number(profile?.wallet_balance || 0)} onSuccess={fetchData} />
                        </CardContent>
                    </Card>

                    <Card className={cn("border shadow-sm", isAdmin ? "bg-primary/5" : "border-dashed opacity-70")}>
                        <CardHeader className="pb-3 pt-4">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" /> Authority Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                onClick={toggleAdminStatus} 
                                disabled={isUpdatingRole || profile?.email === 'admin@neilussolutions.com'} 
                                variant={isAdmin ? "destructive" : "default"}
                                className="w-full font-black uppercase italic text-[10px] h-10"
                            >
                                {isUpdatingRole ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : (isAdmin ? <ShieldAlert className="h-3 w-3 mr-2" /> : <ShieldCheck className="h-3 w-3 mr-2" />)}
                                {isAdmin ? "Revoke Admin Access" : "Authorize Administrator"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border">
                        <CardHeader className="py-3 bg-muted/20">
                            <CardTitle className="text-[9px] font-black uppercase opacity-40 text-center tracking-widest">Management</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-2">
                            <ResetPasswordDialog userId={profile?.id} userName={profile?.full_name} />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/5 font-black uppercase italic text-[9px] h-9" disabled={profile?.email === 'admin@neilussolutions.com'}>
                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Purge Identity
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="font-black uppercase italic">Confirm Identity Purge?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-xs">
                                            This will permanently remove <strong>{profile?.full_name}</strong> from the registry. This action is irreversible.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="font-bold uppercase">Abort</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive font-black uppercase">Confirm Purge</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-sm border rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest italic flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-primary" /> COORDINATE REGISTRY
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" /> Assigned US Intake Hub
                                </h3>
                                <div className="p-6 rounded-xl border-2 border-dashed bg-primary/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <div><p className="text-[8px] font-black uppercase opacity-40">Recipient Authority</p><p className="text-sm font-bold uppercase">{profile?.full_name}</p></div>
                                        <div><p className="text-[8px] font-black uppercase opacity-40">Line 1</p><p className="text-sm font-bold uppercase">3507 NW 19th ST</p></div>
                                        <div><p className="text-[8px] font-black uppercase opacity-40">Line 2 (Mailbox)</p><p className="text-lg font-black text-primary uppercase italic">{profile?.mailbox_number || 'TBD'}</p></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div><p className="text-[8px] font-black uppercase opacity-40">City / State</p><p className="text-sm font-bold uppercase">Lauderdale Lake, FL</p></div>
                                        <div><p className="text-[8px] font-black uppercase opacity-40">Zip Code</p><p className="text-sm font-bold uppercase">33311-4224</p></div>
                                        <Button variant="outline" size="sm" className="w-full h-8 mt-2 font-bold uppercase text-[9px] border-2" onClick={() => copyToClipboard(`${profile?.full_name}\n3507 NW 19th ST\n${profile?.mailbox_number}\nLauderdale Lake, FL 33311-4224`)}>
                                            <Copy className="h-3 w-3 mr-2" /> Copy Full Address
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Home className="h-3.5 w-3.5" /> LOCAL DELIVERY TARGETS
                                    </h3>
                                </div>
                                
                                {addresses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {addresses.map((addr) => (
                                            <div key={addr.id} className="p-4 rounded-xl border bg-muted/20 relative">
                                                {addr.is_default && (
                                                    <div className="absolute top-0 right-0 bg-primary text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-bl-lg">Primary</div>
                                                )}
                                                <p className="text-xs font-black uppercase italic">{addr.address_line_1}</p>
                                                <p className="text-[10px] font-bold opacity-60 uppercase">{addr.city}, {addr.state_parish}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/10 opacity-30">
                                        <p className="text-[8px] uppercase font-black tracking-widest">No local coordinates found.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest italic flex items-center gap-3">
                                <Building2 className="h-4 w-4 text-primary" /> TRANSIT HISTORY AUDIT
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="pl-6 text-[9px] font-black uppercase tracking-widest">Parcel ID</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Description</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="text-right pr-6 text-[9px] font-black uppercase tracking-widest">Total (JMD)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipments.length > 0 ? (
                                        shipments.map((s) => (
                                        <TableRow key={s.id} className="h-16 hover:bg-primary/5 transition-colors border-b last:border-0">
                                            <TableCell className="pl-6">
                                                <p className="font-mono font-black text-primary uppercase text-xs">{s.tracking_number}</p>
                                                <p className="text-[8px] font-bold opacity-40 uppercase">{new Date(s.created_at).toLocaleDateString()}</p>
                                            </TableCell>
                                            <TableCell className="text-[10px] uppercase font-bold opacity-70 italic truncate max-w-[150px]">
                                                {s.contents || 'General Parcel'}
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="font-black italic uppercase text-[8px] border-2 py-0 h-5 px-2">{s.status || 'Updated'}</Badge></TableCell>
                                            <TableCell className="text-right pr-6">
                                                <span className="text-sm font-black italic tracking-tighter text-primary">
                                                    ${Number(s.total_cost_jmd || 0).toLocaleString()}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground opacity-20 italic text-xs uppercase font-black tracking-widest">No transit activity logged.</TableCell>
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
                <Button variant="ghost" className="w-full justify-start text-primary hover:bg-primary/5 font-black uppercase italic text-[9px] h-9">
                    <KeyRound className="mr-2 h-3.5 w-3.5" /> Reset Access Key
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic font-black text-center">Restore Access Key</DialogTitle>
                </DialogHeader>
                <div className="py-6 text-center space-y-4">
                    <p className="text-sm font-bold uppercase tracking-tight text-zinc-500">
                        Dispatch a secure restoration link to <br/>
                        <strong className="text-primary">{userName}</strong>?
                    </p>
                </div>
                <DialogFooter>
                    <Button onClick={handleSendResetLink} disabled={isResetting} className="w-full font-black uppercase italic">
                        {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
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

    useEffect(() => {
        if (open) setAmount(currentBalance.toString());
    }, [currentBalance, open]);

    const handleAdjustBalance = async () => {
        setIsUpdating(true);
        try {
            const newBalanceVal = parseFloat(amount);
            if (isNaN(newBalanceVal)) throw new Error("Invalid numeric value provided.");
            
            const diff = newBalanceVal - currentBalance;
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
                description: `Manual Ledger Adjustment`,
                created_by: actor?.id
            });

            if (error) throw error;

            toast({ title: "Registry Adjusted" });
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
                <Button variant="outline" className="w-full h-10 font-black uppercase italic text-[9px] border-2">
                    <PlusCircle className="mr-2 h-3.5 w-3.5 text-indigo-400" /> Adjust Balance
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle className="uppercase italic font-black text-center">Financial Standing</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase opacity-60">Define New Registry Total (JMD $)</Label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-2xl font-black border-2 text-center" />
                        <p className="text-[8px] text-center font-bold text-muted-foreground uppercase">Current: ${currentBalance.toLocaleString()}</p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAdjustBalance} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Authorize
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
