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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, serverTimestamp, doc, setDoc, getCountFromServer, writeBatch } from 'firebase/firestore';

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
  const [newUser, setNewUser] = useState({ name: '', email: '' });
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
    if(!newUser.name || !newUser.email) return;
    setIsSubmitting(true);
    try {
        const usersCollection = collection(firestore, "users");
        const snapshot = await getCountFromServer(usersCollection);
        const count = snapshot.data().count;
        const mailbox = `FSTD${101 + count}`;
        const newRef = doc(usersCollection);
        
        await setDoc(newRef, {
            id: newRef.id,
            fullName: newUser.name,
            email: newUser.email,
            phone: 'N/A',
            trn: 'N/A',
            mailboxNumber: mailbox,
            address: {
                address1: '4350 NE 5th Terrace Bay #3',
                address2: `${mailbox}-FSTD`,
                city: 'Oakland Park',
                state: 'Florida',
                zip: '33334',
            },
            createdAt: serverTimestamp(),
            pickupPersonnel: [],
            dropoffAddresses: [],
        });

        toast({ title: 'User Created', description: `Assigned Mailbox: ${mailbox}` });
        setOpenAddUser(false);
        setNewUser({ name: '', email: '' });
    } catch (e) {
        toast({ title: 'Error', description: 'Permission denied or network failure.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage accounts and generate mailing addresses.</p>
        </div>
        <div className="flex gap-2">
            <ImportCSVDialog />
            <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add User</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New User Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} placeholder="Jane Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="jane@example.com" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddUser} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
              <CardTitle>Registered Users</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Mailbox #</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin inline mr-2" />Loading...</TableCell></TableRow>
              ) : filteredUsers.map((u) => (
                <TableRow key={u.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{u.fullName}</span>
                        {adminIds.has(u.id) && <ShieldCheck className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary">{u.mailboxNumber}</TableCell>
                  <TableCell className="text-sm">{u.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${u.id}`}><Eye className="h-4 w-4 mr-2" />Profile</Link>
                    </Button>
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

function ImportCSVDialog() {
    const [isImporting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const firestore = useFirestore();

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
            
            try {
                const usersCollection = collection(firestore, "users");
                const snapshot = await getCountFromServer(usersCollection);
                let currentCount = snapshot.data().count;
                
                const batch = writeBatch(firestore);
                let count = 0;

                for (const row of dataRows) {
                    const values = row.split(',').map(v => v.trim());
                    const uData: any = {};
                    headers.forEach((header, i) => {
                        if (header === 'fullname') uData.fullName = values[i];
                        else if (header === 'email') uData.email = values[i];
                        else if (header === 'phone') uData.phone = values[i];
                        else if (header === 'trn') uData.trn = values[i];
                    });

                    if (!uData.email || !uData.fullName) continue;

                    const mailbox = `FSTD${101 + currentCount + count}`;
                    const newRef = doc(usersCollection);
                    
                    batch.set(newRef, {
                        ...uData,
                        id: newRef.id,
                        mailboxNumber: mailbox,
                        address: {
                            address1: '4350 NE 5th Terrace Bay #3',
                            address2: `${mailbox}-FSTD`,
                            city: 'Oakland Park',
                            state: 'Florida',
                            zip: '33334',
                        },
                        createdAt: serverTimestamp(),
                        pickupPersonnel: [],
                        dropoffAddresses: [],
                    });
                    count++;
                    if (count >= 450) break;
                }

                await batch.commit();
                toast({ title: 'Import Successful', description: `Successfully added ${count} users.` });
                setOpen(false);
            } catch (err) {
                toast({ title: 'Import Failed', variant: 'destructive' });
            } finally {
                setIsSubmitting(false);
            }
        };

        reader.readAsText(file);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> Import CSV</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer User Data</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to bulk-import users from your previous system.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-sm space-y-3">
                    <p className="font-bold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Required CSV Format:</p>
                    <code className="block p-2 bg-black text-white rounded text-[10px]">
                        fullName, email, phone, trn
                    </code>
                    <p className="text-xs text-muted-foreground italic">
                        Note: Mailing addresses and mailbox numbers will be generated automatically.
                    </p>
                </div>
                <div className="py-4">
                    <Input 
                        type="file" 
                        accept=".csv" 
                        ref={fileInputRef} 
                        onChange={handleImport} 
                        disabled={isImporting}
                    />
                </div>
                <DialogFooter>
                    {isImporting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}