
'use client';

import { useState } from 'react';
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
import { users as allUsers, type UserProfile } from '@/lib/mock-data';

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>(allUsers);
  const [loading, setLoading] = useState(false);
  
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const { toast } = useToast();
  

  const handleAddUser = async () => {
    if(!newUser.name || !newUser.email) {
        toast({
            title: 'Missing Fields',
            description: 'Please enter a name and email for the new user.',
            variant: 'destructive',
        });
        return;
    }
    const lastMailboxNum = users && users.length > 0 ? parseInt(users[users.length - 1].mailboxNumber.replace('FSTD', '')) : 100;
    const nextMailboxNumber = `FSTD${lastMailboxNum + 1}`;
    
    const userToAdd: UserProfile = {
        id: `user-${Date.now()}`,
        fullName: newUser.name,
        email: newUser.email,
        phone: '123-456-7890', // placeholder
        trn: '123456789', // placeholder
        address: {
            address1: '4350 NE 5th Terrace Bay #3',
            address2: `${nextMailboxNumber} -FSTD`,
            city: 'Oakland Park',
            state: 'Florida',
            zip: '33334',
        },
        mailboxNumber: nextMailboxNumber,
        createdAt: new Date().toISOString(),
    };
    
    setUsers([...users, userToAdd]);

    setOpen(false);
    setNewUser({ name: '', email: '' });
    toast({
        title: 'User Added',
        description: `${newUser.name} has been added with mailbox number: ${nextMailboxNumber}`,
    });
  };
  
  const formatAddress = (address: UserProfile['address']) => {
    return `${address.address1}, ${address.address2}, ${address.city}, ${address.state} ${address.zip}`;
  };

  const copyToClipboard = (address: UserProfile['address']) => {
    const addressString = `Address 1: ${address.address1}\nAddress 2: ${address.address2}\nCity: ${address.city}\nState/Province: ${address.state}\nZip/Postal Code: ${address.zip}`;
    navigator.clipboard.writeText(addressString);
    toast({
        title: 'Copied to Clipboard',
        description: 'Address has been copied.',
    });
  };

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
                    Enter the details for the new user to generate an address.
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
                <Button type="submit" onClick={handleAddUser}>Add User</Button>
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
              {loading ? (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                </TableRow>
              ) : !users || users.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No users found.</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.mailboxNumber}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <span>{formatAddress(user.address)}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(user.address)}>
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
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
