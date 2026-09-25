'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, Phone, Home, Trash2, KeyRound, Wallet, PlusCircle, ShieldCheck, ShieldAlert, Send, CheckCircle2, DollarSign, MapPin, Copy, Building2 } from 'lucide-react';
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

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;
    const { supabase } = useSupabase();
    const { toast } = useToast();
    
    const [profile, setProfile] = useState<any>(null);
    const [shipments, setShipments] = useState<any[]>([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [
                { data: profileData },
                { data: shipmentsData },
                { data: roleData },
                { data: addressData }
            ] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                supabase.from('shipments').select('*').eq('profile_id', userId).order('created_at', { ascending: false }),
                supabase.from('app_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
                supabase.from('addresses').select('*').eq('profile_id', userId).order('is_default', { ascending: false })
            ]);

            setProfile(profileData);
            setShipments(shipmentsData || []);
            setAddresses(addressData || []);
            setIsAdmin(!!roleData);
        } catch (error: any) {
            toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [userId, supabase, toast]);

    useEffect(() => {
        if (userId) fetchData();
    }, [fetchData, userId]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied" });
    };

    const toggleAdminStatus = async () => {
        if (profile?.email === 'admin@neilussolutions.com') {
            toast({ title: "Operation Denied", description: "Master Admin access is locked.", variant: "destructive" });
            return;
        }
        setIsUpdatingRole(true);
        try {
            if (isAdmin) {
                await supabase.from('app_roles').delete().eq('user_id', userId).eq('role', 'admin');
                toast({ title: "Role Revoked" });
            } else {
                await supabase.from('app_roles').insert({ user_id: userId, role: 'admin' });
                toast({ title: "Role Granted" });
            }
            fetchData();
        } catch (e: any) {
            toast({ title: "Update Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ userId })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Purge failed');

            toast({ title: "Account Purged" });
            router.push('/admin/users');
        } catch (e: any) {
            toast({ title: "Purge Error", description: e.message, variant: "destructive" });
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!profile) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold italic uppercase">Identity Missing</h1>
                <Button variant="outline" asChild className="mt-8 font-bold border-2">
                    <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Registry</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Account Intelligence</h1>
                    <p className="text-muted-foreground font-medium text-[10px] uppercase tracking-widest mt-1">Identity: {profile.full_name}</p>
                </div>
                <Button variant="outline" asChild className="font-bold border-2">
                    <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Registry</Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden border-none shadow-lg rounded-2xl">
                        <CardHeader className="items-center bg-primary/5 pb-8">
                            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                <AvatarFallback className="text-2xl font-black">{profile.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-2xl pt-4 font-black italic uppercase tracking-tighter text-center">{profile.full_name}</CardTitle>
                            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-center">Mailbox: {profile.mailbox_number}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4 pt-6">
                             <div className="flex items-center gap-3">
                                <div className="bg-muted p-2 rounded-lg"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Email</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium truncate">{profile.email}</p>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(profile.email)}><Copy className="h-3 w-3" /></Button>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center gap-3">
                                <div className="bg-muted p-2 rounded-lg"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                                <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Phone</p><p className="font-medium">{profile.phone || 'N/A'}</p></div>
                            </div>
                             <div className="flex items-center gap-3">
                                <div className="bg-muted p-2 rounded-lg"><Home className="h-4 w-4 text-muted-foreground" /></div>
                                <div><p className="text-[10px] font-bold uppercase text-muted-foreground">TRN</p><p className="font-medium">{profile.trn || 'N/A'}</p></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-primary/5 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-primary" /> Financial Standing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className={cn("text-center p-6 rounded-2xl border-2 border-dashed transition-colors", Number(profile.wallet_balance) < 0 ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/10")}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ledger Standing</p>
                                <p className={cn("text-4xl font-black italic tracking-tighter", Number(profile.wallet_balance) < 0 ? "text-red-600" : "text-primary")}>
                                    JMD ${Math.abs(Number(profile.wallet_balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <AdjustBalanceDialog userId={profile.id} userName={profile.full_name} currentBalance={Number(profile.wallet_balance || 0)} onSuccess={fetchData} />
                        </CardContent>
                    </Card>

                    <Card className={cn("border-2 rounded-2xl overflow-hidden", isAdmin ? "border-primary/40 bg-primary/5" : "border-dashed opacity-80")}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" /> Authority Level
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button 
                                onClick={toggleAdminStatus} 
                                disabled={isUpdatingRole || profile.email === 'admin@neilussolutions.com'} 
                                variant={isAdmin ? "destructive" : "default"}
                                className="w-full font-black uppercase italic text-[10px] h-11 shadow-lg"
                            >
                                {isUpdatingRole ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : (isAdmin ? <ShieldAlert className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />)}
                                {isAdmin ? "Revoke Admin Access" : "Authorize Administrator"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/10">
                            <CardTitle className="text-sm font-bold uppercase opacity-60">Identity Management</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-2">
                            <ResetPasswordDialog userId={profile.id} userName={profile.full_name} />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/5 font-bold" disabled={profile.email === 'admin@neilussolutions.com'}>
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Purge Identity Record
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl border-2">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-center">Confirm Deep Purge?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-[10px] font-bold uppercase tracking-widest text-center">
                                            This will permanently remove <strong>{profile.full_name}</strong> from Auth and all Registry tables.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                        <AlertDialogCancel className="font-bold uppercase h-12">Abort</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase h-12 shadow-lg">Authorize Purge</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {/* Address Registry Card */}
                    <Card className="shadow-xl border-none rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" /> Logistics Registry
                            </CardTitle>
                            <Badge variant="outline" className="font-bold text-[9px] uppercase">Official Coordinates</Badge>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">
                            {/* Assigned US Warehouse Address */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" /> Assigned US Shipping Address
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border-2 border-dashed bg-primary/5">
                                    <div className="space-y-3">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold uppercase opacity-40">Recipient Name</p>
                                            <p className="text-sm font-bold uppercase">{profile.full_name}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold uppercase opacity-40">Address Line 1</p>
                                            <p className="text-sm font-bold uppercase">3507 NW 19th ST</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold uppercase opacity-40">Address Line 2 (Mailbox)</p>
                                            <p className="text-sm font-black text-primary uppercase">{profile.mailbox_number}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold uppercase opacity-40">City / State</p>
                                            <p className="text-sm font-bold uppercase">Lauderdale Lake, FL</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold uppercase opacity-40">Zip Code</p>
                                            <p className="text-sm font-bold uppercase">33311-4224</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-8 font-black uppercase text-[9px] border-2" onClick={() => copyToClipboard(`${profile.full_name}\n3507 NW 19th ST\n${profile.mailbox_number}\nLauderdale Lake, FL 33311-4224`)}>
                                            <Copy className="h-3 w-3 mr-1" /> Copy Full Address
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Registered Local Addresses (Jamaica) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Home className="h-3.5 w-3.5" /> Registered Local Addresses
                                    </h3>
                                    <Badge className="bg-primary/10 text-primary text-[8px] font-black uppercase border-primary/20">Jamaica Registry</Badge>
                                </div>
                                
                                {addresses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {addresses.map((addr) => (
                                            <div key={addr.id} className="p-4 rounded-xl border bg-muted/20 relative group overflow-hidden">
                                                {addr.is_default && (
                                                    <div className="absolute top-0 right-0 bg-primary text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-bl-lg">Primary</div>
                                                )}
                                                <p className="text-xs font-bold uppercase">{addr.address_line_1}</p>
                                                {addr.address_line_2 && <p className="text-[10px] font-medium opacity-60 uppercase">{addr.address_line_2}</p>}
                                                <p className="text-[10px] font-bold uppercase opacity-80 mt-1">{addr.city}, {addr.state_parish}</p>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <Badge variant="outline" className="text-[7px] font-black uppercase">{addr.address_type}</Badge>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(`${addr.address_line_1}\n${addr.address_line_2 || ''}\n${addr.city}, ${addr.state_parish}`)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-30 italic">
                                        <p className="text-xs uppercase font-bold">No local addresses registered.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xl border-none rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic">Worldwide Transit History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/20">
                                    <TableRow>
                                        <TableHead className="pl-6 text-[10px] font-black uppercase">Tracking ID</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Contents</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                                        <TableHead className="text-right pr-6 text-[10px] font-black uppercase">Cost (JMD)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipments.length > 0 ? (
                                        shipments.map((s) => (
                                        <TableRow key={s.id} className="h-20 hover:bg-primary/5 transition-colors">
                                            <TableCell className="pl-6 font-mono font-black text-primary uppercase text-sm">{s.tracking_number}</TableCell>
                                            <TableCell className="text-xs uppercase font-medium opacity-70 italic line-clamp-1 max-w-[200px]">{s.contents}</TableCell>
                                            <TableCell><Badge variant="outline" className="font-black italic uppercase text-[9px] border-2">{s.status}</Badge></TableCell>
                                            <TableCell className="text-right pr-6 font-black tracking-tighter text-lg">
                                                ${Number(s.total_cost_jmd || 0).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-64 italic text-muted-foreground opacity-30">No transit records found.</TableCell>
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
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ userId })
            });
            
            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.message || "Reset failed.");
            }

            toast({ title: "Link Dispatched", description: `Secure instructions sent to client email.` });
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
                <Button variant="ghost" className="w-full justify-start text-primary hover:bg-primary/5 font-bold">
                    <KeyRound className="mr-2 h-4 w-4" /> Reset Access Key
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl border-2">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Authorize Reset Protocol</DialogTitle>
                </DialogHeader>
                <div className="py-8 text-center space-y-4 px-4">
                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><Send className="h-10 w-10 text-primary" /></div>
                    <p className="text-sm font-medium uppercase tracking-tight">This will dispatch a one-time secure link to <strong>{userName}</strong>.</p>
                </div>
                <DialogFooter>
                    <Button onClick={handleSendResetLink} disabled={isResetting} className="w-full h-14 font-black uppercase italic shadow-xl">
                        {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize Dispatch"}
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

    const handleAdjustBalance = async () => {
        setIsUpdating(true);
        try {
            const newBalance = parseFloat(amount);
            if (isNaN(newBalance)) throw new Error("Invalid amount.");
            
            const diff = newBalance - currentBalance;
            if (diff === 0) {
                setOpen(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('financial_ledger').insert({
                profile_id: userId,
                amount: diff,
                transaction_type: 'adjustment',
                description: `Manual Administrative Adjustment`,
                created_by: user?.id
            });

            if (error) throw error;

            toast({ 
                title: "Credit Adjusted", 
                description: `${diff > 0 ? 'Added' : 'Subtracted'} JMD $${Math.abs(diff).toLocaleString()} in audit ledger.` 
            });
            
            setOpen(false);
            onSuccess();
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full font-bold border-2"><PlusCircle className="mr-2 h-4 w-4 text-primary" /> Adjust Account Balance</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl border-2">
                <DialogHeader><DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Update Financial Standing</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                        <p className="text-[10px] font-bold uppercase opacity-60">Current Standing</p>
                        <p className="text-2xl font-black italic">JMD ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Define New Standing (JMD $)</Label>
                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 text-2xl font-black border-2" />
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                            Adjustment will be logged as an immutable audit record in the financial ledger. This action is tracked.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAdjustBalance} disabled={isUpdating} className="w-full h-14 font-black uppercase italic shadow-xl">
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Authorize Adjustment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
