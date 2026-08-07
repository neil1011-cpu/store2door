'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, query, orderBy, updateDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, Shipment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, Phone, Home, Trash2, KeyRound, Wallet, PlusCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'In Transit': return 'default';
    case 'Customs': return 'secondary';
    case 'Delivered': return 'outline';
    case 'Pending': return 'destructive';
    case 'Processed': return 'secondary';
    default: return 'default';
  }
};

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const adminRoleRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'admin_roles', userId);
    }, [firestore, userId]);
    const { data: adminRoleDoc, isLoading: isAdminCheckLoading } = useDoc<{isAdmin: boolean}>(adminRoleRef);

    const shipmentsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'shipments'), orderBy('shippingDate', 'desc'));
    }, [firestore, userId]);
    const { data: userShipments, isLoading: isShipmentsLoading } = useCollection<Shipment>(shipmentsQuery);

    const isMasterAdmin = userProfile?.email === 'admin@neilussolutions.com';

    const toggleAdminStatus = async () => {
        if (isMasterAdmin) {
            toast({ title: "Operation Denied", description: "Master Admin access cannot be modified.", variant: "destructive" });
            return;
        }
        setIsUpdatingRole(true);
        try {
            if (adminRoleDoc) {
                await deleteDoc(adminRoleRef!);
                toast({ title: "Role Revoked", description: "Administrative access has been removed." });
            } else {
                await setDoc(adminRoleRef!, { 
                    isAdmin: true, 
                    email: userProfile?.email,
                    uid: userId,
                    updatedAt: serverTimestamp() 
                });
                toast({ title: "Role Granted", description: "This account now has full administrative access." });
            }
        } catch (e: any) {
            toast({ title: "Role Update Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const handleDelete = async () => {
        if (isMasterAdmin) {
            toast({ title: "Operation Denied", description: "Master Admin account cannot be purged.", variant: "destructive" });
            return;
        }
        setIsDeleting(true);
        try {
            const idToken = await auth?.currentUser?.getIdToken(true);
            const res = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Purge failed');

            toast({ title: "Account Purged", description: "Identity removed from worldwide registry." });
            router.push('/admin/users');
        } catch (e: any) {
            toast({ title: "Purge Error", description: e.message, variant: "destructive" });
            setIsDeleting(false);
        }
    };

    if (isProfileLoading || isShipmentsLoading || isAdminCheckLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!userProfile) {
        return (
            <div className="text-center py-20">
                <h1 className="text-2xl font-bold">Client Not Found</h1>
                <p className="text-muted-foreground mt-2">The record may have been purged or relocated.</p>
                 <Button variant="outline" asChild className="mt-8 font-bold border-2">
                    <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Registry</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Account Intelligence</h1>
                    <p className="text-muted-foreground font-medium text-[10px] uppercase tracking-widest mt-1">
                       Primary identity record for {userProfile.fullName}.
                    </p>
                </div>
                <Button variant="outline" asChild className="font-bold border-2">
                    <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Registry</Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <Card className="overflow-hidden border-none shadow-lg">
                        <CardHeader className="items-center bg-primary/5 pb-8">
                            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userProfile.fullName}`} />
                                <AvatarFallback>{userProfile.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <CardTitle className="text-2xl pt-4 font-black italic uppercase tracking-tighter text-center">{userProfile.fullName}</CardTitle>
                            <CardDescription className="font-bold text-[10px] uppercase tracking-widest">Mailbox: {userProfile.mailboxNumber}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4 pt-6">
                             <div className="flex items-center gap-3">
                                <div className="bg-muted p-2 rounded-lg"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                                <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Email</p><p className="font-medium">{userProfile.email}</p></div>
                            </div>
                             <div className="flex items-center gap-3">
                                <div className="bg-muted p-2 rounded-lg"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                                <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Phone</p><p className="font-medium">{userProfile.phone}</p></div>
                            </div>
                             <div className="flex items-center gap-3">
                                <div className="bg-muted p-2 rounded-lg"><Home className="h-4 w-4 text-muted-foreground" /></div>
                                <div><p className="text-[10px] font-bold uppercase text-muted-foreground">TRN</p><p className="font-medium">{userProfile.trn}</p></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 shadow-md">
                        <CardHeader className="bg-primary/5 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-primary" /> Account Balance Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="text-center p-6 bg-muted/20 rounded-2xl border-2 border-dashed">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Balance</p>
                                <p className="text-4xl font-black italic tracking-tighter text-primary">JMD ${ (userProfile.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }</p>
                            </div>
                            <AdjustBalanceDialog userId={userProfile.id} userName={userProfile.fullName} currentBalance={userProfile.walletBalance || 0} />
                        </CardContent>
                    </Card>

                    <Card className={cn("border-2", adminRoleDoc ? "border-primary/40 bg-primary/5" : "border-dashed opacity-80")}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" /> Administrative Access
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-[10px] font-medium leading-relaxed uppercase tracking-tight opacity-60">
                                {adminRoleDoc 
                                    ? "This account has full access to the Admin Command Center including finance and user management." 
                                    : "Granting administrative access allows this user to manage manifests, users, and financial records."}
                            </p>
                            <Button 
                                onClick={toggleAdminStatus} 
                                disabled={isUpdatingRole || isMasterAdmin} 
                                variant={adminRoleDoc ? "destructive" : "default"}
                                className="w-full font-black uppercase italic text-[10px] h-11 shadow-lg"
                            >
                                {isUpdatingRole ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : (adminRoleDoc ? <ShieldAlert className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />)}
                                {isMasterAdmin ? "Master Admin Locked" : (adminRoleDoc ? "Revoke Admin Privileges" : "Authorize Administrator")}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-muted/10">
                            <CardTitle className="text-sm font-bold uppercase opacity-60">Security & Maintenance</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-2">
                            <ResetPasswordDialog userId={userProfile.id} userName={userProfile.fullName} />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 font-bold" disabled={isMasterAdmin}>
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Purge Customer Record
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter italic text-center">Initiate Irreversible Purge?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-[10px] font-bold uppercase tracking-widest text-center">
                                            This will delete <strong>{userProfile.fullName}</strong> from Authentication and all Registry tables. All history will be lost.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="font-bold uppercase">Abort</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase h-12 shadow-lg">Authorize Purge</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card className="shadow-lg border-none rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-widest italic">Shipping History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/20">
                                    <TableRow>
                                    <TableHead className="pl-6">Tracking #</TableHead>
                                    <TableHead>Contents</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userShipments && userShipments.length > 0 ? (
                                        userShipments.map((shipment) => (
                                        <TableRow key={shipment.id} className="h-16">
                                            <TableCell className="pl-6 font-mono font-black text-primary uppercase text-sm tracking-tighter">{shipment.trackingNumber}</TableCell>
                                            <TableCell className="text-xs uppercase font-medium opacity-70">{shipment.contents}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(shipment.status)} className="font-black italic uppercase text-[9px] border-2">{shipment.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-black italic tracking-tighter">
                                                {shipment.cost ? `JMD $${shipment.cost.toFixed(2)}` : 'TBD'}
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-48 italic text-muted-foreground opacity-30">No worldwide transits detected for this identity.</TableCell>
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
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const { toast } = useToast();
    const auth = useAuth();

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            toast({ title: "Secure Key Required", description: "Password must be at least 6 characters.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Validation Mismatch", description: "Passwords do not match.", variant: "destructive" });
            return;
        }

        setIsResetting(true);
        try {
            const idToken = await auth?.currentUser?.getIdToken(true);
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId, newPassword }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Reset protocol failed.");

            toast({ title: "Identity Secured", description: `New secure key active for ${userName}.` });
            setOpen(false);
        } catch (error: any) {
            toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Authorize New Credentials</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-center">Security protocol for {userName}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">New Secure Key</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-12 border-2" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase opacity-60">Confirm Key</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-12 border-2" /></div>
                </div>
                <DialogFooter>
                    <Button onClick={handleResetPassword} disabled={isResetting} className="w-full h-14 font-black uppercase italic shadow-xl">{isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize Reset"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AdjustBalanceDialog({ userId, userName, currentBalance }: { userId: string, userName: string, currentBalance: number }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(currentBalance.toString());
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const handleAdjustBalance = async () => {
        setIsUpdating(true);
        try {
            const newBalance = parseFloat(amount);
            if (isNaN(newBalance)) throw new Error("Invalid amount.");
            await updateDoc(doc(firestore!, 'users', userId), { walletBalance: newBalance, balanceUpdatedAt: serverTimestamp() });
            toast({ title: "Credit Adjusted", description: `New balance for ${userName}: JMD $${newBalance.toLocaleString()}` });
            setOpen(false);
        } catch (error: any) {
            toast({ title: "Adjustment Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full font-bold border-2"><PlusCircle className="mr-2 h-4 w-4 text-primary" /> Adjust Account Balance</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter text-2xl text-center">Adjust Account Balance</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-center">Modify available credit for {userName}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Current Balance</p>
                        <p className="text-2xl font-black italic tracking-tighter">JMD ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase opacity-60">Set New Balance (JMD $)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs opacity-40">JMD $</span>
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-16 h-14 text-2xl font-black border-2" />
                        </div>
                    </div>
                </div>
                <DialogFooter><Button onClick={handleAdjustBalance} disabled={isUpdating} className="w-full h-14 font-black uppercase italic shadow-xl">{isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize Adjustment"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
}