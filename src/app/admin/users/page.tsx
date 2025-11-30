
'use client';

import { useState, useMemo } from 'react';
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
import { PlusCircle, MoreHorizontal, Copy, ArrowLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, serverTimestamp, doc, setDoc, getCountFromServer } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const usersQuery = useMemoFirebase(() => 
    !user || !firestore ? null : query(collection(firestore, 'users')), 
    [firestore, user]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '' });

  const loading = isLoadingUsers || isUserLoading;

  const handleAddUser = async () => {
    if(!newUser.name || !newUser.email) {
        toast({
            title: 'Missing Fields',
            description: 'Please enter a name and email for the new user.',
            variant: 'destructive',
        });
        return;
    }

    setIsSubmitting(true);
    
    // This is a simplified user creation flow for admins.
    // In a full production app, you'd likely create the user via Firebase Auth Admin SDK
    // and then create their profile document. Here we just create the document.
    
    const usersCollection = collection(firestore, "users");
    const snapshot = await getCountFromServer(usersCollection);
    const userCount = snapshot.data().count;
    const nextMailboxNumber = `FSTD${101 + userCount}`;
    
    const userId = `manual-${Date.now()}`;
    const userDocRef = doc(firestore, 'users', userId);

    const userToAdd: UserProfile = {
        id: userId,
        fullName: newUser.name,
        email: newUser.email,
        phone: 'N/A',
        trn: 'N/A',
        mailboxNumber: nextMailboxNumber,
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: `${nextMailboxNumber} -FSTD`,
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
        createdAt: serverTimestamp(),
    };

    setDoc(userDocRef, userToAdd, { merge: true })
        .then(() => {
            toast({
                title: 'User Added',
                description: `${newUser.name} has been added with mailbox number: ${nextMailboxNumber}`,
            });
            setOpen(false);
            setNewUser({ name: '', email: '' });
        })
        .catch(error => {
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'write',
                requestResourceData: userToAdd,
                })
            )
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };
  
  const formatAddress = (address: UserProfile['address']) => {
    return `${address.address1}, ${address.address2}, ${address.city}, ${address.state} ${address.zip}`;
  };

  const copyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({
        title: 'Copied to Clipboard',
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            View and manage user addresses.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                    Manually create a new user profile and generate their US address.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Name
                    </Label>
                    <Input id="name" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                    Email
                    </Label>
                    <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="col-span-3" />
                </div>
                </div>
                <DialogFooter>
                <Button type="submit" onClick={handleAddUser} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add User"}
                </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            A list of all users and their assigned addresses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mailbox #</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                         <div className="flex items-center gap-2">
                            <span>{user.mailboxNumber}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(user.mailboxNumber)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span className="truncate max-w-xs">{formatAddress(user.address)}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(formatAddress(user.address))}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
