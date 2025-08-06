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
import { PlusCircle, MoreHorizontal, Copy } from 'lucide-react';
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

type User = {
  id: number;
  name: string;
  email: string;
  address: string;
};

const initialUsers: User[] = [
    { id: 1, name: 'John Doe', email: 'john.d@example.com', address: '123 Main St, Orlando, FL 32801, Mailbox #101' },
    { id: 2, name: 'Jane Smith', email: 'jane.s@example.com', address: '123 Main St, Orlando, FL 32801, Mailbox #102' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const [baseAddress, setBaseAddress] = useState('123 Main St, Orlando, FL 32801');
  const { toast } = useToast();

  const handleAddUser = () => {
    if(!newUser.name || !newUser.email) {
        toast({
            title: 'Missing Fields',
            description: 'Please enter a name and email for the new user.',
            variant: 'destructive',
        });
        return;
    }
    const nextMailboxNumber = users.length > 0 ? Math.max(...users.map(u => parseInt(u.address.split('#')[1] || '100'))) + 1 : 101;
    const newAddress = `${baseAddress}, Mailbox #${nextMailboxNumber}`;
    const userToAdd: User = {
        id: users.length + 1,
        ...newUser,
        address: newAddress,
    };
    setUsers([...users, userToAdd]);
    setOpen(false);
    setNewUser({ name: '', email: '' });
    toast({
        title: 'User Added',
        description: `${newUser.name} has been added with address: ${newAddress}`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
      
      <Card>
        <CardHeader>
          <CardTitle>Base Address</CardTitle>
          <CardDescription>This is the base address for all new users.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-2">
                 <Input value={baseAddress} onChange={(e) => setBaseAddress(e.target.value)} />
                 <Button>Save</Button>
            </div>
        </CardContent>
      </Card>

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
                <TableHead>Address</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <span>{user.address}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(user.address)}>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
