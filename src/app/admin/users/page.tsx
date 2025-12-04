
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Copy, ArrowLeft, Loader2, Eye, Receipt, Download, Search, ShieldCheck } from 'lucide-react';
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
import type { UserProfile, Invoice } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, serverTimestamp, doc, setDoc, getCountFromServer, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { CreateInvoiceDialog } from '@/components/create-invoice-dialog';


function InvoiceViewDialog({ invoice, open, onOpenChange }: { invoice: Invoice | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    
    if (!invoice) return null;

    const handlePrintInvoice = () => {
        const iframe = document.getElementById('invoice-iframe-users') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } else {
            toast({ title: 'Could not print invoice', description: 'There was an issue finding the invoice content to print.', variant: 'destructive'});
        }
    };
    
    const isPrintable = invoice.invoiceUrl && invoice.invoiceUrl.startsWith('<!DOCTYPE html>');
    
    const displayDate = invoice.date && typeof (invoice.date as any).toDate === 'function' 
        ? new Date((invoice.date as any).toDate()).toLocaleDateString()
        : (invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Invoice {invoice.invoiceId}</DialogTitle>
                    <DialogDescription>Invoice for {invoice.customerName} dated {displayDate}.</DialogDescription>
                </DialogHeader>
                 <div className="relative h-[600px] overflow-hidden rounded-md border">
                    <iframe 
                        id="invoice-iframe-users"
                        srcDoc={invoice.invoiceUrl}
                        title={`Invoice ${invoice.invoiceId}`}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handlePrintInvoice} disabled={!isPrintable}><Download className="mr-2 h-4 w-4" /> Print to PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function UsersPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  
  const adminRolesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'roles_admin'));
  }, [firestore, user]);
  const { data: adminRoles, isLoading: isLoadingAdmins } = useCollection<{isAdmin: boolean}>(adminRolesQuery);

  const [openAddUser, setOpenAddUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedUserForInvoice, setSelectedUserForInvoice] = useState<UserProfile | null>(null);

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [isViewInvoiceOpen, setIsViewInvoiceOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const adminIds = useMemo(() => new Set(adminRoles?.map(role => role.id)), [adminRoles]);

  const loading = isLoadingUsers || isUserLoading || isLoadingAdmins;
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;

    const lowercasedTerm = searchTerm.toLowerCase();
    return users.filter(user => 
        user.fullName.toLowerCase().includes(lowercasedTerm) ||
        user.email.toLowerCase().includes(lowercasedTerm) ||
        (user.mailboxNumber && user.mailboxNumber.toLowerCase().includes(lowercasedTerm)) ||
        (user.trn && user.trn.includes(lowercasedTerm))
    );
  }, [users, searchTerm]);

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
    
    try {
        const usersCollection = collection(firestore, "users");
        
        // This is safe because only authenticated admins can trigger this.
        const snapshot = await getCountFromServer(usersCollection);
        const userCount = snapshot.data().count;
        const nextMailboxNumber = `FSTD${101 + userCount}`;
        
        // Admins can create users with any ID, so we let Firestore auto-generate one.
        const newDocRef = doc(usersCollection);
        
        const userToAdd = {
            id: newDocRef.id, // Use the auto-generated ID
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

        await setDoc(newDocRef, userToAdd);

        toast({
            title: 'User Added',
            description: `${newUser.name} has been added with mailbox number: ${nextMailboxNumber}`,
        });
        setOpenAddUser(false);
        setNewUser({ name: '', email: '' });
    } catch (error: any) {
        console.error("Error adding user:", error);
         errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                path: 'users',
                operation: 'create',
                requestResourceData: { name: newUser.name, email: newUser.email },
                })
            )
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleMakeAdmin = async (userToPromote: UserProfile) => {
    const adminRoleRef = doc(firestore, 'roles_admin', userToPromote.id);
    
    try {
        await setDoc(adminRoleRef, { isAdmin: true, createdAt: serverTimestamp() });
        toast({
            title: 'Success!',
            description: `${userToPromote.fullName} has been promoted to an admin.`
        });
    } catch (error) {
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: adminRoleRef.path,
                operation: 'create',
                requestResourceData: { isAdmin: true },
            })
        )
    }
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

  const openInvoiceDialog = (user: UserProfile) => {
    setSelectedUserForInvoice(user);
    setIsInvoiceDialogOpen(true);
  }

  const handleInvoiceCreated = (invoice: Invoice) => {
    // A new invoice was created by the dialog, close the creation dialog...
    setIsInvoiceDialogOpen(false);
    setSelectedUserForInvoice(null);
    // ...and immediately open the view dialog for the new invoice.
    setViewInvoice(invoice);
    setIsViewInvoiceOpen(true);
  }

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
            <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
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
           <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, mailbox..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mailbox #</TableHead>
                <TableHead>TRN</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        {user.fullName}
                        {adminIds.has(user.id) && <ShieldCheck className="h-4 w-4 text-primary" title="Admin" />}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                         <div className="flex items-center gap-2">
                            <span>{user.mailboxNumber}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(user.mailboxNumber)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                    <TableCell>{user.trn}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="outline" size="sm" asChild>
                         <Link href={`/admin/users/${user.id}`}>
                           <Eye className="mr-2 h-4 w-4" /> View
                         </Link>
                       </Button>
                       <Button variant="secondary" size="sm" onClick={() => openInvoiceDialog(user)}>
                          <Receipt className="mr-2 h-4 w-4" /> Create Invoice
                       </Button>
                        {!adminIds.has(user.id) && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <ShieldCheck className="mr-2 h-4 w-4" /> Make Admin
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will grant full administrator privileges to {user.fullName}. This cannot be easily undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleMakeAdmin(user)}>Yes, promote to admin</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        {searchTerm ? 'No users match your search.' : 'No users found.'}
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        {selectedUserForInvoice && (
         <CreateInvoiceDialog 
            open={isInvoiceDialogOpen}
            onOpenChange={setIsInvoiceDialogOpen}
            users={users || []}
            preselectedUser={selectedUserForInvoice}
            onInvoiceCreated={handleInvoiceCreated}
        />
      )}

      {viewInvoice && (
        <InvoiceViewDialog 
            invoice={viewInvoice}
            open={isViewInvoiceOpen}
            onOpenChange={setIsViewInvoiceOpen}
        />
      )}
    </div>
  );
}
