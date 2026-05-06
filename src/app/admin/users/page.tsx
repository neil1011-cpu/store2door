
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
import { PlusCircle, Loader2, Eye, Search, ShieldCheck, FileSpreadsheet, AlertCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, serverTimestamp, doc, setDoc, getCountFromServer } from 'firebase/firestore';

export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  
  const adminRolesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'admin_roles'));
  }, [firestore]);
  const { data: adminRoles } = useCollection<{isAdmin: boolean}>(adminRolesQuery);

  const [openAddUser, setOpenAddUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const adminIds = useMemo(() => new Set(adminRoles?.map(role => role.id)), [adminRoles]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(u => 
        u.fullName.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower) ||
        u.mailboxNumber?.toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  const handleAddUser = async () => {
    if(!newUser.firstName || !newUser.lastName || !newUser.email) return;
    setIsSubmitting(true);
    try {
        const auth = doc(firestore, 'metadata', 'none').firestore.app; // Stub to get auth instance if needed, but we use API
        // For individual adds, we still use the API to ensure Auth account is created
        const idToken = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
        
        const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                defaultPassword: 'Welcome' + Math.floor(Math.random() * 1000),
                phone: 'N/A',
                trn: 'N/A'
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        toast({ title: 'User Created', description: `Assigned Mailbox: ${data.mailbox}` });
        setOpenAddUser(false);
        setNewUser({ firstName: '', lastName: '', email: '' });
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary italic uppercase">System Users</h1>
          <p className="text-muted-foreground">Manage accounts and high-speed data transfers.</p>
        </div>
        <div className="flex gap-2">
            <ImportCSVDialog />
            <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
                <DialogTrigger asChild>
                    <Button className="font-bold"><PlusCircle className="mr-2 h-4 w-4" /> Add User</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Account Entry</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} placeholder="Jane" />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} placeholder="Doe" />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Email Address</Label>
                            <Input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="jane@example.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddUser} disabled={isSubmitting} className="w-full h-12 text-lg font-black uppercase italic">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authorize New Account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="uppercase tracking-tighter italic">Authorized Personnel & Clients</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search worldwide database..." className="pl-9 h-11 border-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Identity</TableHead>
                <TableHead>Global Mailbox</TableHead>
                <TableHead>Secure Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                  <TableRow><TableCell colSpan={4} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin inline-block" /></TableCell></TableRow>
              ) : filteredUsers.map((u) => (
                <TableRow key={u.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-primary uppercase">{u.fullName}</span>
                        {adminIds.has(u.id) && <ShieldCheck className="h-4 w-4 text-primary fill-primary/10" />}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{u.email}</div>
                  </TableCell>
                  <TableCell className="font-mono font-black text-lg tracking-tighter text-primary">{u.mailboxNumber}</TableCell>
                  <TableCell className="text-sm font-medium">{u.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild className="h-8 font-bold border-2">
                        <Link href={`/admin/users/${u.id}`}><Eye className="h-4 w-4 mr-2" />View profile</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && !isLoadingUsers && (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No results found in current system.</TableCell></TableRow>
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
    const auth = (await import('firebase/auth')).getAuth();

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSubmitting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const dataRows = lines.slice(1);
            
            setProgress({ current: 0, total: dataRows.length });
            const idToken = await auth.currentUser?.getIdToken();

            let successCount = 0;
            let failCount = 0;

            for (const row of dataRows) {
                const values = row.split(',').map(v => v.trim());
                const uData: any = {};
                headers.forEach((header, i) => {
                    if (header.includes('firstname')) uData.firstName = values[i];
                    else if (header.includes('lastname')) uData.lastName = values[i];
                    else if (header === 'email') uData.email = values[i];
                    else if (header === 'phone') uData.phone = values[i];
                    else if (header === 'trn') uData.trn = values[i];
                    else if (header === 'mailboxnumber') uData.mailboxNumber = values[i];
                });

                if (!uData.email || !uData.firstName) continue;

                try {
                    const res = await fetch('/api/admin/create-user', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            ...uData,
                            defaultPassword: 'User@' + Math.floor(1000 + Math.random() * 9000),
                        })
                    });
                    if (res.ok) successCount++;
                    else failCount++;
                } catch (err) {
                    failCount++;
                }
                
                setProgress(prev => ({ ...prev, current: prev.current + 1 }));
            }

            toast({ 
                title: 'Data Transfer Complete', 
                description: `Successfully added ${successCount} users. Errors: ${failCount}` 
            });
            setIsSubmitting(false);
            setOpen(false);
        };

        reader.readAsText(file);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="font-bold border-2"><FileSpreadsheet className="mr-2 h-4 w-4" /> Transfer Data</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="uppercase italic tracking-tighter">Worldwide Client Migration</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk-import users from your previous system.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed text-sm space-y-4">
                    <p className="font-black uppercase flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" /> CSV Schema Template:</p>
                    <code className="block p-3 bg-zinc-950 text-green-400 rounded-lg text-[10px] font-mono leading-relaxed">
                        firstName, lastName, email, phone, trn, mailboxNumber
                    </code>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                        Note: Default passwords will be generated and users will be prompted to reset upon first entry.
                    </p>
                </div>
                <div className="py-6">
                    {isImporting ? (
                        <div className="space-y-4 text-center">
                            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                            <p className="font-black italic uppercase animate-pulse">Syncing Database: {progress.current} / {progress.total}</p>
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
                    <DialogClose asChild><Button variant="ghost" disabled={isImporting} className="font-bold">Cancel Migration</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
