
'use client';

import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, query, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile, Shipment, DropoffAddress, PickupPerson } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail, Phone, Home, Trash2, Package, KeyRound, Wallet, DollarSign, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const getStatusVariant = (status: Shipment['status']) => {
  switch (status) {
    case 'In Transit': return 'default';
    case 'Customs': return 'secondary';
    case 'Delivered': return 'outline';
    case 'Pending': return 'destructive';
    case 'Processed': return 'secondary';
    default: return 'default';
  }
};


function ResetPasswordDialog({ userId, userName }: { userId: string, userName: string }) {
    const [open, setOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const { toast } = useToast();
    const auth = useAuth();

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Passwords Do Not Match", description: "Please ensure both passwords are the same.", variant: "destructive" });
            return;
        }

        setIsResetting(true);

        try {
            const idToken = await auth.currentUser?.getIdToken(true);
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId, newPassword }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Failed to reset password.");
            }

            toast({ title: "Password Reset Successfully", description: `The password for ${userName} has been changed.` });
            setOpen(false);
            setNewPassword('');
            setConfirmPassword('');

        } catch (error: any) {
            toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 font-bold">
                    <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reset Password for {userName}</DialogTitle>
                    <DialogDescription>
                        This action is permanent. Enter a new, strong password for the user.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleResetPassword} disabled={isResetting}>
                        {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm Reset
                    </Button>
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
            if (isNaN(newBalance)) throw new Error("Invalid amount entered.");

            await updateDoc(doc(firestore, 'users', userId), {
                walletBalance: newBalance,
                balanceUpdatedAt: serverTimestamp()
            });

            toast({ title: "Balance Adjusted", description: `New balance for ${userName}: JMD $${newBalance.toLocaleString()}` });
            setOpen(false);
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full font-bold border-2">
                    <PlusCircle className="mr-2 h-4 w-4 text-primary" /> Adjust Wallet Balance
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter">Adjust Wallet Balance</DialogTitle>
                    <DialogDescription>Modify the current credit for {userName}.</DialogDescription>
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
                            <Input 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                className="pl-16 h-12 text-lg font-black border-2" 
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAdjustBalance} disabled={isUpdating} className="h-11 px-8 font-black uppercase tracking-tight">
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize Adjustment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function UserDetailsPage() {
    const params = useParams();
    const userId = params.userId as string;
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const shipmentsQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'shipments'), orderBy('shippingDate', 'desc'));
    }, [firestore, userId]);
    const { data: userShipments, isLoading: isShipmentsLoading } = useCollection<Shipment>(shipmentsQuery);

    const isLoading = isProfileLoading || isShipmentsLoading;
    
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!userProfile) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">User Not Found</h1>
                <p className="text-muted-foreground">Could not find a user with the specified ID.</p>
                 <Button variant="outline" asChild className="mt-4">
                    <Link href="/admin/users">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                    </Link>
                </Button>
            </div>
        );
    }

    const pickupPersonnel = userProfile.pickupPersonnel || [];
    const dropoffAddresses = userProfile.dropoffAddresses || [];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
                    <p className="text-muted-foreground">
                       Viewing account for {userProfile.fullName}.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/users">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Users
                    </Link>
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
                            <CardTitle className="text-2xl pt-4 font-black italic uppercase tracking-tighter">{userProfile.fullName}</CardTitle>
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
                                <Wallet className="h-4 w-4 text-primary" /> Wallet Management
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="text-center p-6 bg-muted/20 rounded-2xl border-2 border-dashed">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Available Credit</p>
                                <p className="text-4xl font-black italic tracking-tighter text-primary">JMD ${ (userProfile.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) }</p>
                            </div>
                            <AdjustBalanceDialog userId={userProfile.id} userName={userProfile.fullName} currentBalance={userProfile.walletBalance || 0} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="bg-muted/10">
                            <CardTitle className="text-sm font-bold uppercase opacity-60">Security & Maintenance</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-2">
                            <ResetPasswordDialog userId={userProfile.id} userName={userProfile.fullName} />
                            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-muted font-bold" disabled>
                                <Trash2 className="mr-2 h-4 w-4" /> Deactivate Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Shipments</CardTitle>
                            <CardDescription>A list of this user's recent packages.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Tracking #</TableHead>
                                    <TableHead>Contents</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userShipments && userShipments.length > 0 ? (
                                        userShipments.map((shipment) => (
                                        <TableRow key={shipment.id}>
                                            <TableCell className="font-mono font-bold text-primary">{shipment.trackingNumber}</TableCell>
                                            <TableCell className="text-sm">{shipment.contents}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(shipment.status)}>{shipment.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-black italic tracking-tighter">
                                                {shipment.cost ? `JMD $${shipment.cost.toFixed(2)}` : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 italic text-muted-foreground">This user has no shipments.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Drop-off Addresses (Jamaica)</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-3">
                             {dropoffAddresses.length === 0 ? (
                                <div className="text-center text-muted-foreground p-4">
                                    <p>No drop-off addresses added yet.</p>
                                </div>
                             ) : (
                                 dropoffAddresses.map(addr => (
                                    <div key={addr.id} className="flex items-center justify-between p-3 border rounded-md">
                                        <div className="flex items-center gap-4">
                                            <Home className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-semibold">{addr.name}</p>
                                                <p className="text-sm text-muted-foreground">{addr.address}, {addr.parish}</p>
                                            </div>
                                        </div>
                                    </div>
                                 ))
                             )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Authorized Pickup Personnel</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>ID Number</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pickupPersonnel.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24 italic text-muted-foreground">No pickup personnel added.</TableCell>
                                        </TableRow>
                                    ) : (
                                        pickupPersonnel.map(person => (
                                            <TableRow key={person.id}>
                                                <TableCell className="font-medium">{person.name}</TableCell>
                                                <TableCell>{person.idNumber}</TableCell>
                                            </TableRow>
                                        ))
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
