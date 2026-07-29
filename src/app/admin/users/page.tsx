
'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Eye, Search, ShieldCheck, FileSpreadsheet, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('fullName', 'asc'));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  
  const adminRolesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'admin_roles'));
  }, [firestore]);
  const { data: adminRoles } = useCollection<{isAdmin: boolean}>(adminRolesQuery);

  const [openAddUser, setOpenAddUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', phone: '', trn: '', mailboxNumber: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const adminIds = useMemo(() => new Set(adminRoles?.map(role => role.id)), [adminRoles]);

  const combinedUsers = useMemo(() => {
      const local = (users || []).map(u => ({ ...u, source: 'firebase' as const }));
      if (!searchTerm) return local;
      const lower = searchTerm.toLowerCase();
      return local.filter(u => 
          (u.fullName || '').toLowerCase().includes(lower) ||
          (u.email || '').toLowerCase().includes(lower) ||
          (u.mailboxNumber || '').toLowerCase().includes(lower)
      );
  }, [users, searchTerm]);

  const handleAddUser = async () => {
    if(!newUser.firstName || !newUser.lastName || !newUser.email) {
        toast({ title: "Missing Information", description: "Name and email are required.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        if (!currentUser) throw new Error("Authentication session required.");
        const idToken = await currentUser.getIdToken(true);
        
        const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(newUser)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Creation failed');

        toast({ title: 'User Authorized', description: `Assigned Mailbox: ${data.mailbox}` });
        setOpenAddUser(false);
        setNewUser({ firstName: '', lastName: '', email: '', phone: '', trn: '', mailboxNumber: '' });
    } catch (e: any) {
        toast({ title: 'Account Creation Failed', description: e.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
      setIsDeleting(userId);
      try {
          if (!currentUser) throw new Error("Session lost.");
          const idToken = await currentUser.getIdToken(true);

          const res = await fetch('/api/admin/delete-user', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({ userId })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Deletion failed');

          toast({ title: "User Removed", description: "Account and profile purged from system." });
      } catch (e: any) {
          toast({ title: "Deletion Failed", description: e.message, variant: "destructive" });
      } finally {
          setIsDeleting(null);
      }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">System Client Registry</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Manual account management & legacy user onboarding</p>
        </div>
        <div className="flex gap-2">
            <ImportCSVDialog />
            <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
                <DialogTrigger asChild>
                    <Button className="font-black uppercase italic tracking-tight shadow-lg"><PlusCircle className="mr-2 h-4 w-4" /> Add User Account</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Manual Onboarding</DialogTitle>
                        <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">Establish new global logistics identity</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">First Name</Label>
                            <Input value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} placeholder="Jane" className="h-11 border-2" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Last Name</Label>
                            <Input value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} placeholder="Doe" className="h-11 border-2" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Email Address</Label>
                            <Input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="jane@example.com" className="h-11 border-2" />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Existing Mailbox # (Optional)</Label>
                            <Input 
                                value={newUser.mailboxNumber} 
                                onChange={(e) => setNewUser({...newUser, mailboxNumber: e.target.value})} 
                                placeholder="e.g. FSTD999" 
                                className="h-11 border-2 font-mono" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Phone</Label>
                            <Input value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} placeholder="876..." className="h-11 border-2" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase opacity-60">Tax ID (TRN)</Label>
                            <Input value={newUser.trn} onChange={(e) => setNewUser({...newUser, trn: e.target.value})} placeholder="9 digits" maxLength={9} className="h-11 border-2" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddUser} disabled={isSubmitting} className="w-full h-14 text-lg font-black uppercase italic shadow-xl">
                            {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : "Authorize Entry"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] italic">Authorized Personnel Ledger</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search registry..." className="pl-9 h-11 border-2 font-bold text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-12">
                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Global Mailbox</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Secure Contact</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                  <TableRow><TableCell colSpan={4} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin inline-block text-primary" /></TableCell></TableRow>
              ) : combinedUsers.map((u) => (
                <TableRow key={u.id} className="group hover:bg-muted/30 transition-colors h-16">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-primary uppercase text-sm">{u.fullName}</span>
                        {adminIds.has(u.id) && <ShieldCheck className="h-4 w-4 text-primary fill-primary/10" />}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{u.email}</div>
                  </TableCell>
                  <TableCell className="font-mono font-black text-lg tracking-tighter text-primary">{u.mailboxNumber}</TableCell>
                  <TableCell className="text-xs font-medium uppercase opacity-70">{u.phone}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild className="h-9 font-black border-2 uppercase tracking-tighter text-[10px] px-4">
                            <Link href={`/admin/users/${u.id}`}><Eye className="h-4 w-4 mr-2" />Profile</Link>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 text-destructive hover:text-destructive hover:bg-destructive/5 font-black uppercase text-[10px] px-2">
                                    {isDeleting === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Authorize Deletion Protocol?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Permanently removing <strong>{u.fullName}</strong> will purge their identity from Authentication and the Master Registry. This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Abort</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm Purge</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {combinedUsers.length === 0 && !isLoadingUsers && (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No worldwide records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ImportCSVDialog() {
    const [isImporting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { user: currentUser } = useUser();

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSubmitting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
              setIsSubmitting(false);
              return;
            }
            
            // ROBUST HEADER NORMALIZATION
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/gi, ''));
            const dataRows = lines.slice(1);
            
            setProgress({ current: 0, total: dataRows.length });
            const idToken = await currentUser?.getIdToken(true);

            let successCount = 0;
            let failCount = 0;

            for (const row of dataRows) {
                const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const uData: any = {};
                
                headers.forEach((header, i) => {
                    if (!header || values[i] === undefined) return;
                    
                    if (header.includes('firstname')) uData.firstName = values[i];
                    else if (header.includes('lastname')) uData.lastName = values[i];
                    else if (header === 'email') uData.email = values[i];
                    else if (header === 'phone') uData.phone = values[i];
                    else if (header === 'trn') uData.trn = values[i];
                    else if (header.includes('mailbox')) uData.mailboxNumber = values[i];
                });

                if (!uData.email || !uData.firstName) {
                    failCount++;
                    setProgress(prev => ({ ...prev, current: prev.current + 1 }));
                    continue;
                }

                try {
                    const res = await fetch('/api/admin/create-user', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify(uData)
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch (err) {
                    failCount++;
                }
                
                setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            }

            toast({ title: 'Migration Complete', description: `Successfully imported ${successCount} users. Errors: ${failCount}` });
            setIsSubmitting(false);
            setOpen(false);
        };

        reader.readAsText(file);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="font-black uppercase italic border-2"><FileSpreadsheet className="mr-2 h-4 w-4" /> Transfer Data</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter">Worldwide Client Migration</DialogTitle>
                    <DialogDescription className="font-bold text-[10px] uppercase tracking-widest">Bulk-import users from external systems</DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed text-sm space-y-4">
                    <p className="font-black uppercase flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" /> Required Schema:</p>
                    <code className="block p-3 bg-zinc-950 text-green-400 rounded-lg text-[10px] font-mono leading-relaxed">
                        firstName, lastName, email, phone, trn, mailboxNumber
                    </code>
                </div>
                <div className="py-6">
                    {isImporting ? (
                        <div className="space-y-4 text-center">
                            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                            <p className="font-black italic uppercase animate-pulse">Synchronizing: {progress.current} / {progress.total}</p>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                            </div>
                        </div>
                    ) : (
                        <Input 
                            type="file" 
                            accept=".csv" 
                            ref={fileInputRef} 
                            onChange={handleImport} 
                            className="h-12 border-2 file:bg-primary file:text-primary-foreground file:font-bold file:px-4 file:h-full file:-ml-3 file:mr-4 file:cursor-pointer"
                        />
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost" disabled={isImporting} className="font-bold uppercase">Cancel</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
